import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { Server as SocketIOServer } from "socket.io";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth";
import teamRoutes from "./routes/teams";
import eventRoutes from "./routes/events";
import matchStatRoutes from "./routes/match-stats";
import attendanceRoutes from "./routes/attendance";
import noteRoutes from "./routes/notes";
import dashboardRoutes from "./routes/dashboard";
import tournamentRoutes from "./routes/tournaments";
import disciplineRoutes from "./routes/discipline";
import badgeRoutes from "./routes/badges";
import chatRoutes from "./routes/chat";
import analyticsRoutes from "./routes/analytics";
import { Team } from "./models/Team";
import { Player } from "./models/Player";
import { User } from "./models/User";
import { Message } from "./models/Message";
import { verifyToken } from "./middleware/auth";

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || "5000", 10);

/* ───── CORS ───── */
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* ───── Socket.IO ───── */
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.cookie
        ?.split(";")
        .find((c: string) => c.trim().startsWith("coachify_token="))
        ?.split("=")[1];

    if (!token) return next(new Error("Authentication required"));

    const decoded = await verifyToken(token);
    if (!decoded) return next(new Error("Invalid token"));

    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", async (socket) => {
  const user = (socket as any).user;
  if (!user) return socket.disconnect();

  socket.join("global");

  // Join user's team rooms
  try {
    const isCoach = user.role === "coach" || user.role === "admin";
    let teamIds: string[] = [];

    if (isCoach) {
      const teams = await Team.find({ coachId: user.userId })
        .select("_id")
        .lean();
      teamIds = teams.map((t) => t._id.toString());
    }

    const memberships = await Player.find({ userId: user.userId })
      .select("teamId")
      .lean();
    for (const m of memberships) {
      const tid = m.teamId.toString();
      if (!teamIds.includes(tid)) teamIds.push(tid);
    }

    if (user.role === "admin") {
      const allTeams = await Team.find().select("_id").lean();
      for (const t of allTeams) {
        const tid = t._id.toString();
        if (!teamIds.includes(tid)) teamIds.push(tid);
      }
    }

    for (const tid of teamIds) {
      socket.join(`team:${tid}`);
    }
  } catch (err) {
    console.error("Socket room join error:", err);
  }

  // Handle global message
  socket.on("chat:global", async (data: { content: string }) => {
    try {
      if (!data.content?.trim()) return;

      let senderTeamName: string | undefined;
      const isCoach = user.role === "coach" || user.role === "admin";

      if (isCoach && user.role !== "admin") {
        const team = await Team.findOne({ coachId: user.userId })
          .select("name")
          .lean();
        if (team) senderTeamName = team.name;
      } else if (user.role === "player") {
        const membership = await Player.findOne({ userId: user.userId })
          .select("teamId")
          .lean();
        if (membership) {
          const team = await Team.findById(membership.teamId)
            .select("name")
            .lean();
          if (team) senderTeamName = team.name;
        }
      }

      const msg = await Message.create({
        channel: "global",
        senderId: user.userId,
        senderName: user.name,
        senderRole: user.role,
        senderTeamName,
        content: data.content.trim().slice(0, 2000),
      });

      io.to("global").emit("chat:global:message", msg.toObject());
    } catch (err) {
      console.error("Global chat error:", err);
    }
  });

  // Handle team message
  socket.on(
    "chat:team",
    async (data: { teamId: string; content: string }) => {
      try {
        if (!data.content?.trim() || !data.teamId) return;

        const team = await Team.findById(data.teamId).select("name").lean();
        if (!team) return;

        const msg = await Message.create({
          channel: "team",
          teamId: data.teamId,
          senderId: user.userId,
          senderName: user.name,
          senderRole: user.role,
          senderTeamName: team.name,
          content: data.content.trim().slice(0, 2000),
        });

        io.to(`team:${data.teamId}`).emit("chat:team:message", msg.toObject());
      } catch (err) {
        console.error("Team chat error:", err);
      }
    }
  );

  socket.on("disconnect", () => {});
});

/* ───── Routes ───── */
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/match-stats", matchStatRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/discipline", disciplineRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ───── Migrate existing teams without invite codes ───── */
async function migrateTeamInviteCodes() {
  try {
    const teamsWithoutCode = await Team.find({
      $or: [
        { inviteCode: { $exists: false } },
        { inviteCode: null },
        { inviteCode: "" },
      ],
    });

    for (const team of teamsWithoutCode) {
      team.inviteCode = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()
        .slice(0, 7);
      await team.save();
      console.log(
        `Migrated invite code for team "${team.name}": ${team.inviteCode}`
      );
    }

    if (teamsWithoutCode.length > 0) {
      console.log(
        `Migrated ${teamsWithoutCode.length} teams with invite codes.`
      );
    }
  } catch (err) {
    console.warn(
      "Team invite code migration skipped:",
      (err as Error).message
    );
  }
}

/* ───── Seed admin account ───── */
async function seedAdmin() {
  try {
    const adminEmail = "admin@gmail.com";
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const hashedPassword = await bcrypt.hash("Qwerty1234", 12);
      await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: "Admin",
        role: "admin",
      });
      console.log(`Admin account created: ${adminEmail}`);
    }
  } catch (err) {
    console.warn("Admin seed skipped:", (err as Error).message);
  }
}

/* ───── Start ───── */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Coachify backend running on port ${PORT}`);
});

connectDB()
  .then(async () => {
    await migrateTeamInviteCodes();
    await seedAdmin();
  })
  .catch((err) => {
    console.warn(
      "Initial MongoDB connection failed. The server is running but DB calls will retry per-request.",
      err.message
    );
  });
