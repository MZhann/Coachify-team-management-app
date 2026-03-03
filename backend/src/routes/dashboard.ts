import { Router, Response } from "express";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { Event } from "../models/Event";
import { Note } from "../models/Note";
import { Attendance } from "../models/Attendance";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware as any);

/* ─── GET /api/dashboard ─── */
/* Returns all data needed for the main dashboard in one request */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const isCoach = role === "coach" || role === "admin";

    // 1. Get user's teams
    let teams: any[] = [];

    if (isCoach) {
      teams = await Team.find({ coachId: userId })
        .sort({ createdAt: -1 })
        .lean();
    } else {
      const memberships = await Player.find({ userId }).lean();
      const teamIds = memberships.map((m) => m.teamId);
      teams = await Team.find({ _id: { $in: teamIds } })
        .populate("coachId", "name email")
        .sort({ createdAt: -1 })
        .lean();
    }

    const teamIds = teams.map((t) => t._id);

    // 2. Player counts per team
    const teamsWithCount = await Promise.all(
      teams.map(async (team) => {
        const playerCount = await Player.countDocuments({ teamId: team._id });
        return { ...team, playerCount };
      })
    );

    // 3. Total players across all teams
    const totalPlayers = teamsWithCount.reduce(
      (sum, t) => sum + t.playerCount,
      0
    );

    // 4. Upcoming events (next 30 days)
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const upcomingEvents = await Event.find({
      teamId: { $in: teamIds },
      date: { $gte: now, $lte: thirtyDaysLater },
      status: "scheduled",
    })
      .populate("createdBy", "name")
      .populate("teamId", "name sport")
      .sort({ date: 1 })
      .limit(15)
      .lean();

    // 5. Recent completed matches (last 10)
    const recentMatches = await Event.find({
      teamId: { $in: teamIds },
      type: "match",
      status: "completed",
    })
      .populate("teamId", "name sport")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    // 6. Match record (W/D/L)
    const allCompletedMatches = await Event.find({
      teamId: { $in: teamIds },
      type: "match",
      status: "completed",
    }).lean();

    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (const m of allCompletedMatches) {
      if (m.scoreHome != null && m.scoreAway != null) {
        // Determine OUR score vs OPPONENT score based on home/away
        const ourScore =
          m.homeAway === "away" ? m.scoreAway : m.scoreHome;
        const theirScore =
          m.homeAway === "away" ? m.scoreHome : m.scoreAway;

        if (ourScore > theirScore) wins++;
        else if (ourScore === theirScore) draws++;
        else losses++;
      }
    }

    // 7. Coach notes (latest across all teams)
    const notes = await Note.find({ teamId: { $in: teamIds } })
      .populate("authorId", "name avatar")
      .populate("teamId", "name")
      .sort({ pinned: -1, createdAt: -1 })
      .limit(10)
      .lean();

    // 8. Next event (the closest upcoming one)
    const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;

    // 9. Attendance rate (for coach: across all teams; for player: personal)
    let attendanceRate = 0;
    if (!isCoach) {
      // Player's personal attendance
      const playerDoc = await Player.findOne({ userId }).lean();
      if (playerDoc) {
        const totalRecords = await Attendance.countDocuments({
          playerId: playerDoc._id,
        });
        const presentRecords = await Attendance.countDocuments({
          playerId: playerDoc._id,
          status: { $in: ["present", "late"] },
        });
        attendanceRate =
          totalRecords > 0
            ? +((presentRecords / totalRecords) * 100).toFixed(1)
            : 100;
      }
    } else {
      // Coach: average across all teams
      const allAttendance = await Attendance.find({
        teamId: { $in: teamIds },
      }).lean();
      if (allAttendance.length > 0) {
        const present = allAttendance.filter(
          (a) => a.status === "present" || a.status === "late"
        ).length;
        attendanceRate = +((present / allAttendance.length) * 100).toFixed(1);
      }
    }

    res.json({
      user: {
        name: req.user!.name,
        role: req.user!.role,
        isCoach,
      },
      teams: teamsWithCount,
      stats: {
        totalTeams: teams.length,
        totalPlayers,
        matchRecord: {
          played: allCompletedMatches.length,
          wins,
          draws,
          losses,
        },
        attendanceRate,
      },
      nextEvent,
      upcomingEvents,
      recentMatches,
      notes,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

export default router;

