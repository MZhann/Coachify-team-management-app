import { Router, Response } from "express";
import { Message } from "../models/Message";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware as any);

/* ─── GET /api/chat/global  — global message history ─── */
router.get(
  "/global",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const before = req.query.before as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const filter: any = { channel: "global" };
      if (before) filter.createdAt = { $lt: new Date(before) };

      const messages = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json(messages.reverse());
    } catch (err) {
      console.error("Chat global error:", err);
      res.status(500).json({ error: "Failed to load messages" });
    }
  }
);

/* ─── GET /api/chat/team/:teamId  — team message history ─── */
router.get(
  "/team/:teamId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { teamId } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;

      const team = await Team.findById(teamId).lean();
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      const isCoach =
        (role === "coach" || role === "admin") &&
        team.coachId.toString() === userId;
      const isPlayer = await Player.exists({ userId, teamId });
      const isAdmin = role === "admin";

      if (!isCoach && !isPlayer && !isAdmin) {
        res.status(403).json({ error: "Not a member of this team" });
        return;
      }

      const before = req.query.before as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const filter: any = { channel: "team", teamId };
      if (before) filter.createdAt = { $lt: new Date(before) };

      const messages = await Message.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json(messages.reverse());
    } catch (err) {
      console.error("Chat team error:", err);
      res.status(500).json({ error: "Failed to load messages" });
    }
  }
);

/* ─── GET /api/chat/my-teams — user's teams for chat selector ─── */
router.get(
  "/my-teams",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const isCoach = role === "coach" || role === "admin";

      let teams: any[] = [];
      if (isCoach) {
        teams = await Team.find({ coachId: userId })
          .select("name sport")
          .sort({ name: 1 })
          .lean();
      }

      const memberships = await Player.find({ userId })
        .select("teamId")
        .lean();
      const memberTeamIds = memberships.map((m) => m.teamId);

      if (memberTeamIds.length > 0) {
        const playerTeams = await Team.find({
          _id: { $in: memberTeamIds },
        })
          .select("name sport")
          .lean();

        const existingIds = new Set(teams.map((t: any) => t._id.toString()));
        for (const t of playerTeams) {
          if (!existingIds.has(t._id.toString())) {
            teams.push(t);
          }
        }
      }

      if (role === "admin") {
        const allTeams = await Team.find()
          .select("name sport")
          .sort({ name: 1 })
          .lean();
        const existingIds = new Set(teams.map((t: any) => t._id.toString()));
        for (const t of allTeams) {
          if (!existingIds.has(t._id.toString())) {
            teams.push(t);
          }
        }
      }

      res.json(teams);
    } catch (err) {
      console.error("Chat my-teams error:", err);
      res.status(500).json({ error: "Failed to load teams" });
    }
  }
);

export default router;
