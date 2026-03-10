"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Swords,
  Trophy,
  Shield,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Types ─── */

interface PlayerInfo {
  _id: string;
  userId: { _id: string; name: string; email: string; avatar?: string };
  position: string;
  jerseyNumber?: number;
  status: "active" | "injured" | "suspended" | "inactive";
}

interface TeamDetail {
  _id: string;
  name: string;
  sport?: string;
  coach?: { _id: string; name: string; email: string };
  players: PlayerInfo[];
}

interface MatchDetail {
  matchNumber: number;
  round: string;
  group?: string;
  played: boolean;
  homeScore?: number;
  awayScore?: number;
  date?: string;
  location?: string;
  homeAway?: string;
  nextMatchNumber?: number;
}

interface EventDetail {
  _id: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  status: string;
}

interface TournamentInfo {
  _id: string;
  name: string;
  sport: string;
  format: string;
}

interface MatchDetailsData {
  tournament: TournamentInfo;
  match: MatchDetail;
  homeTeam: TeamDetail | null;
  awayTeam: TeamDetail | null;
  event: EventDetail | null;
}

/* ─── Constants ─── */

const ROUND_LABELS: Record<string, string> = {
  group: "Group Stage",
  round_of_16: "Round of 16",
  quarter_final: "Quarter-Finals",
  semi_final: "Semi-Finals",
  third_place: "3rd Place",
  final: "Final",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  injured: "bg-red-100 text-red-600",
  suspended: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-500",
};

/* ─── Props ─── */

interface Props {
  tournamentId: string;
  matchNumber: number;
  open: boolean;
  onClose: () => void;
}

/* ─── Component ─── */

export function MatchDetailsDrawer({
  tournamentId,
  matchNumber,
  open,
  onClose,
}: Props) {
  const [data, setData] = useState<MatchDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setData(null);
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/tournaments/${tournamentId}/matches/${matchNumber}/details`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((d) => setData(d))
      .catch(() => setError("Failed to load match details"))
      .finally(() => setLoading(false));
  }, [open, tournamentId, matchNumber]);

  if (!open) return null;

  const match = data?.match;
  const homeTeam = data?.homeTeam;
  const awayTeam = data?.awayTeam;
  const event = data?.event;
  const tournament = data?.tournament;

  const matchDate = match?.date
    ? new Date(match.date)
    : event?.date
    ? new Date(event.date)
    : null;

  const location = match?.location || event?.location || null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-medium text-amber-300 uppercase tracking-wider">
                  {tournament?.name || "Tournament"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                Match #{matchNumber}
              </h2>
              {match && (
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80 mt-1">
                  {ROUND_LABELS[match.round] || match.round}
                  {match.group ? ` — Group ${match.group}` : ""}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          {data && match && (
            <>
              {/* Score / Matchup */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 p-6 border border-gray-200">
                <div className="flex items-center justify-between gap-4">
                  {/* Home Team */}
                  <div className="flex-1 text-center">
                    <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600 mb-2">
                      {homeTeam?.name?.charAt(0) || "?"}
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {homeTeam?.name || "TBD"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Home</p>
                  </div>

                  {/* Score */}
                  <div className="text-center shrink-0">
                    {match.played &&
                    match.homeScore != null &&
                    match.awayScore != null ? (
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-xl font-bold text-white">
                          {match.homeScore}
                        </span>
                        <span className="text-gray-300 font-bold">–</span>
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-xl font-bold text-white">
                          {match.awayScore}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Swords className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {match.played ? "Full Time" : "Upcoming"}
                    </p>
                  </div>

                  {/* Away Team */}
                  <div className="flex-1 text-center">
                    <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-red-100 text-xl font-bold text-red-600 mb-2">
                      {awayTeam?.name?.charAt(0) || "?"}
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {awayTeam?.name || "TBD"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Away</p>
                  </div>
                </div>
              </div>

              {/* Match Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
                  Match Info
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {matchDate && (
                    <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5">
                      <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {matchDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-xs text-gray-400">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {matchDate.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                  {location && (
                    <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5">
                      <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                      <p className="text-sm font-medium text-gray-700">
                        {location}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-2.5">
                    <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {ROUND_LABELS[match.round] || match.round}
                        {match.group ? ` — Group ${match.group}` : ""}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">
                        {tournament?.sport?.replace("_", " ")} •{" "}
                        {tournament?.format === "groups_knockout"
                          ? "Groups + Knockout"
                          : tournament?.format === "league"
                          ? "League"
                          : "Knockout"}
                      </p>
                    </div>
                  </div>
                  {match.nextMatchNumber && (
                    <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-4 py-2.5 border border-amber-100">
                      <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-sm text-amber-700">
                        Winner advances to Match #{match.nextMatchNumber} (
                        {match.nextMatchSlot} slot)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Teams Rosters */}
              <div className="grid grid-cols-1 gap-4">
                {homeTeam && (
                  <TeamRoster
                    team={homeTeam}
                    side="home"
                  />
                )}
                {awayTeam && (
                  <TeamRoster
                    team={awayTeam}
                    side="away"
                  />
                )}
              </div>

              {/* Link to full event page */}
              {event && (
                <div className="pt-2 border-t border-gray-100">
                  <Link
                    href={`/dashboard/events/${event._id}`}
                    className="block"
                    onClick={onClose}
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <Swords className="h-4 w-4" />
                      Go to Full Event Page
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Team Roster Sub-Component ─── */

function TeamRoster({
  team,
  side,
}: {
  team: TeamDetail;
  side: "home" | "away";
}) {
  const isHome = side === "home";
  const accentColor = isHome ? "blue" : "red";

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Team header */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          isHome
            ? "bg-gradient-to-r from-blue-500 to-blue-600"
            : "bg-gradient-to-r from-red-500 to-red-600"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">
            {team.name?.charAt(0) || "?"}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{team.name}</h4>
            <p className="text-xs text-white/70 capitalize">
              {isHome ? "Home" : "Away"} • {team.sport?.replace("_", " ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-white/80">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{team.players.length}</span>
        </div>
      </div>

      {/* Coach */}
      {team.coach && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              isHome ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
            } text-xs font-bold`}
          >
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {team.coach.name}
            </p>
            <p className="text-xs text-gray-400">Head Coach</p>
          </div>
        </div>
      )}

      {/* Players list */}
      {team.players.length > 0 ? (
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {team.players.map((player) => (
            <div
              key={player._id}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              {/* Jersey number */}
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold ${
                  isHome
                    ? "bg-blue-50 text-blue-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {player.jerseyNumber ?? "–"}
              </div>

              {/* Name + Position */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {player.userId?.name || "Unknown"}
                </p>
                <p className="text-xs text-gray-400">{player.position}</p>
              </div>

              {/* Status */}
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  STATUS_COLORS[player.status] || STATUS_COLORS.active
                }`}
              >
                {player.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-gray-400">
          No players registered
        </div>
      )}
    </div>
  );
}

