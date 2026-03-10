import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth";
import teamRoutes from "./routes/teams";
import eventRoutes from "./routes/events";
import matchStatRoutes from "./routes/match-stats";
import attendanceRoutes from "./routes/attendance";
import noteRoutes from "./routes/notes";
import dashboardRoutes from "./routes/dashboard";
import tournamentRoutes from "./routes/tournaments";
import { Team } from "./models/Team";
import { User } from "./models/User";

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

/* ───── CORS ───── */
// In production the frontend is on a different domain (Vercel).
// FRONTEND_URL can be a single URL or comma-separated list.
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

/* ───── Routes ───── */
app.use("/api/auth", authRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/match-stats", matchStatRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/tournaments", tournamentRoutes);

// Health check — useful for Railway / uptime monitors
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Coachify backend running on port ${PORT}`);
});

// Attempt initial MongoDB connection (non-blocking)
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
