import { Router, Response } from "express";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { Event } from "../models/Event";
import { MatchStat } from "../models/MatchStat";
import { Attendance } from "../models/Attendance";
import { DisciplinaryRecord } from "../models/DisciplinaryRecord";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware as any);

/* ─── GET /api/analytics ─── */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;
    const isCoach = role === "coach" || role === "admin";

    let teams: any[] = [];
    if (isCoach) {
      teams = await Team.find(
        role === "admin" ? {} : { coachId: userId }
      ).lean();
    } else {
      const memberships = await Player.find({ userId }).lean();
      const teamIds = memberships.map((m) => m.teamId);
      teams = await Team.find({ _id: { $in: teamIds } }).lean();
    }

    const teamIds = teams.map((t) => t._id);
    const teamFilter = {
      $or: [{ teamId: { $in: teamIds } }, { awayTeamId: { $in: teamIds } }],
    };
    const teamIdSet = new Set(teamIds.map((id: any) => id.toString()));

    // Team overview
    const teamOverview = await Promise.all(
      teams.map(async (team) => {
        const playerCount = await Player.countDocuments({ teamId: team._id });
        const matches = await Event.find({
          $or: [{ teamId: team._id }, { awayTeamId: team._id }],
          type: "match",
          status: "completed",
        }).lean();

        let wins = 0,
          draws = 0,
          losses = 0,
          goalsFor = 0,
          goalsAgainst = 0;
        for (const m of matches) {
          if (m.scoreHome != null && m.scoreAway != null) {
            const isHome = m.teamId.toString() === team._id.toString();
            const our = isHome ? m.scoreHome : m.scoreAway;
            const their = isHome ? m.scoreAway : m.scoreHome;
            goalsFor += our;
            goalsAgainst += their;
            if (our > their) wins++;
            else if (our === their) draws++;
            else losses++;
          }
        }

        return {
          _id: team._id,
          name: team.name,
          sport: team.sport,
          playerCount,
          matches: matches.length,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          goalDiff: goalsFor - goalsAgainst,
        };
      })
    );

    // Monthly match results (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyMatches = await Event.find({
      ...teamFilter,
      type: "match",
      status: "completed",
      date: { $gte: sixMonthsAgo },
    })
      .sort({ date: 1 })
      .lean();

    const monthlyData: Record<
      string,
      { month: string; wins: number; draws: number; losses: number }
    > = {};

    for (const m of monthlyMatches) {
      const d = new Date(m.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (!monthlyData[key]) {
        monthlyData[key] = { month: label, wins: 0, draws: 0, losses: 0 };
      }
      if (m.scoreHome != null && m.scoreAway != null) {
        const isHome = teamIdSet.has(m.teamId.toString());
        const our = isHome ? m.scoreHome : m.scoreAway;
        const their = isHome ? m.scoreAway : m.scoreHome;
        if (our > their) monthlyData[key].wins++;
        else if (our === their) monthlyData[key].draws++;
        else monthlyData[key].losses++;
      }
    }

    // Attendance trend (last 6 months)
    const attendanceRecords = await Attendance.find({
      teamId: { $in: teamIds },
      createdAt: { $gte: sixMonthsAgo },
    }).lean();

    const attendanceByMonth: Record<
      string,
      { month: string; present: number; total: number }
    > = {};

    for (const a of attendanceRecords) {
      const d = new Date(a.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
      if (!attendanceByMonth[key]) {
        attendanceByMonth[key] = { month: label, present: 0, total: 0 };
      }
      attendanceByMonth[key].total++;
      if (a.status === "present" || a.status === "late") {
        attendanceByMonth[key].present++;
      }
    }

    const attendanceTrend = Object.entries(attendanceByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        month: v.month,
        rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
      }));

    // Top scorers
    const allMatchStats = await MatchStat.find({
      teamId: { $in: teamIds },
    })
      .populate("playerId", "userId position jerseyNumber")
      .lean();

    const scorerMap: Record<
      string,
      {
        playerId: string;
        name: string;
        goals: number;
        assists: number;
        matches: number;
        rating: number;
      }
    > = {};

    for (const stat of allMatchStats) {
      const pid = (stat.playerId as any)?._id?.toString();
      if (!pid) continue;
      if (!scorerMap[pid]) {
        scorerMap[pid] = {
          playerId: pid,
          name: "",
          goals: 0,
          assists: 0,
          matches: 0,
          rating: 0,
        };
      }
      scorerMap[pid].goals += stat.goals;
      scorerMap[pid].assists += stat.assists;
      scorerMap[pid].matches++;
      scorerMap[pid].rating += stat.rating;
    }

    const playerIds = Object.values(scorerMap).map((s) => s.playerId);
    const players = await Player.find({ _id: { $in: playerIds } })
      .populate("userId", "name")
      .lean();
    const playerNameMap = new Map<string, string>();
    for (const p of players) {
      playerNameMap.set(
        p._id.toString(),
        (p.userId as any)?.name || "Unknown"
      );
    }

    for (const s of Object.values(scorerMap)) {
      s.name = playerNameMap.get(s.playerId) || "Unknown";
      if (s.matches > 0) s.rating = +(s.rating / s.matches).toFixed(1);
    }

    const topScorers = Object.values(scorerMap)
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 10);

    const topAssists = Object.values(scorerMap)
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 10);

    // Discipline summary
    const disciplineRecords = await DisciplinaryRecord.find({
      teamId: { $in: teamIds },
    }).lean();

    const disciplineSummary = {
      total: disciplineRecords.length,
      byType: {} as Record<string, number>,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<
        string,
        number
      >,
    };

    for (const d of disciplineRecords) {
      disciplineSummary.byType[d.violationType] =
        (disciplineSummary.byType[d.violationType] || 0) + 1;
      if (d.severity in disciplineSummary.bySeverity) {
        disciplineSummary.bySeverity[d.severity]++;
      }
    }

    // Sport distribution
    const sportDist: Record<string, number> = {};
    for (const t of teams) {
      sportDist[t.sport] = (sportDist[t.sport] || 0) + 1;
    }

    // Events breakdown
    const totalTrainings = await Event.countDocuments({
      teamId: { $in: teamIds },
      type: "training",
    });
    const totalMatches = await Event.countDocuments({
      ...teamFilter,
      type: "match",
    });

    res.json({
      teamOverview,
      monthlyResults: Object.values(monthlyData),
      attendanceTrend,
      topScorers,
      topAssists,
      disciplineSummary,
      sportDistribution: Object.entries(sportDist).map(([sport, count]) => ({
        sport,
        count,
      })),
      eventBreakdown: { trainings: totalTrainings, matches: totalMatches },
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
