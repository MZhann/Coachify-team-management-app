import { Router, Response } from "express";
import { DisciplinaryRecord } from "../models/DisciplinaryRecord";
import { Player } from "../models/Player";
import { Team } from "../models/Team";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware as any);

// GET /api/discipline — list records with optional filters
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId, playerId, eventId, resolved } = req.query;
    const userId = req.user!.userId;

    const userTeams = await Team.find({ coachId: userId }).select("_id").lean();
    const playerMemberships = await Player.find({ userId }).select("teamId").lean();
    const accessibleTeamIds = [
      ...userTeams.map((t) => t._id.toString()),
      ...playerMemberships.map((p) => p.teamId.toString()),
    ];

    const filter: Record<string, unknown> = {
      teamId: { $in: accessibleTeamIds },
    };
    if (teamId) filter.teamId = teamId;
    if (playerId) filter.playerId = playerId;
    if (eventId) filter.eventId = eventId;
    if (resolved === "true") filter.resolved = true;
    if (resolved === "false") filter.resolved = false;

    const records = await DisciplinaryRecord.find(filter)
      .populate({ path: "playerId", populate: { path: "userId", select: "name email" } })
      .populate("eventId", "title opponent date type")
      .populate("teamId", "name")
      .populate("createdBy", "name")
      .sort({ date: -1 })
      .lean();

    res.json(records);
  } catch (err) {
    console.error("Discipline list error:", err);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

// POST /api/discipline — create a record
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.user!.role;
    if (role !== "coach" && role !== "admin") {
      res.status(403).json({ error: "Only coaches can create disciplinary records" });
      return;
    }

    const { playerId, eventId, teamId, violationType, severity, description, date, fineAmount, suspensionDays } = req.body;

    if (!playerId || !teamId || !violationType || !severity || !description || !date) {
      res.status(400).json({ error: "playerId, teamId, violationType, severity, description, and date are required" });
      return;
    }

    const team = await Team.findOne({ _id: teamId, coachId: req.user!.userId });
    if (!team) {
      res.status(404).json({ error: "Team not found or you are not the coach" });
      return;
    }

    const player = await Player.findOne({ _id: playerId, teamId });
    if (!player) {
      res.status(404).json({ error: "Player not found in this team" });
      return;
    }

    const record = await DisciplinaryRecord.create({
      playerId,
      eventId: eventId || undefined,
      teamId,
      createdBy: req.user!.userId,
      violationType,
      severity,
      description,
      date: new Date(date),
      fineAmount,
      suspensionDays,
    });

    if (violationType === "suspension" && suspensionDays) {
      await Player.findByIdAndUpdate(playerId, { status: "suspended" });
    }

    const populated = await DisciplinaryRecord.findById(record._id)
      .populate({ path: "playerId", populate: { path: "userId", select: "name email" } })
      .populate("eventId", "title opponent date type")
      .populate("teamId", "name")
      .populate("createdBy", "name")
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error("Discipline create error:", err);
    res.status(500).json({ error: "Failed to create record" });
  }
});

// PUT /api/discipline/:id — update a record (resolve, etc.)
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const body = req.body;
    if (body.date) body.date = new Date(body.date);
    if (body.resolvedDate) body.resolvedDate = new Date(body.resolvedDate);

    const record = await DisciplinaryRecord.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate({ path: "playerId", populate: { path: "userId", select: "name email" } })
      .populate("eventId", "title opponent date type")
      .populate("teamId", "name")
      .lean();

    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.json(record);
  } catch (err) {
    console.error("Discipline update error:", err);
    res.status(500).json({ error: "Failed to update record" });
  }
});

// DELETE /api/discipline/:id
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const record = await DisciplinaryRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Discipline delete error:", err);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

export default router;
