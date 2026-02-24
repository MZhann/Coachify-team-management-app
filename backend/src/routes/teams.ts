import { Router, Response } from "express";
import crypto from "crypto";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { User } from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// All team routes require authentication
router.use(authMiddleware as any);

// GET /api/teams — returns teams for the current user (coach or player)
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    if (role === "coach" || role === "admin") {
      // Coaches see teams they created
      const teams = await Team.find({ coachId: userId })
        .sort({ createdAt: -1 })
        .lean();

      // Attach player count for each team
      const teamsWithCount = await Promise.all(
        teams.map(async (team) => {
          const playerCount = await Player.countDocuments({ teamId: team._id });
          return { ...team, playerCount };
        })
      );

      res.json(teamsWithCount);
    } else {
      // Players see teams they belong to
      const memberships = await Player.find({ userId }).lean();
      const teamIds = memberships.map((m) => m.teamId);
      const teams = await Team.find({ _id: { $in: teamIds } })
        .populate("coachId", "name email")
        .sort({ createdAt: -1 })
        .lean();

      const teamsWithCount = await Promise.all(
        teams.map(async (team) => {
          const playerCount = await Player.countDocuments({ teamId: team._id });
          return { ...team, playerCount };
        })
      );

      res.json(teamsWithCount);
    }
  } catch (err) {
    console.error("Teams list error:", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// POST /api/teams — create a new team (coach only)
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user!.role !== "coach" && req.user!.role !== "admin") {
      res.status(403).json({ error: "Only coaches can create teams" });
      return;
    }

    const { name, sport } = req.body;

    if (!name || !sport) {
      res.status(400).json({ error: "Team name and sport are required" });
      return;
    }

    const validSports = [
      "football",
      "basketball",
      "volleyball",
      "american_football",
    ];
    if (!validSports.includes(sport)) {
      res.status(400).json({
        error:
          "Invalid sport. Use: football, basketball, volleyball, american_football",
      });
      return;
    }

    const team = await Team.create({
      name,
      sport,
      coachId: req.user!.userId,
    });

    res.json(team);
  } catch (err) {
    console.error("Team create error:", err);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// GET /api/teams/:id — get team details
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("coachId", "name email")
      .lean();

    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    // Check access: coach owns or player is member
    const userId = req.user!.userId;
    const isCoach = team.coachId._id?.toString() === userId || (team.coachId as any).toString() === userId;
    const isMember = await Player.exists({ userId, teamId: team._id });

    if (!isCoach && !isMember) {
      res.status(403).json({ error: "You don't have access to this team" });
      return;
    }

    const playerCount = await Player.countDocuments({ teamId: team._id });

    res.json({ ...team, playerCount, isCoach });
  } catch (err) {
    console.error("Team detail error:", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

// GET /api/teams/:id/players — get players of a team
router.get(
  "/:id/players",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const team = await Team.findById(req.params.id).lean();
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      // Check access
      const userId = req.user!.userId;
      const isCoach = team.coachId.toString() === userId;
      const isMember = await Player.exists({ userId, teamId: team._id });

      if (!isCoach && !isMember) {
        res.status(403).json({ error: "You don't have access to this team" });
        return;
      }

      const players = await Player.find({ teamId: req.params.id })
        .populate("userId", "name email avatar")
        .sort({ joinedAt: -1 })
        .lean();

      res.json(players);
    } catch (err) {
      console.error("Team players error:", err);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  }
);

// POST /api/teams/join — join a team by invite code (player only)
router.post("/join", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      res.status(400).json({ error: "Invite code is required" });
      return;
    }

    const team = await Team.findOne({
      inviteCode: inviteCode.toUpperCase().trim(),
    }).lean();

    if (!team) {
      res.status(404).json({ error: "Invalid invite code. Team not found." });
      return;
    }

    const userId = req.user!.userId;

    // Check if already a member
    const existing = await Player.findOne({ userId, teamId: team._id });
    if (existing) {
      res.status(409).json({ error: "You are already a member of this team" });
      return;
    }

    // Check if user is the coach of this team
    if (team.coachId.toString() === userId) {
      res.status(400).json({ error: "You are the coach of this team" });
      return;
    }

    const player = await Player.create({
      userId,
      teamId: team._id,
    });

    // Update user role to player if they're still set as coach
    await User.findByIdAndUpdate(userId, { role: "player" });

    res.json({
      message: `Successfully joined team "${team.name}"`,
      team: { _id: team._id, name: team.name, sport: team.sport },
      player,
    });
  } catch (err) {
    console.error("Join team error:", err);
    res.status(500).json({ error: "Failed to join team" });
  }
});

// POST /api/teams/:id/regenerate-code — regenerate invite code (coach only)
router.post(
  "/:id/regenerate-code",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const team = await Team.findById(req.params.id);
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      if (team.coachId.toString() !== req.user!.userId) {
        res.status(403).json({ error: "Only the coach can regenerate the invite code" });
        return;
      }

      team.inviteCode = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()
        .slice(0, 7);
      await team.save();

      res.json({ inviteCode: team.inviteCode });
    } catch (err) {
      console.error("Regenerate code error:", err);
      res.status(500).json({ error: "Failed to regenerate invite code" });
    }
  }
);

// PUT /api/teams/:id/players/:playerId — update player details (coach only)
router.put(
  "/:id/players/:playerId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const team = await Team.findById(req.params.id).lean();
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      if (team.coachId.toString() !== req.user!.userId) {
        res.status(403).json({ error: "Only the coach can update players" });
        return;
      }

      const { position, jerseyNumber, status, nationality, age, height, weight, preferredFoot, stats } = req.body;
      const update: any = {};
      if (position !== undefined) update.position = position;
      if (jerseyNumber !== undefined) update.jerseyNumber = jerseyNumber;
      if (status !== undefined) update.status = status;
      if (nationality !== undefined) update.nationality = nationality;
      if (age !== undefined) update.age = age;
      if (height !== undefined) update.height = height;
      if (weight !== undefined) update.weight = weight;
      if (preferredFoot !== undefined) update.preferredFoot = preferredFoot;
      // Merge individual stat fields
      if (stats && typeof stats === "object") {
        for (const [key, value] of Object.entries(stats)) {
          if (typeof value === "number" && value >= 0 && value <= 99) {
            update[`stats.${key}`] = value;
          }
        }
      }

      const player = await Player.findOneAndUpdate(
        { _id: req.params.playerId, teamId: req.params.id },
        update,
        { new: true }
      ).populate("userId", "name email avatar");

      if (!player) {
        res.status(404).json({ error: "Player not found in this team" });
        return;
      }

      res.json(player);
    } catch (err) {
      console.error("Update player error:", err);
      res.status(500).json({ error: "Failed to update player" });
    }
  }
);

// GET /api/teams/:id/players/:playerId — get single player profile with stats
router.get(
  "/:id/players/:playerId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const team = await Team.findById(req.params.id).lean();
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      // Check access
      const userId = req.user!.userId;
      const isCoach = team.coachId.toString() === userId;
      const isMember = await Player.exists({ userId, teamId: team._id });

      if (!isCoach && !isMember) {
        res.status(403).json({ error: "You don't have access to this team" });
        return;
      }

      const player = await Player.findOne({
        _id: req.params.playerId,
        teamId: req.params.id,
      })
        .populate("userId", "name email avatar")
        .lean();

      if (!player) {
        res.status(404).json({ error: "Player not found in this team" });
        return;
      }

      res.json({ ...player, isCoach });
    } catch (err) {
      console.error("Player profile error:", err);
      res.status(500).json({ error: "Failed to fetch player profile" });
    }
  }
);

// DELETE /api/teams/:id/players/:playerId — remove player (coach only)
router.delete(
  "/:id/players/:playerId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const team = await Team.findById(req.params.id).lean();
      if (!team) {
        res.status(404).json({ error: "Team not found" });
        return;
      }

      if (team.coachId.toString() !== req.user!.userId) {
        res.status(403).json({ error: "Only the coach can remove players" });
        return;
      }

      const player = await Player.findOneAndDelete({
        _id: req.params.playerId,
        teamId: req.params.id,
      });

      if (!player) {
        res.status(404).json({ error: "Player not found in this team" });
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("Remove player error:", err);
      res.status(500).json({ error: "Failed to remove player" });
    }
  }
);

export default router;
