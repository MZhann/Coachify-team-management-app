import { Router, Response } from "express";
import { Badge, PlayerBadge, DEFAULT_BADGES } from "../models/Badge";
import { Player } from "../models/Player";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware as any);

// GET /api/badges — list all badge definitions (auto-seed if empty)
router.get("/", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    let badges = await Badge.find().sort({ category: 1, name: 1 }).lean();
    if (badges.length === 0) {
      await Badge.insertMany(DEFAULT_BADGES);
      badges = await Badge.find().sort({ category: 1, name: 1 }).lean();
    }
    res.json(badges);
  } catch (err) {
    console.error("Badges list error:", err);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

// GET /api/badges/player/:playerId — get badges for a specific player
router.get("/player/:playerId", async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const playerBadges = await PlayerBadge.find({ playerId: _req.params.playerId })
      .populate("badgeId")
      .populate("awardedBy", "name")
      .sort({ awardedAt: -1 })
      .lean();
    res.json(playerBadges);
  } catch (err) {
    console.error("Player badges error:", err);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

// POST /api/badges/award — award a badge to a player
router.post("/award", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    if (role !== "coach" && role !== "admin") {
      res.status(403).json({ error: "Only coaches can award badges" });
      return;
    }

    const { playerId, badgeId, note } = req.body;
    if (!playerId || !badgeId) {
      res.status(400).json({ error: "playerId and badgeId are required" });
      return;
    }

    const player = await Player.findById(playerId);
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const badge = await Badge.findById(badgeId);
    if (!badge) {
      res.status(404).json({ error: "Badge not found" });
      return;
    }

    const existing = await PlayerBadge.findOne({ playerId, badgeId });
    if (existing) {
      res.status(409).json({ error: "Player already has this badge" });
      return;
    }

    const playerBadge = await PlayerBadge.create({
      playerId,
      badgeId,
      awardedBy: req.user!.userId,
      note,
    });

    const populated = await PlayerBadge.findById(playerBadge._id)
      .populate("badgeId")
      .populate("awardedBy", "name")
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error("Badge award error:", err);
    res.status(500).json({ error: "Failed to award badge" });
  }
});

export default router;
