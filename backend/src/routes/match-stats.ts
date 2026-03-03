import { Router, Response } from "express";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { Event } from "../models/Event";
import { MatchStat } from "../models/MatchStat";
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

/* ─── GET /api/match-stats/:eventId ─── */
/* Get all player stats for a match */
router.get(
  "/:eventId",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      if (event.type !== "match") {
        res
          .status(400)
          .json({ error: "Match stats are only available for matches" });
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

      const stats = await MatchStat.find({ eventId: req.params.eventId })
        .populate({
          path: "playerId",
          populate: { path: "userId", select: "name email avatar" },
        })
        .sort({ "playerId.userId.name": 1 })
        .lean();

      res.json({ stats, isCoach: access.isCoach });
    } catch (err) {
      console.error("Match stats fetch error:", err);
      res.status(500).json({ error: "Failed to fetch match stats" });
    }
  }
);

/* ─── POST /api/match-stats/:eventId/bulk ─── */
/* Create or update stats for multiple players at once (coach only) */
router.post(
  "/:eventId/bulk",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const event = await Event.findById(req.params.eventId).lean();
      if (!event) {
        res.status(404).json({ error: "Event not found" });
        return;
      }

      if (event.type !== "match") {
        res.status(400).json({ error: "Stats only for matches" });
        return;
      }

      const access = await checkTeamAccess(
        event.teamId.toString(),
        req.user!.userId
      );
      if (!access.isCoach) {
        res.status(403).json({ error: "Only coaches can record match stats" });
        return;
      }

      const { playerStats } = req.body;

      if (!Array.isArray(playerStats)) {
        res.status(400).json({ error: "playerStats must be an array" });
        return;
      }

      const results = [];

      for (const ps of playerStats) {
        const {
          playerId,
          minutesPlayed,
          goals,
          assists,
          yellowCards,
          redCard,
          shotsOnTarget,
          shotsTotal,
          passesCompleted,
          passesTotal,
          tackles,
          interceptions,
          fouls,
          saves,
          rating,
          notes,
        } = ps;

        if (!playerId) continue;

        // Verify player belongs to this team
        const player = await Player.findOne({
          _id: playerId,
          teamId: event.teamId,
        });
        if (!player) continue;

        const update: any = {};
        if (minutesPlayed !== undefined) update.minutesPlayed = minutesPlayed;
        if (goals !== undefined) update.goals = goals;
        if (assists !== undefined) update.assists = assists;
        if (yellowCards !== undefined) update.yellowCards = yellowCards;
        if (redCard !== undefined) update.redCard = redCard;
        if (shotsOnTarget !== undefined) update.shotsOnTarget = shotsOnTarget;
        if (shotsTotal !== undefined) update.shotsTotal = shotsTotal;
        if (passesCompleted !== undefined)
          update.passesCompleted = passesCompleted;
        if (passesTotal !== undefined) update.passesTotal = passesTotal;
        if (tackles !== undefined) update.tackles = tackles;
        if (interceptions !== undefined) update.interceptions = interceptions;
        if (fouls !== undefined) update.fouls = fouls;
        if (saves !== undefined) update.saves = saves;
        if (rating !== undefined) update.rating = rating;
        if (notes !== undefined) update.notes = notes;

        const stat = await MatchStat.findOneAndUpdate(
          {
            eventId: event._id,
            playerId: player._id,
          },
          {
            $set: update,
            $setOnInsert: {
              teamId: event.teamId,
            },
          },
          { upsert: true, new: true }
        );

        results.push(stat);
      }

      res.json({ saved: results.length, stats: results });
    } catch (err) {
      console.error("Match stats bulk save error:", err);
      res.status(500).json({ error: "Failed to save match stats" });
    }
  }
);

/* ─── PUT /api/match-stats/:eventId/:playerId ─── */
/* Update a single player's stats for a match (coach only) */
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
        res.status(403).json({ error: "Only coaches can update match stats" });
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

      const stat = await MatchStat.findOneAndUpdate(
        {
          eventId: event._id,
          playerId: player._id,
        },
        {
          $set: req.body,
          $setOnInsert: { teamId: event.teamId },
        },
        { upsert: true, new: true }
      );

      res.json(stat);
    } catch (err) {
      console.error("Match stat update error:", err);
      res.status(500).json({ error: "Failed to update match stat" });
    }
  }
);

/* ─── GET /api/match-stats/player/:playerId/summary ─── */
/* Get aggregated match stats for a player across all matches */
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

      const stats = await MatchStat.find({ playerId: player._id }).lean();

      const summary = {
        matchesPlayed: stats.length,
        totalMinutes: stats.reduce((s, st) => s + st.minutesPlayed, 0),
        totalGoals: stats.reduce((s, st) => s + st.goals, 0),
        totalAssists: stats.reduce((s, st) => s + st.assists, 0),
        totalYellowCards: stats.reduce((s, st) => s + st.yellowCards, 0),
        totalRedCards: stats.filter((st) => st.redCard).length,
        avgRating:
          stats.length > 0
            ? +(
                stats.reduce((s, st) => s + st.rating, 0) / stats.length
              ).toFixed(1)
            : 0,
      };

      res.json(summary);
    } catch (err) {
      console.error("Player stats summary error:", err);
      res.status(500).json({ error: "Failed to fetch player stats summary" });
    }
  }
);

export default router;

