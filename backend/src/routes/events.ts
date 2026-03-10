import { Router, Response } from "express";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { Event } from "../models/Event";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware as any);

/* ─── helpers ─── */
async function checkTeamAccess(
  teamId: string,
  userId: string
): Promise<{ ok: boolean; isCoach: boolean }> {
  const team = await Team.findById(teamId).lean();
  if (!team) return { ok: false, isCoach: false };
  const isCoach = team.coachId.toString() === userId;
  const isMember = !!(await Player.exists({ userId, teamId: team._id }));
  return { ok: isCoach || isMember, isCoach };
}

/* ─── GET /api/events?teamId=...&type=training|match ─── */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId, type } = req.query;

    if (!teamId) {
      res.status(400).json({ error: "teamId query param is required" });
      return;
    }

    const access = await checkTeamAccess(
      teamId as string,
      req.user!.userId
    );
    if (!access.ok) {
      res.status(403).json({ error: "No access to this team" });
      return;
    }

    // Find events where the team is home OR away
    const filter: any = {
      $or: [{ teamId }, { awayTeamId: teamId }],
    };
    if (type === "training" || type === "match") {
      filter.type = type;
    }

    const events = await Event.find(filter)
      .populate("createdBy", "name")
      .populate("teamId", "name sport")
      .populate("awayTeamId", "name sport")
      .sort({ date: 1 })
      .lean();

    res.json(events);
  } catch (err) {
    console.error("Events list error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

/* ─── GET /api/events/:id ─── */
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name")
      .populate("teamId", "name sport")
      .populate("awayTeamId", "name sport")
      .lean();

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Check access via home team OR away team
    const homeAccess = await checkTeamAccess(
      event.teamId.toString(),
      req.user!.userId
    );
    let awayAccess = { ok: false, isCoach: false };
    if (event.awayTeamId) {
      awayAccess = await checkTeamAccess(
        event.awayTeamId.toString(),
        req.user!.userId
      );
    }

    if (!homeAccess.ok && !awayAccess.ok) {
      res.status(403).json({ error: "No access" });
      return;
    }

    res.json({
      ...event,
      isCoach: homeAccess.isCoach || awayAccess.isCoach,
    });
  } catch (err) {
    console.error("Event detail error:", err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

/* ─── POST /api/events ─── */
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      teamId,
      type,
      title,
      description,
      date,
      endDate,
      location,
      opponent,
      homeAway,
      notes,
    } = req.body;

    if (!teamId || !type || !title || !date) {
      res
        .status(400)
        .json({ error: "teamId, type, title, and date are required" });
      return;
    }

    if (type !== "training" && type !== "match") {
      res.status(400).json({ error: "type must be training or match" });
      return;
    }

    const access = await checkTeamAccess(teamId, req.user!.userId);
    if (!access.ok) {
      res.status(403).json({ error: "No access to this team" });
      return;
    }
    if (!access.isCoach) {
      res.status(403).json({ error: "Only coaches can create events" });
      return;
    }

    const event = await Event.create({
      teamId,
      createdBy: req.user!.userId,
      type,
      title,
      description: description || "",
      date: new Date(date),
      endDate: endDate ? new Date(endDate) : undefined,
      location: location || "",
      opponent: type === "match" ? opponent : undefined,
      homeAway: type === "match" ? homeAway : undefined,
      notes: notes || "",
    });

    res.json(event);
  } catch (err) {
    console.error("Event create error:", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

/* ─── PUT /api/events/:id ─── */
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const access = await checkTeamAccess(
      event.teamId.toString(),
      req.user!.userId
    );
    if (!access.isCoach) {
      res.status(403).json({ error: "Only the coach can edit events" });
      return;
    }

    const {
      title,
      description,
      date,
      endDate,
      location,
      opponent,
      homeAway,
      status,
      notes,
      scoreHome,
      scoreAway,
    } = req.body;

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (date !== undefined) event.date = new Date(date);
    if (endDate !== undefined) event.endDate = new Date(endDate);
    if (location !== undefined) event.location = location;
    if (opponent !== undefined) event.opponent = opponent;
    if (homeAway !== undefined) event.homeAway = homeAway;
    if (status !== undefined) event.status = status;
    if (notes !== undefined) event.notes = notes;
    if (scoreHome !== undefined) event.scoreHome = scoreHome;
    if (scoreAway !== undefined) event.scoreAway = scoreAway;

    await event.save();

    res.json(event);
  } catch (err) {
    console.error("Event update error:", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

/* ─── DELETE /api/events/:id ─── */
router.delete(
  "/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const access = await checkTeamAccess(
        event.teamId.toString(),
        req.user!.userId
      );
      if (!access.isCoach) {
        res.status(403).json({ error: "Only the coach can delete events" });
        return;
      }

      await event.deleteOne();
      res.json({ ok: true });
    } catch (err) {
      console.error("Event delete error:", err);
      res.status(500).json({ error: "Failed to delete event" });
    }
  }
);

export default router;


