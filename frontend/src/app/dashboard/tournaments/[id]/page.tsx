"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  ArrowLeft,
  Loader2,
  Swords,
  Users,
  Calendar,
  MapPin,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MatchDetailsDrawer } from "@/components/tournament/match-details-drawer";

/* ─── Types ─── */

interface TeamRef {
  _id: string;
  name: string;
  sport?: string;
}

interface GroupTeam {
  teamId: TeamRef;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface Group {
  name: string;
  teams: GroupTeam[];
}

interface TournamentMatch {
  _id: string;
  round: string;
  group?: string;
  matchNumber: number;
  homeTeamId?: TeamRef;
  awayTeamId?: TeamRef;
  homeScore?: number;
  awayScore?: number;
  played: boolean;
  date?: string;
  location?: string;
  eventId?: string;
  nextMatchNumber?: number;
  nextMatchSlot?: "home" | "away";
}

interface Tournament {
  _id: string;
  name: string;
  sport: string;
  format: "groups_knockout" | "league" | "knockout";
  status: "draft" | "group_stage" | "knockout" | "completed";
  description: string;
  teamIds: TeamRef[];
  teamsPerGroup: number;
  advancePerGroup: number;
  groups: Group[];
  matches: TournamentMatch[];
  startDate?: string;
  endDate?: string;
  createdBy: { _id: string; name: string };
  isAdmin: boolean;
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

const ROUND_ORDER = [
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  group_stage: { bg: "bg-blue-100", text: "text-blue-700", label: "Group Stage" },
  knockout: { bg: "bg-orange-100", text: "text-orange-700", label: "Knockout Stage" },
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
};

const SPORT_ICONS: Record<string, string> = {
  football: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  american_football: "🏈",
};

const SPORT_COLORS: Record<string, string> = {
  football: "from-green-500 to-emerald-600",
  basketball: "from-orange-500 to-red-500",
  volleyball: "from-yellow-500 to-amber-600",
  american_football: "from-blue-600 to-indigo-700",
};

/* ─── Page Component ─── */

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "groups" | "knockout" | "matches">("overview");

  // Score editing state
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [editHome, setEditHome] = useState<number>(0);
  const [editAway, setEditAway] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Match details drawer state
  const [drawerMatch, setDrawerMatch] = useState<number | null>(null);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (!res.ok) {
        router.push("/dashboard/tournaments");
        return;
      }
      const data = await res.json();
      setTournament(data);
    } catch {
      router.push("/dashboard/tournaments");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  async function handleSaveScore(matchNumber: number) {
    if (!tournament) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournament._id}/matches/${matchNumber}/score`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            homeScore: editHome,
            awayScore: editAway,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setTournament(updated);
        setEditingMatch(null);
      }
    } catch (err) {
      console.error("Save score error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!tournament || !confirm("Delete this tournament? This cannot be undone."))
      return;
    try {
      const res = await fetch(`/api/tournaments/${tournament._id}`, {
        method: "DELETE",
      });
      if (res.ok) router.push("/dashboard/tournaments");
    } catch (err) {
      console.error("Delete error:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!tournament) return null;

  const gradientClass = SPORT_COLORS[tournament.sport] || "from-gray-500 to-gray-600";
  const sportIcon = SPORT_ICONS[tournament.sport] || "🏆";
  const statusStyle = STATUS_STYLES[tournament.status] || STATUS_STYLES.draft;

  const groupMatches = tournament.matches.filter((m) => m.round === "group");
  const knockoutMatches = tournament.matches.filter((m) => m.round !== "group");
  const hasGroups = tournament.groups.length > 0;
  const hasKnockout = knockoutMatches.length > 0;

  // Determine available tabs
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "overview", label: "Overview" },
  ];
  if (hasGroups) tabs.push({ key: "groups", label: "Groups" });
  if (hasKnockout) tabs.push({ key: "knockout", label: "Bracket" });
  tabs.push({ key: "matches", label: "All Matches" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tournaments"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="text-2xl">{sportIcon}</span>
            {tournament.name}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>
            <span className="text-sm text-gray-500 capitalize">
              {tournament.sport.replace("_", " ")} •{" "}
              {tournament.format === "groups_knockout"
                ? "Groups + Knockout"
                : tournament.format === "league"
                ? "League"
                : "Knockout"}
            </span>
            <span className="text-sm text-gray-400">
              {tournament.teamIds.length} teams
            </span>
          </div>
        </div>
        {tournament.isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tournament banner */}
          <div className="lg:col-span-3">
            <div className={`bg-gradient-to-r ${gradientClass} rounded-2xl p-6 relative overflow-hidden`}>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl opacity-10">
                {sportIcon}
              </div>
              <h2 className="text-3xl font-bold text-white">{tournament.name}</h2>
              <p className="text-white/80 mt-1 capitalize">
                {tournament.sport.replace("_", " ")} Tournament
              </p>
              {tournament.description && (
                <p className="text-white/70 mt-2 max-w-xl">{tournament.description}</p>
              )}
              <div className="flex items-center gap-6 mt-4 text-sm text-white/80">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {tournament.teamIds.length} teams
                </span>
                <span className="flex items-center gap-1.5">
                  <Swords className="h-4 w-4" />
                  {tournament.matches.length} matches
                </span>
                {tournament.startDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(tournament.startDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick group standings preview */}
          {hasGroups && tournament.format !== "knockout" && (
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Group Standings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournament.groups.map((group) => (
                  <GroupTable key={group.name} group={group} compact />
                ))}
              </div>
            </div>
          )}

          {/* Knockout preview */}
          {hasKnockout && (
            <div className={`${hasGroups && tournament.format !== "knockout" ? "lg:col-span-1" : "lg:col-span-3"}`}>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {tournament.format === "knockout" ? "Bracket" : "Knockout Stage"}
              </h3>
              <div className="space-y-2">
                {ROUND_ORDER.filter((r) =>
                  knockoutMatches.some((m) => m.round === r)
                ).map((round) => {
                  const roundMatches = knockoutMatches.filter(
                    (m) => m.round === round
                  );
                  return (
                    <div key={round} className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        {ROUND_LABELS[round] || round}
                      </h4>
                      {roundMatches.map((match) => (
                        <MatchCard
                          key={match.matchNumber}
                          match={match}
                          isAdmin={tournament.isAdmin}
                          editing={editingMatch === match.matchNumber}
                          editHome={editHome}
                          editAway={editAway}
                          saving={saving}
                          onStartEdit={() => {
                            setEditingMatch(match.matchNumber);
                            setEditHome(match.homeScore ?? 0);
                            setEditAway(match.awayScore ?? 0);
                          }}
                          onCancelEdit={() => setEditingMatch(null)}
                          onSave={() => handleSaveScore(match.matchNumber)}
                          onEditHome={setEditHome}
                          onEditAway={setEditAway}
                          onDetails={setDrawerMatch}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Participating teams */}
          <div className="lg:col-span-3">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Participating Teams
            </h3>
            <div className="flex flex-wrap gap-2">
              {tournament.teamIds.map((team) => (
                <span
                  key={team._id}
                  className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm border border-gray-200"
                >
                  {team.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === "groups" && hasGroups && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tournament.groups.map((group) => (
              <GroupTable key={group.name} group={group} />
            ))}
          </div>

          {/* Group matches */}
          <h3 className="text-lg font-semibold text-gray-800">Group Matches</h3>
          {tournament.groups.map((group) => {
            const gMatches = groupMatches.filter(
              (m) => m.group === group.name
            );
            return (
              <div key={group.name} className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Group {group.name}
                </h4>
                <div className="space-y-2">
                  {gMatches.map((match) => (
                    <MatchCard
                      key={match.matchNumber}
                      match={match}
                      isAdmin={tournament.isAdmin}
                      editing={editingMatch === match.matchNumber}
                      editHome={editHome}
                      editAway={editAway}
                      saving={saving}
                      onStartEdit={() => {
                        setEditingMatch(match.matchNumber);
                        setEditHome(match.homeScore ?? 0);
                        setEditAway(match.awayScore ?? 0);
                      }}
                      onCancelEdit={() => setEditingMatch(null)}
                      onSave={() => handleSaveScore(match.matchNumber)}
                      onEditHome={setEditHome}
                      onEditAway={setEditAway}
                      onDetails={setDrawerMatch}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Knockout Tab (UCL-style bracket) */}
      {activeTab === "knockout" && hasKnockout && (
        <div className="space-y-1">
          <KnockoutBracket
            matches={knockoutMatches}
            isAdmin={tournament.isAdmin}
            editingMatch={editingMatch}
            editHome={editHome}
            editAway={editAway}
            saving={saving}
            onStartEdit={(mn, hs, as_) => {
              setEditingMatch(mn);
              setEditHome(hs);
              setEditAway(as_);
            }}
            onCancelEdit={() => setEditingMatch(null)}
            onSave={handleSaveScore}
            onEditHome={setEditHome}
            onEditAway={setEditAway}
            onDetails={setDrawerMatch}
          />
        </div>
      )}

      {/* All Matches Tab */}
      {activeTab === "matches" && (
        <div className="space-y-4">
          {tournament.matches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-400">
                No matches generated yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tournament.matches.map((match) => (
                <MatchCard
                  key={match.matchNumber}
                  match={match}
                  isAdmin={tournament.isAdmin}
                  editing={editingMatch === match.matchNumber}
                  editHome={editHome}
                  editAway={editAway}
                  saving={saving}
                  showRound
                  onStartEdit={() => {
                    setEditingMatch(match.matchNumber);
                    setEditHome(match.homeScore ?? 0);
                    setEditAway(match.awayScore ?? 0);
                  }}
                  onCancelEdit={() => setEditingMatch(null)}
                  onSave={() => handleSaveScore(match.matchNumber)}
                  onEditHome={setEditHome}
                  onEditAway={setEditAway}
                  onDetails={setDrawerMatch}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Match Details Drawer */}
      <MatchDetailsDrawer
        tournamentId={id}
        matchNumber={drawerMatch ?? 0}
        open={drawerMatch !== null}
        onClose={() => setDrawerMatch(null)}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Group Table Component
   ═══════════════════════════════════════════════ */

function GroupTable({ group, compact }: { group: Group; compact?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 py-3 px-4">
        <h4 className="text-sm font-bold text-white tracking-wider">
          GROUP {group.name}
        </h4>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 w-8">
                #
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">
                Team
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                P
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                W
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                D
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                L
              </th>
              {!compact && (
                <>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                    GF
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                    GA
                  </th>
                </>
              )}
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                GD
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500">
                Pts
              </th>
            </tr>
          </thead>
          <tbody>
            {group.teams.map((team, idx) => {
              const isQualifying = idx < 2; // Top 2 qualify (green highlight)
              return (
                <tr
                  key={team.teamId?._id || idx}
                  className={`border-b border-gray-50 ${
                    isQualifying
                      ? "bg-green-50/50"
                      : ""
                  } hover:bg-gray-50 transition-colors`}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                        isQualifying
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[120px]">
                    {team.teamId?.name || "TBD"}
                  </td>
                  <td className="px-2 py-2 text-center text-gray-600">{team.played}</td>
                  <td className="px-2 py-2 text-center text-gray-600">{team.won}</td>
                  <td className="px-2 py-2 text-center text-gray-600">{team.drawn}</td>
                  <td className="px-2 py-2 text-center text-gray-600">{team.lost}</td>
                  {!compact && (
                    <>
                      <td className="px-2 py-2 text-center text-gray-600">{team.goalsFor}</td>
                      <td className="px-2 py-2 text-center text-gray-600">{team.goalsAgainst}</td>
                    </>
                  )}
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`font-medium ${
                        team.goalDifference > 0
                          ? "text-green-600"
                          : team.goalDifference < 0
                          ? "text-red-500"
                          : "text-gray-400"
                      }`}
                    >
                      {team.goalDifference > 0 ? "+" : ""}
                      {team.goalDifference}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-white">
                      {team.points}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════
   Match Card Component
   ═══════════════════════════════════════════════ */

interface MatchCardProps {
  match: TournamentMatch;
  isAdmin: boolean;
  editing: boolean;
  editHome: number;
  editAway: number;
  saving: boolean;
  showRound?: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onEditHome: (v: number) => void;
  onEditAway: (v: number) => void;
  onDetails: (matchNumber: number) => void;
}

function MatchCard({
  match,
  isAdmin,
  editing,
  editHome,
  editAway,
  saving,
  showRound,
  onStartEdit,
  onCancelEdit,
  onSave,
  onEditHome,
  onEditAway,
  onDetails,
}: MatchCardProps) {
  const homeName = match.homeTeamId?.name || "TBD";
  const awayName = match.awayTeamId?.name || "TBD";
  const isPlayable = match.homeTeamId && match.awayTeamId && !match.played;
  const isTBD = !match.homeTeamId || !match.awayTeamId;

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        match.played
          ? "bg-white border-gray-200"
          : isTBD
          ? "bg-gray-50 border-dashed border-gray-200"
          : "bg-white border-gray-200 hover:shadow-sm"
      }`}
    >
      {/* Match number */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs font-bold text-gray-500">
        #{match.matchNumber}
      </div>

      {/* Round label */}
      {showRound && (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
          {ROUND_LABELS[match.round] || match.round}
          {match.group ? ` ${match.group}` : ""}
        </span>
      )}

      {/* Teams + Score */}
      <div className="flex-1 flex items-center justify-center gap-3">
        <span
          className={`text-sm font-medium text-right flex-1 truncate ${
            match.played && match.homeScore != null && match.awayScore != null
              ? match.homeScore > match.awayScore
                ? "text-green-700 font-bold"
                : match.homeScore < match.awayScore
                ? "text-red-500"
                : "text-gray-700"
              : isTBD && !match.homeTeamId
              ? "text-gray-300 italic"
              : "text-gray-700"
          }`}
        >
          {homeName}
        </span>

        {/* Score */}
        {editing ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              value={editHome}
              onChange={(e) => onEditHome(Number(e.target.value))}
              className="w-12 h-8 text-center text-sm font-bold"
            />
            <span className="text-gray-300 font-bold">–</span>
            <Input
              type="number"
              min={0}
              value={editAway}
              onChange={(e) => onEditAway(Number(e.target.value))}
              className="w-12 h-8 text-center text-sm font-bold"
            />
            <button
              onClick={onSave}
              disabled={saving}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={onCancelEdit}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : match.played ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
              {match.homeScore}
            </span>
            <span className="text-gray-300 font-bold text-xs">–</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
              {match.awayScore}
            </span>
          </div>
        ) : (
          <span className="shrink-0 rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400">
            vs
          </span>
        )}

        <span
          className={`text-sm font-medium text-left flex-1 truncate ${
            match.played && match.homeScore != null && match.awayScore != null
              ? match.awayScore > match.homeScore
                ? "text-green-700 font-bold"
                : match.awayScore < match.homeScore
                ? "text-red-500"
                : "text-gray-700"
              : isTBD && !match.awayTeamId
              ? "text-gray-300 italic"
              : "text-gray-700"
          }`}
        >
          {awayName}
        </span>
      </div>

      {/* Admin: Edit score */}
      {isAdmin && isPlayable && !editing && (
        <Button
          size="sm"
          variant="outline"
          onClick={onStartEdit}
          className="shrink-0 text-xs h-8"
        >
          Score
        </Button>
      )}

      {/* Details button */}
      {(match.homeTeamId || match.awayTeamId) && (
        <button
          onClick={() => onDetails(match.matchNumber)}
          className="shrink-0 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
        >
          Details
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Knockout Bracket Component (UCL-style)
   ═══════════════════════════════════════════════ */

interface KnockoutBracketProps {
  matches: TournamentMatch[];
  isAdmin: boolean;
  editingMatch: number | null;
  editHome: number;
  editAway: number;
  saving: boolean;
  onStartEdit: (matchNumber: number, homeScore: number, awayScore: number) => void;
  onCancelEdit: () => void;
  onSave: (matchNumber: number) => void;
  onEditHome: (v: number) => void;
  onEditAway: (v: number) => void;
  onDetails: (matchNumber: number) => void;
}

function KnockoutBracket({
  matches,
  isAdmin,
  editingMatch,
  editHome,
  editAway,
  saving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onEditHome,
  onEditAway,
  onDetails,
}: KnockoutBracketProps) {
  const rounds = ROUND_ORDER.filter((r) => matches.some((m) => m.round === r));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-8 min-w-max items-start">
        {rounds.map((round, roundIdx) => {
          const roundMatches = matches
            .filter((m) => m.round === round)
            .sort((a, b) => a.matchNumber - b.matchNumber);

          // Calculate spacing — each subsequent round has double the vertical gap
          const gapMultiplier = Math.pow(2, roundIdx);
          const isFinal = round === "final";

          return (
            <div
              key={round}
              className="flex flex-col items-center"
              style={{
                gap: `${gapMultiplier * 16}px`,
                paddingTop: `${(gapMultiplier - 1) * 32}px`,
              }}
            >
              {/* Round label */}
              <div
                className={`mb-3 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${
                  isFinal
                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white"
                    : "bg-slate-700 text-white"
                }`}
              >
                {ROUND_LABELS[round] || round}
              </div>

              {/* Matches */}
              {roundMatches.map((match) => (
                <BracketMatchCard
                  key={match.matchNumber}
                  match={match}
                  isAdmin={isAdmin}
                  isFinal={isFinal}
                  editing={editingMatch === match.matchNumber}
                  editHome={editHome}
                  editAway={editAway}
                  saving={saving}
                  onStartEdit={() =>
                    onStartEdit(
                      match.matchNumber,
                      match.homeScore ?? 0,
                      match.awayScore ?? 0
                    )
                  }
                  onCancelEdit={onCancelEdit}
                  onSave={() => onSave(match.matchNumber)}
                  onEditHome={onEditHome}
                  onEditAway={onEditAway}
                  onDetails={() => onDetails(match.matchNumber)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Bracket Match Card (compact for bracket view) ─── */

interface BracketMatchCardProps {
  match: TournamentMatch;
  isAdmin: boolean;
  isFinal: boolean;
  editing: boolean;
  editHome: number;
  editAway: number;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onEditHome: (v: number) => void;
  onEditAway: (v: number) => void;
  onDetails: () => void;
}

function BracketMatchCard({
  match,
  isAdmin,
  isFinal,
  editing,
  editHome,
  editAway,
  saving,
  onStartEdit,
  onCancelEdit,
  onSave,
  onEditHome,
  onEditAway,
  onDetails,
}: BracketMatchCardProps) {
  const homeName = match.homeTeamId?.name || "TBD";
  const awayName = match.awayTeamId?.name || "TBD";
  const homeWin =
    match.played && match.homeScore != null && match.awayScore != null
      ? match.homeScore > match.awayScore
      : false;
  const awayWin =
    match.played && match.homeScore != null && match.awayScore != null
      ? match.awayScore > match.homeScore
      : false;
  const isPlayable = match.homeTeamId && match.awayTeamId && !match.played;

  return (
    <div
      className={`w-56 rounded-xl border-2 overflow-hidden shadow-sm transition-all ${
        isFinal
          ? "border-amber-300 shadow-amber-100"
          : match.played
          ? "border-gray-200"
          : "border-gray-100"
      }`}
    >
      {isFinal && (
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 py-1 text-center">
          <Trophy className="h-3.5 w-3.5 text-white inline" />
        </div>
      )}

      {/* Home team row */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${
          homeWin ? "bg-green-50" : "bg-white"
        }`}
      >
        <span
          className={`text-sm truncate flex-1 ${
            homeWin ? "font-bold text-green-700" : "text-gray-700"
          } ${!match.homeTeamId ? "text-gray-300 italic" : ""}`}
        >
          {homeName}
        </span>
        {editing ? (
          <input
            type="number"
            min={0}
            value={editHome}
            onChange={(e) => onEditHome(Number(e.target.value))}
            className="w-10 h-6 text-center text-xs font-bold rounded border border-gray-300"
          />
        ) : match.played ? (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
              homeWin
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {match.homeScore}
          </span>
        ) : null}
      </div>

      {/* Away team row */}
      <div
        className={`flex items-center justify-between px-3 py-2 ${
          awayWin ? "bg-green-50" : "bg-white"
        }`}
      >
        <span
          className={`text-sm truncate flex-1 ${
            awayWin ? "font-bold text-green-700" : "text-gray-700"
          } ${!match.awayTeamId ? "text-gray-300 italic" : ""}`}
        >
          {awayName}
        </span>
        {editing ? (
          <input
            type="number"
            min={0}
            value={editAway}
            onChange={(e) => onEditAway(Number(e.target.value))}
            className="w-10 h-6 text-center text-xs font-bold rounded border border-gray-300"
          />
        ) : match.played ? (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
              awayWin
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {match.awayScore}
          </span>
        ) : null}
      </div>

      {/* Action row */}
      <div className="bg-gray-50 px-3 py-1.5 flex items-center justify-between gap-1">
        {/* Details button */}
        {(match.homeTeamId || match.awayTeamId) ? (
          <button
            onClick={onDetails}
            className="flex h-6 items-center rounded text-xs font-medium text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 transition-colors"
          >
            Details
          </button>
        ) : (
          <span />
        )}

        {/* Score editing */}
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex h-6 items-center gap-1 rounded bg-green-500 px-2 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="flex h-6 items-center rounded bg-gray-200 px-2 text-xs font-medium text-gray-600 hover:bg-gray-300"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : isAdmin && isPlayable ? (
            <button
              onClick={onStartEdit}
              className="flex h-6 items-center rounded bg-slate-700 px-2 text-xs font-medium text-white hover:bg-slate-800"
            >
              Enter Score
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

