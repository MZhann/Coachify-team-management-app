import { Router, Response } from "express";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { Event } from "../models/Event";
import { Attendance } from "../models/Attendance";
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

/* ─── GET /api/attendance/:eventId ─── */
/* Get attendance records for an event */
router.get(
  "/:eventId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const access = await checkTeamAccess(
        event.teamId.toString(),
        req.user!.userId
      );
      if (!access.ok) {
        res.status(403).json({ error: "No access to this team" });
        return;
      }

      // Get all players of the team
      const players = await Player.find({ teamId: event.teamId })
        .populate("userId", "name email avatar")
        .sort({ "userId.name": 1 })
        .lean();

      // Get existing attendance records
      const records = await Attendance.find({
        eventId: req.params.eventId,
      }).lean();

      // Build a map for quick lookup
      const recordMap = new Map(
        records.map((r) => [r.playerId.toString(), r])
      );

      // Merge: return every player with their attendance status
      const attendance = players.map((player) => {
        const record = recordMap.get(player._id.toString());
        return {
          playerId: player._id,
          playerName: (player.userId as any)?.name || "Unknown",
          playerEmail: (player.userId as any)?.email || "",
          playerAvatar: (player.userId as any)?.avatar || "",
          position: player.position,
          jerseyNumber: player.jerseyNumber,
          status: record?.status || "absent",
          note: record?.note || "",
          attendanceId: record?._id || null,
        };
      });

      res.json({ attendance, isCoach: access.isCoach });
    } catch (err) {
      console.error("Attendance fetch error:", err);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  }
);

/* ─── POST /api/attendance/:eventId/bulk ─── */
/* Set attendance for multiple players at once (coach only) */
router.post(
  "/:eventId/bulk",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const access = await checkTeamAccess(
        event.teamId.toString(),
        req.user!.userId
      );
      if (!access.isCoach) {
        res
          .status(403)
          .json({ error: "Only coaches can record attendance" });
        return;
      }

      const { records } = req.body;

      if (!Array.isArray(records)) {
        res.status(400).json({ error: "records must be an array" });
        return;
      }

      const validStatuses = ["present", "absent", "late", "excused"];
      let saved = 0;

      for (const rec of records) {
        const { playerId, status, note } = rec;
        if (!playerId || !validStatuses.includes(status)) continue;

        // Verify player belongs to this team
        const player = await Player.findOne({
          _id: playerId,
          teamId: event.teamId,
        });
        if (!player) continue;

        await Attendance.findOneAndUpdate(
          { eventId: event._id, playerId: player._id },
          {
            $set: {
              status,
              note: note || "",
            },
            $setOnInsert: { teamId: event.teamId },
          },
          { upsert: true }
        );

        saved++;
      }

      res.json({ saved });
    } catch (err) {
      console.error("Attendance bulk save error:", err);
      res.status(500).json({ error: "Failed to save attendance" });
    }
  }
);

/* ─── PUT /api/attendance/:eventId/:playerId ─── */
/* Update single player attendance (coach only) */
router.put(
  "/:eventId/:playerId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      const access = await checkTeamAccess(
        event.teamId.toString(),
        req.user!.userId
      );
      if (!access.isCoach) {
        res
          .status(403)
          .json({ error: "Only coaches can update attendance" });
        return;
      }

      const { status, note } = req.body;
      const validStatuses = ["present", "absent", "late", "excused"];

      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: "Invalid status" });
        return;
      }

      const player = await Player.findOne({
        _id: req.params.playerId,
        teamId: event.teamId,
      });
      if (!player) {
        res.status(404).json({ error: "Player not found in this team" });
        return;
      }

      const attendance = await Attendance.findOneAndUpdate(
        { eventId: event._id, playerId: player._id },
        {
          $set: { status, note: note || "" },
          $setOnInsert: { teamId: event.teamId },
        },
        { upsert: true, new: true }
      );

      res.json(attendance);
    } catch (err) {
      console.error("Attendance update error:", err);
      res.status(500).json({ error: "Failed to update attendance" });
    }
  }
);

/* ─── GET /api/attendance/player/:playerId/summary ─── */
/* Get attendance summary for a player */
router.get(
  "/player/:playerId/summary",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const player = await Player.findById(req.params.playerId).lean();
      if (!player) {
        res.status(404).json({ error: "Player not found" });
        return;
      }

      const access = await checkTeamAccess(
        player.teamId.toString(),
        req.user!.userId
      );
      if (!access.ok) {
        res.status(403).json({ error: "No access" });
        return;
      }

      const records = await Attendance.find({
        playerId: player._id,
      }).lean();

      const summary = {
        total: records.length,
        present: records.filter((r) => r.status === "present").length,
        absent: records.filter((r) => r.status === "absent").length,
        late: records.filter((r) => r.status === "late").length,
        excused: records.filter((r) => r.status === "excused").length,
        rate:
          records.length > 0
            ? +(
                ((records.filter(
                  (r) => r.status === "present" || r.status === "late"
                ).length) /
                  records.length) *
                100
              ).toFixed(1)
            : 0,
      };

      res.json(summary);
    } catch (err) {
      console.error("Attendance summary error:", err);
      res.status(500).json({ error: "Failed to fetch attendance summary" });
    }
  }
);

export default router;

