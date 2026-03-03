import { Router, Response } from "express";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { Note } from "../models/Note";
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

/* ─── GET /api/notes?teamId=... ─── */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.query;

    if (!teamId) {
      res.status(400).json({ error: "teamId is required" });
      return;
    }

    const access = await checkTeamAccess(teamId as string, req.user!.userId);
    if (!access.ok) {
      res.status(403).json({ error: "No access to this team" });
      return;
    }

    const notes = await Note.find({ teamId })
      .populate("authorId", "name avatar")
      .sort({ pinned: -1, createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ notes, isCoach: access.isCoach });
  } catch (err) {
    console.error("Notes list error:", err);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

/* ─── POST /api/notes ─── */
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId, content, pinned } = req.body;

    if (!teamId || !content?.trim()) {
      res.status(400).json({ error: "teamId and content are required" });
      return;
    }

    const access = await checkTeamAccess(teamId, req.user!.userId);
    if (!access.isCoach) {
      res.status(403).json({ error: "Only coaches can post notes" });
      return;
    }

    const note = await Note.create({
      teamId,
      authorId: req.user!.userId,
      content: content.trim(),
      pinned: !!pinned,
    });

    const populated = await Note.findById(note._id)
      .populate("authorId", "name avatar")
      .lean();

    res.json(populated);
  } catch (err) {
    console.error("Note create error:", err);
    res.status(500).json({ error: "Failed to create note" });
  }
});

/* ─── PUT /api/notes/:id ─── */
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    const access = await checkTeamAccess(
      note.teamId.toString(),
      req.user!.userId
    );
    if (!access.isCoach) {
      res.status(403).json({ error: "Only coaches can edit notes" });
      return;
    }

    const { content, pinned } = req.body;
    if (content !== undefined) note.content = content.trim();
    if (pinned !== undefined) note.pinned = pinned;
    await note.save();

    const populated = await Note.findById(note._id)
      .populate("authorId", "name avatar")
      .lean();

    res.json(populated);
  } catch (err) {
    console.error("Note update error:", err);
    res.status(500).json({ error: "Failed to update note" });
  }
});

/* ─── DELETE /api/notes/:id ─── */
router.delete(
  "/:id",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const note = await Note.findById(req.params.id);
      if (!note) {
        res.status(404).json({ error: "Note not found" });
        return;
      }

      const access = await checkTeamAccess(
        note.teamId.toString(),
        req.user!.userId
      );
      if (!access.isCoach) {
        res.status(403).json({ error: "Only coaches can delete notes" });
        return;
      }

      await note.deleteOne();
      res.json({ ok: true });
    } catch (err) {
      console.error("Note delete error:", err);
      res.status(500).json({ error: "Failed to delete note" });
    }
  }
);

export default router;

