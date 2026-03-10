import { Router, Response } from "express";
import mongoose from "mongoose";
import { Tournament, ITournamentMatch, IGroup, IGroupTeam } from "../models/Tournament";
import { Team } from "../models/Team";
import { Player } from "../models/Player";
import { Event } from "../models/Event";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authMiddleware as any);

/* ────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────── */

function isAdmin(req: AuthRequest): boolean {
  return req.user!.role === "admin";
}

/** Shuffle array (Fisher-Yates) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate group-stage matches (round-robin within each group) */
function generateGroupMatches(groups: IGroup[]): Partial<ITournamentMatch>[] {
  const matches: Partial<ITournamentMatch>[] = [];
  let matchNum = 1;

  for (const group of groups) {
    const teams = group.teams.map((t) => t.teamId);
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          round: "group",
          group: group.name,
          matchNumber: matchNum++,
          homeTeamId: teams[i],
          awayTeamId: teams[j],
          played: false,
        });
      }
    }
  }

  return matches;
}

/** Generate knockout bracket matches (empty, to be filled as teams advance) */
function generateKnockoutMatches(
  numTeams: number,
  startMatchNumber: number
): Partial<ITournamentMatch>[] {
  const matches: Partial<ITournamentMatch>[] = [];
  let matchNum = startMatchNumber;

  // Determine rounds needed
  const rounds: { name: string; count: number }[] = [];
  if (numTeams >= 16) rounds.push({ name: "round_of_16", count: 8 });
  if (numTeams >= 8) rounds.push({ name: "quarter_final", count: 4 });
  if (numTeams >= 4) rounds.push({ name: "semi_final", count: 2 });
  if (numTeams >= 2) rounds.push({ name: "final", count: 1 });

  // Create match slots for each round
  const roundMatches: Map<string, number[]> = new Map();

  for (const round of rounds) {
    const nums: number[] = [];
    for (let i = 0; i < round.count; i++) {
      const m: Partial<ITournamentMatch> = {
        round: round.name as any,
        matchNumber: matchNum,
        played: false,
      };
      nums.push(matchNum);
      matches.push(m);
      matchNum++;
    }
    roundMatches.set(round.name, nums);
  }

  // Link winners to next round
  for (let r = 0; r < rounds.length - 1; r++) {
    const currentNums = roundMatches.get(rounds[r].name)!;
    const nextNums = roundMatches.get(rounds[r + 1].name)!;

    for (let i = 0; i < currentNums.length; i++) {
      const match = matches.find((m) => m.matchNumber === currentNums[i])!;
      match.nextMatchNumber = nextNums[Math.floor(i / 2)];
      match.nextMatchSlot = i % 2 === 0 ? "home" : "away";
    }
  }

  return matches;
}

/** Recalculate group standings from match results */
function recalcGroupStandings(
  groups: IGroup[],
  matches: ITournamentMatch[]
): IGroup[] {
  // Reset all stats
  for (const group of groups) {
    for (const team of group.teams) {
      team.played = 0;
      team.won = 0;
      team.drawn = 0;
      team.lost = 0;
      team.goalsFor = 0;
      team.goalsAgainst = 0;
      team.goalDifference = 0;
      team.points = 0;
    }
  }

  // Process group matches
  const groupMatches = matches.filter((m) => m.round === "group" && m.played);
  for (const match of groupMatches) {
    if (match.homeScore == null || match.awayScore == null) continue;

    const group = groups.find((g) => g.name === match.group);
    if (!group) continue;

    const home = group.teams.find(
      (t) => t.teamId.toString() === match.homeTeamId?.toString()
    );
    const away = group.teams.find(
      (t) => t.teamId.toString() === match.awayTeamId?.toString()
    );
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;

    if (match.homeScore > match.awayScore) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (match.homeScore < match.awayScore) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  }

  // Sort each group: points → goal diff → goals for
  for (const group of groups) {
    group.teams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference)
        return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }

  return groups;
}

/* ────────────────────────────────────────────────
   GET /api/tournaments — List all tournaments
   ──────────────────────────────────────────────── */
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sport, status } = req.query;
    const filter: any = {};
    if (sport) filter.sport = sport;
    if (status) filter.status = status;

    const tournaments = await Tournament.find(filter)
      .populate("teamIds", "name sport")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.json(tournaments);
  } catch (err) {
    console.error("Tournaments list error:", err);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

/* ────────────────────────────────────────────────
   GET /api/tournaments/:id — Tournament detail
   ──────────────────────────────────────────────── */
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate("teamIds", "name sport")
      .populate("createdBy", "name")
      .populate("matches.homeTeamId", "name sport")
      .populate("matches.awayTeamId", "name sport")
      .populate("groups.teams.teamId", "name sport")
      .lean();

    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }

    res.json({ ...tournament, isAdmin: isAdmin(req) });
  } catch (err) {
    console.error("Tournament detail error:", err);
    res.status(500).json({ error: "Failed to fetch tournament" });
  }
});

/* ────────────────────────────────────────────────
   POST /api/tournaments — Create tournament (admin)
   ──────────────────────────────────────────────── */
router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ error: "Only admins can create tournaments" });
      return;
    }

    const {
      name,
      sport,
      format,
      description,
      teamIds,
      teamsPerGroup,
      advancePerGroup,
      startDate,
      endDate,
    } = req.body;

    if (!name || !sport || !format || !teamIds || teamIds.length < 2) {
      res.status(400).json({
        error: "Name, sport, format, and at least 2 teams are required",
      });
      return;
    }

    // Validate that all teams exist and match the sport
    const teams = await Team.find({ _id: { $in: teamIds } }).lean();
    if (teams.length !== teamIds.length) {
      res.status(400).json({ error: "Some team IDs are invalid" });
      return;
    }

    const tournament = await Tournament.create({
      name,
      sport,
      format,
      description: description || "",
      createdBy: req.user!.userId,
      teamIds,
      teamsPerGroup: teamsPerGroup || 4,
      advancePerGroup: advancePerGroup || 2,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.json(tournament);
  } catch (err) {
    console.error("Tournament create error:", err);
    res.status(500).json({ error: "Failed to create tournament" });
  }
});

/* ────────────────────────────────────────────────
   PUT /api/tournaments/:id — Update tournament (admin)
   ──────────────────────────────────────────────── */
router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ error: "Only admins can update tournaments" });
      return;
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }

    const { name, description, status, startDate, endDate } = req.body;
    if (name !== undefined) tournament.name = name;
    if (description !== undefined) tournament.description = description;
    if (status !== undefined) tournament.status = status;
    if (startDate !== undefined) tournament.startDate = new Date(startDate);
    if (endDate !== undefined) tournament.endDate = new Date(endDate);

    await tournament.save();
    res.json(tournament);
  } catch (err) {
    console.error("Tournament update error:", err);
    res.status(500).json({ error: "Failed to update tournament" });
  }
});

/* ────────────────────────────────────────────────
   DELETE /api/tournaments/:id — Delete tournament (admin)
   ──────────────────────────────────────────────── */
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ error: "Only admins can delete tournaments" });
      return;
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }

    // Also delete linked events
    await Event.deleteMany({ tournamentId: tournament._id });
    await tournament.deleteOne();

    res.json({ ok: true });
  } catch (err) {
    console.error("Tournament delete error:", err);
    res.status(500).json({ error: "Failed to delete tournament" });
  }
});

/* ────────────────────────────────────────────────
   POST /api/tournaments/:id/generate — Generate fixtures
   ──────────────────────────────────────────────── */
router.post(
  "/:id/generate",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!isAdmin(req)) {
        res.status(403).json({ error: "Only admins can generate fixtures" });
        return;
      }

      const tournament = await Tournament.findById(req.params.id);
      if (!tournament) {
        res.status(404).json({ error: "Tournament not found" });
        return;
      }

      if (tournament.matches.length > 0) {
        res
          .status(400)
          .json({ error: "Fixtures already generated. Delete tournament to restart." });
        return;
      }

      const shuffledTeams = shuffle(
        tournament.teamIds.map((id) => id.toString())
      );

      if (tournament.format === "groups_knockout") {
        // ── Group Stage ──
        const numGroups = Math.max(
          1,
          Math.floor(shuffledTeams.length / tournament.teamsPerGroup)
        );
        const groups: IGroup[] = [];

        for (let g = 0; g < numGroups; g++) {
          groups.push({
            name: String.fromCharCode(65 + g), // A, B, C, ...
            teams: [],
          });
        }

        // Distribute teams to groups
        shuffledTeams.forEach((teamId, idx) => {
          const groupIdx = idx % numGroups;
          groups[groupIdx].teams.push({
            teamId: new mongoose.Types.ObjectId(teamId),
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
          });
        });

        tournament.groups = groups;

        // Generate group matches
        const groupMatches = generateGroupMatches(groups);

        // Determine knockout teams count
        const knockoutTeams = numGroups * tournament.advancePerGroup;
        // Generate knockout brackets
        const knockoutMatches = generateKnockoutMatches(
          knockoutTeams,
          groupMatches.length + 1
        );

        tournament.matches = [
          ...groupMatches,
          ...knockoutMatches,
        ] as ITournamentMatch[];
        tournament.status = "group_stage";
      } else if (tournament.format === "league") {
        // ── League (round-robin all vs all) ──
        const allTeams: IGroupTeam[] = shuffledTeams.map((id) => ({
          teamId: new mongoose.Types.ObjectId(id),
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        }));

        tournament.groups = [{ name: "League", teams: allTeams }];

        const matches: Partial<ITournamentMatch>[] = [];
        let matchNum = 1;
        for (let i = 0; i < shuffledTeams.length; i++) {
          for (let j = i + 1; j < shuffledTeams.length; j++) {
            matches.push({
              round: "group",
              group: "League",
              matchNumber: matchNum++,
              homeTeamId: new mongoose.Types.ObjectId(shuffledTeams[i]),
              awayTeamId: new mongoose.Types.ObjectId(shuffledTeams[j]),
              played: false,
            });
          }
        }
        tournament.matches = matches as ITournamentMatch[];
        tournament.status = "group_stage";
      } else if (tournament.format === "knockout") {
        // ── Pure Knockout ──
        // Pad to nearest power of 2
        let n = shuffledTeams.length;
        let pow = 1;
        while (pow < n) pow *= 2;

        const knockoutMatches = generateKnockoutMatches(pow, 1);

        // Assign teams to first round
        const firstRound = knockoutMatches.filter(
          (m) => m.round === knockoutMatches[0]!.round
        );

        let teamIdx = 0;
        for (const match of firstRound) {
          if (teamIdx < shuffledTeams.length) {
            match.homeTeamId = new mongoose.Types.ObjectId(
              shuffledTeams[teamIdx++]
            );
          }
          if (teamIdx < shuffledTeams.length) {
            match.awayTeamId = new mongoose.Types.ObjectId(
              shuffledTeams[teamIdx++]
            );
          }
        }

        // Give byes — if only one team in a match, auto-advance
        for (const match of firstRound) {
          if (match.homeTeamId && !match.awayTeamId) {
            match.played = true;
            match.homeScore = 0;
            match.awayScore = 0;
            // Advance home team
            if (match.nextMatchNumber != null) {
              const next = knockoutMatches.find(
                (m) => m.matchNumber === match.nextMatchNumber
              );
              if (next) {
                if (match.nextMatchSlot === "home") {
                  next.homeTeamId = match.homeTeamId;
                } else {
                  next.awayTeamId = match.homeTeamId;
                }
              }
            }
          }
        }

        tournament.matches = knockoutMatches as ITournamentMatch[];
        tournament.status = "knockout";
      }

      // Create Event records for matches that have both teams
      for (const match of tournament.matches) {
        if (match.homeTeamId && match.awayTeamId && !match.played) {
          const homeTeam = await Team.findById(match.homeTeamId)
            .select("name")
            .lean();
          const awayTeam = await Team.findById(match.awayTeamId)
            .select("name")
            .lean();

          const event = await Event.create({
            teamId: match.homeTeamId,
            awayTeamId: match.awayTeamId,
            createdBy: req.user!.userId,
            type: "match",
            title: `${tournament.name}: ${homeTeam?.name || "TBD"} vs ${awayTeam?.name || "TBD"}`,
            description: `Tournament: ${tournament.name} | Round: ${match.round}${match.group ? ` | Group ${match.group}` : ""}`,
            date: match.date || tournament.startDate || new Date(),
            location: match.location || "",
            opponent: awayTeam?.name || "TBD",
            homeAway: "home",
            tournamentId: tournament._id,
            tournamentMatchNumber: match.matchNumber,
          });

          match.eventId = event._id as mongoose.Types.ObjectId;
        }
      }

      await tournament.save();

      // Re-fetch with populated fields
      const populated = await Tournament.findById(tournament._id)
        .populate("teamIds", "name sport")
        .populate("createdBy", "name")
        .populate("matches.homeTeamId", "name sport")
        .populate("matches.awayTeamId", "name sport")
        .populate("groups.teams.teamId", "name sport")
        .lean();

      res.json(populated);
    } catch (err) {
      console.error("Generate fixtures error:", err);
      res.status(500).json({ error: "Failed to generate fixtures" });
    }
  }
);

/* ────────────────────────────────────────────────
   PUT /api/tournaments/:id/matches/:matchNumber/score
   Update score for a tournament match
   ──────────────────────────────────────────────── */
router.put(
  "/:id/matches/:matchNumber/score",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!isAdmin(req)) {
        res.status(403).json({ error: "Only admins can update scores" });
        return;
      }

      const { homeScore, awayScore } = req.body;
      if (homeScore == null || awayScore == null) {
        res.status(400).json({ error: "homeScore and awayScore required" });
        return;
      }

      const tournament = await Tournament.findById(req.params.id);
      if (!tournament) {
        res.status(404).json({ error: "Tournament not found" });
        return;
      }

      const matchNum = parseInt(req.params.matchNumber, 10);
      const match = tournament.matches.find(
        (m) => m.matchNumber === matchNum
      );
      if (!match) {
        res.status(404).json({ error: "Match not found" });
        return;
      }

      match.homeScore = homeScore;
      match.awayScore = awayScore;
      match.played = true;

      // Update the linked Event
      if (match.eventId) {
        await Event.findByIdAndUpdate(match.eventId, {
          scoreHome: homeScore,
          scoreAway: awayScore,
          status: "completed",
        });
      }

      // If knockout match, advance winner
      if (match.round !== "group" && match.nextMatchNumber != null) {
        const winnerId =
          homeScore > awayScore ? match.homeTeamId : match.awayTeamId;

        if (winnerId) {
          const nextMatch = tournament.matches.find(
            (m) => m.matchNumber === match.nextMatchNumber
          );
          if (nextMatch) {
            if (match.nextMatchSlot === "home") {
              nextMatch.homeTeamId = winnerId;
            } else {
              nextMatch.awayTeamId = winnerId;
            }

            // Create Event for the next match if both teams are now known
            if (
              nextMatch.homeTeamId &&
              nextMatch.awayTeamId &&
              !nextMatch.eventId
            ) {
              const homeTeam = await Team.findById(nextMatch.homeTeamId)
                .select("name")
                .lean();
              const awayTeam = await Team.findById(nextMatch.awayTeamId)
                .select("name")
                .lean();

              const event = await Event.create({
                teamId: nextMatch.homeTeamId,
                awayTeamId: nextMatch.awayTeamId,
                createdBy: req.user!.userId,
                type: "match",
                title: `${tournament.name}: ${homeTeam?.name || "TBD"} vs ${awayTeam?.name || "TBD"}`,
                description: `Tournament: ${tournament.name} | Round: ${nextMatch.round}`,
                date: nextMatch.date || tournament.startDate || new Date(),
                location: nextMatch.location || "",
                opponent: awayTeam?.name || "TBD",
                homeAway: "home",
                tournamentId: tournament._id,
                tournamentMatchNumber: nextMatch.matchNumber,
              });

              nextMatch.eventId = event._id as mongoose.Types.ObjectId;
            }
          }
        }
      }

      // Recalculate group standings
      if (match.round === "group") {
        tournament.groups = recalcGroupStandings(
          tournament.groups,
          tournament.matches as ITournamentMatch[]
        );

        // Check if all group matches are played → advance to knockout
        const allGroupMatchesPlayed = tournament.matches
          .filter((m) => m.round === "group")
          .every((m) => m.played);

        if (
          allGroupMatchesPlayed &&
          tournament.format === "groups_knockout"
        ) {
          // Advance top teams from each group to knockout
          const knockoutMatches = tournament.matches.filter(
            (m) => m.round !== "group"
          );

          if (knockoutMatches.length > 0) {
            // Collect qualifying teams from each group
            const qualifiers: mongoose.Types.ObjectId[] = [];
            for (const group of tournament.groups) {
              const advancing = group.teams.slice(
                0,
                tournament.advancePerGroup
              );
              for (const t of advancing) {
                qualifiers.push(t.teamId);
              }
            }

            // Seed into first knockout round (1st of A vs 2nd of B, etc.)
            const firstKnockoutRound = knockoutMatches[0]?.round;
            const firstRoundMatches = knockoutMatches.filter(
              (m) => m.round === firstKnockoutRound
            );

            // Pair: 1st of group A vs 2nd of group B, 1st of B vs 2nd of A, etc.
            const numGroups = tournament.groups.length;
            let pairIdx = 0;
            for (let g = 0; g < numGroups; g++) {
              const oppositeG = (g + 1) % numGroups;
              for (let a = 0; a < tournament.advancePerGroup; a++) {
                if (pairIdx < firstRoundMatches.length) {
                  const team1 =
                    tournament.groups[g].teams[a]?.teamId;
                  // Cross-pair: top of one group vs bottom qualifier of another
                  const oppositeIdx =
                    tournament.advancePerGroup - 1 - a;
                  const team2 =
                    tournament.groups[oppositeG].teams[oppositeIdx]
                      ?.teamId;

                  const m = firstRoundMatches[pairIdx];
                  if (team1) m.homeTeamId = team1;
                  if (team2) m.awayTeamId = team2;

                  // Create event for this knockout match
                  if (m.homeTeamId && m.awayTeamId && !m.eventId) {
                    const homeTeam = await Team.findById(m.homeTeamId)
                      .select("name")
                      .lean();
                    const awayTeam = await Team.findById(m.awayTeamId)
                      .select("name")
                      .lean();

                    const event = await Event.create({
                      teamId: m.homeTeamId,
                      createdBy: req.user!.userId,
                      type: "match",
                      title: `${tournament.name}: ${homeTeam?.name || "TBD"} vs ${awayTeam?.name || "TBD"}`,
                      description: `Tournament: ${tournament.name} | Round: ${m.round}`,
                      date:
                        m.date || tournament.startDate || new Date(),
                      location: m.location || "",
                      opponent: awayTeam?.name || "TBD",
                      homeAway: "home",
                      tournamentId: tournament._id,
                      tournamentMatchNumber: m.matchNumber,
                    });

                    m.eventId = event._id as mongoose.Types.ObjectId;
                  }

                  pairIdx++;
                }
              }
            }

            tournament.status = "knockout";
          }
        }
      }

      // Check if tournament is completed (final played)
      const finalMatch = tournament.matches.find(
        (m) => m.round === "final"
      );
      if (finalMatch?.played) {
        tournament.status = "completed";
      }
      // For league format, check if all matches played
      if (tournament.format === "league") {
        const allPlayed = tournament.matches.every((m) => m.played);
        if (allPlayed) tournament.status = "completed";
      }

      await tournament.save();

      // Re-fetch populated
      const populated = await Tournament.findById(tournament._id)
        .populate("teamIds", "name sport")
        .populate("createdBy", "name")
        .populate("matches.homeTeamId", "name sport")
        .populate("matches.awayTeamId", "name sport")
        .populate("groups.teams.teamId", "name sport")
        .lean();

      res.json(populated);
    } catch (err) {
      console.error("Update score error:", err);
      res.status(500).json({ error: "Failed to update match score" });
    }
  }
);

/* ────────────────────────────────────────────────
   GET /api/tournaments/sports/teams?sport=football
   Get teams filtered by sport for tournament creation
   ──────────────────────────────────────────────── */
router.get(
  "/sports/teams",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { sport } = req.query;
      const filter: any = {};
      if (sport) filter.sport = sport;

      const teams = await Team.find(filter)
        .select("name sport coachId")
        .populate("coachId", "name")
        .sort({ name: 1 })
        .lean();

      res.json(teams);
    } catch (err) {
      console.error("Sports teams error:", err);
      res.status(500).json({ error: "Failed to fetch teams by sport" });
    }
  }
);

/* ────────────────────────────────────────────────
   GET /api/tournaments/:id/matches/:matchNumber/details
   Rich match info: both teams, players, coaches, event data
   ──────────────────────────────────────────────── */
router.get(
  "/:id/matches/:matchNumber/details",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const tournament = await Tournament.findById(req.params.id)
        .populate("matches.homeTeamId", "name sport")
        .populate("matches.awayTeamId", "name sport")
        .lean();

      if (!tournament) {
        res.status(404).json({ error: "Tournament not found" });
        return;
      }

      const matchNum = parseInt(req.params.matchNumber, 10);
      const match = tournament.matches.find(
        (m) => m.matchNumber === matchNum
      );
      if (!match) {
        res.status(404).json({ error: "Match not found" });
        return;
      }

      // Fetch home team details + coach + players
      let homeTeamDetail: any = null;
      if (match.homeTeamId) {
        const teamId =
          typeof match.homeTeamId === "object"
            ? (match.homeTeamId as any)._id
            : match.homeTeamId;

        const team = await Team.findById(teamId)
          .populate("coachId", "name email")
          .lean();

        const players = await Player.find({ teamId })
          .populate("userId", "name email avatar")
          .select("userId position jerseyNumber status")
          .sort({ jerseyNumber: 1, position: 1 })
          .lean();

        homeTeamDetail = {
          ...(typeof match.homeTeamId === "object" ? match.homeTeamId : { _id: teamId }),
          coach: team?.coachId || null,
          players,
        };
      }

      // Fetch away team details + coach + players
      let awayTeamDetail: any = null;
      if (match.awayTeamId) {
        const teamId =
          typeof match.awayTeamId === "object"
            ? (match.awayTeamId as any)._id
            : match.awayTeamId;

        const team = await Team.findById(teamId)
          .populate("coachId", "name email")
          .lean();

        const players = await Player.find({ teamId })
          .populate("userId", "name email avatar")
          .select("userId position jerseyNumber status")
          .sort({ jerseyNumber: 1, position: 1 })
          .lean();

        awayTeamDetail = {
          ...(typeof match.awayTeamId === "object" ? match.awayTeamId : { _id: teamId }),
          coach: team?.coachId || null,
          players,
        };
      }

      // Fetch linked event if exists
      let eventDetail: any = null;
      if (match.eventId) {
        eventDetail = await Event.findById(match.eventId)
          .populate("createdBy", "name")
          .lean();
      }

      res.json({
        tournament: {
          _id: tournament._id,
          name: tournament.name,
          sport: tournament.sport,
          format: tournament.format,
        },
        match: {
          matchNumber: match.matchNumber,
          round: match.round,
          group: match.group,
          played: match.played,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          date: match.date || eventDetail?.date || null,
          location: match.location || eventDetail?.location || null,
          homeAway: eventDetail?.homeAway || "home",
          nextMatchNumber: match.nextMatchNumber,
          nextMatchSlot: match.nextMatchSlot,
        },
        homeTeam: homeTeamDetail,
        awayTeam: awayTeamDetail,
        event: eventDetail,
      });
    } catch (err) {
      console.error("Match details error:", err);
      res.status(500).json({ error: "Failed to fetch match details" });
    }
  }
);

export default router;

