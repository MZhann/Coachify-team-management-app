"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Swords,
  Loader2,
  Users,
  BarChart3,
  Save,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ────────────────── Types ────────────────── */

interface EventData {
  _id: string;
  teamId: string;
  type: "training" | "match";
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  opponent?: string;
  homeAway?: "home" | "away" | "neutral";
  scoreHome?: number;
  scoreAway?: number;
  tournamentId?: string;
  tournamentMatchNumber?: number;
  status: "scheduled" | "completed" | "cancelled";
  notes: string;
  createdBy?: { _id: string; name: string };
  isCoach: boolean;
}

interface AttendanceRow {
  playerId: string;
  playerName: string;
  playerEmail: string;
  position: string;
  jerseyNumber?: number;
  status: "present" | "absent" | "late" | "excused";
  note: string;
}

interface MatchStatRow {
  playerId: string;
  playerName: string;
  position: string;
  jerseyNumber?: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCard: boolean;
  shotsOnTarget: number;
  shotsTotal: number;
  passesCompleted: number;
  passesTotal: number;
  tackles: number;
  interceptions: number;
  fouls: number;
  saves: number;
  rating: number;
  notes: string;
}

const ATTENDANCE_OPTIONS: {
  value: AttendanceRow["status"];
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: "present", label: "Present", color: "text-green-700", bg: "bg-green-100" },
  { value: "late", label: "Late", color: "text-amber-700", bg: "bg-amber-100" },
  { value: "excused", label: "Excused", color: "text-blue-700", bg: "bg-blue-100" },
  { value: "absent", label: "Absent", color: "text-red-700", bg: "bg-red-100" },
];

/* ────────────────── Page ────────────────── */

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"attendance" | "stats">("attendance");

  // Attendance
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [attendanceDirty, setAttendanceDirty] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Match stats
  const [matchStats, setMatchStats] = useState<MatchStatRow[]>([]);
  const [statsDirty, setStatsDirty] = useState(false);
  const [statsSaving, setStatsSaving] = useState(false);
  const [statsSaved, setStatsSaved] = useState(false);

  // Score
  const [scoreHome, setScoreHome] = useState<number | "">(0);
  const [scoreAway, setScoreAway] = useState<number | "">(0);
  const [scoreSaving, setScoreSaving] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  /* ─── Fetch event ─── */
  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setEvent(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* ─── Fetch attendance ─── */
  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch(`/api/attendance/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setAttendance(data.attendance || []);
    } catch {
      // skip
    }
  }, [id]);

  /* ─── Fetch match stats ─── */
  const fetchMatchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/match-stats/${id}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.stats && data.stats.length > 0) {
        // Existing stats from server
        setMatchStats(
          data.stats.map((s: any) => ({
            playerId: s.playerId?._id || s.playerId,
            playerName:
              s.playerId?.userId?.name || "Unknown",
            position: s.playerId?.position || "",
            jerseyNumber: s.playerId?.jerseyNumber,
            minutesPlayed: s.minutesPlayed || 0,
            goals: s.goals || 0,
            assists: s.assists || 0,
            yellowCards: s.yellowCards || 0,
            redCard: s.redCard || false,
            shotsOnTarget: s.shotsOnTarget || 0,
            shotsTotal: s.shotsTotal || 0,
            passesCompleted: s.passesCompleted || 0,
            passesTotal: s.passesTotal || 0,
            tackles: s.tackles || 0,
            interceptions: s.interceptions || 0,
            fouls: s.fouls || 0,
            saves: s.saves || 0,
            rating: s.rating || 0,
            notes: s.notes || "",
          }))
        );
      } else {
        // No stats yet — initialize from attendance / players list
        initMatchStatsFromAttendance();
      }
    } catch {
      // skip
    }
  }, [id]);

  function initMatchStatsFromAttendance() {
    // Use attendance rows to build initial stats rows
    setMatchStats(
      attendance.map((a) => ({
        playerId: a.playerId,
        playerName: a.playerName,
        position: a.position,
        jerseyNumber: a.jerseyNumber,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCard: false,
        shotsOnTarget: 0,
        shotsTotal: 0,
        passesCompleted: 0,
        passesTotal: 0,
        tackles: 0,
        interceptions: 0,
        fouls: 0,
        saves: 0,
        rating: 0,
        notes: "",
      }))
    );
  }

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  useEffect(() => {
    if (event) {
      fetchAttendance();
      if (event.type === "match") {
        fetchMatchStats();
      }
      // Populate score from event data
      setScoreHome(event.scoreHome ?? "");
      setScoreAway(event.scoreAway ?? "");
    }
  }, [event, fetchAttendance, fetchMatchStats]);

  // When attendance loads and we have no match stats yet, initialize
  useEffect(() => {
    if (
      event?.type === "match" &&
      matchStats.length === 0 &&
      attendance.length > 0
    ) {
      initMatchStatsFromAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance]);

  /* ─── Save attendance ─── */
  async function saveAttendance() {
    setAttendanceSaving(true);
    setAttendanceSaved(false);
    try {
      const res = await fetch(`/api/attendance/${id}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: attendance.map((a) => ({
            playerId: a.playerId,
            status: a.status,
            note: a.note,
          })),
        }),
      });
      if (res.ok) {
        setAttendanceDirty(false);
        setAttendanceSaved(true);
        setTimeout(() => setAttendanceSaved(false), 2000);
      }
    } finally {
      setAttendanceSaving(false);
    }
  }

  /* ─── Save match stats ─── */
  async function saveMatchStats() {
    setStatsSaving(true);
    setStatsSaved(false);
    try {
      const res = await fetch(`/api/match-stats/${id}/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerStats: matchStats.map((s) => ({
            playerId: s.playerId,
            minutesPlayed: s.minutesPlayed,
            goals: s.goals,
            assists: s.assists,
            yellowCards: s.yellowCards,
            redCard: s.redCard,
            shotsOnTarget: s.shotsOnTarget,
            shotsTotal: s.shotsTotal,
            passesCompleted: s.passesCompleted,
            passesTotal: s.passesTotal,
            tackles: s.tackles,
            interceptions: s.interceptions,
            fouls: s.fouls,
            saves: s.saves,
            rating: s.rating,
            notes: s.notes,
          })),
        }),
      });
      if (res.ok) {
        setStatsDirty(false);
        setStatsSaved(true);
        setTimeout(() => setStatsSaved(false), 2000);
      }
    } finally {
      setStatsSaving(false);
    }
  }

  /* ─── Save score ─── */
  async function saveScore() {
    setScoreSaving(true);
    setScoreSaved(false);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreHome: scoreHome === "" ? null : Number(scoreHome),
          scoreAway: scoreAway === "" ? null : Number(scoreAway),
          status: "completed",
        }),
      });
      if (res.ok) {
        setScoreSaved(true);
        setTimeout(() => setScoreSaved(false), 2000);
        fetchEvent(); // Refresh event to reflect new score & status
      }
    } finally {
      setScoreSaving(false);
    }
  }

  /* ─── Helpers ─── */
  function updateAttendanceStatus(
    playerId: string,
    status: AttendanceRow["status"]
  ) {
    setAttendance((prev) =>
      prev.map((a) =>
        a.playerId === playerId ? { ...a, status } : a
      )
    );
    setAttendanceDirty(true);
  }

  function updateAttendanceNote(playerId: string, note: string) {
    setAttendance((prev) =>
      prev.map((a) => (a.playerId === playerId ? { ...a, note } : a))
    );
    setAttendanceDirty(true);
  }

  function updateStat(
    playerId: string,
    field: keyof MatchStatRow,
    value: number | boolean | string
  ) {
    setMatchStats((prev) =>
      prev.map((s) =>
        s.playerId === playerId ? { ...s, [field]: value } : s
      )
    );
    setStatsDirty(true);
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* ─── Attendance summary ─── */
  const attendanceSummary = {
    present: attendance.filter((a) => a.status === "present").length,
    late: attendance.filter((a) => a.status === "late").length,
    excused: attendance.filter((a) => a.status === "excused").length,
    absent: attendance.filter((a) => a.status === "absent").length,
  };

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-gray-500">
        Event not found.{" "}
        <button
          onClick={() => router.back()}
          className="text-blue-600 underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const isMatch = event.type === "match";

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Event header card */}
      <Card>
        <div
          className={`h-2 ${
            isMatch ? "bg-red-500" : "bg-green-500"
          } ${event.status === "cancelled" ? "!bg-gray-300" : ""}`}
        />
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {event.title}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    event.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : event.status === "cancelled"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isMatch
                      ? "bg-red-50 text-red-600"
                      : "bg-green-50 text-green-600"
                  }`}
                >
                  {isMatch ? "Match" : "Training"}
                </span>
                {event.tournamentId && (
                  <Link
                    href={`/dashboard/tournaments/${event.tournamentId}`}
                    className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                  >
                    <Trophy className="mr-1 h-3 w-3" />
                    Tournament
                  </Link>
                )}
              </div>

              {isMatch && event.opponent && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Swords className="h-4 w-4 text-gray-400" />
                  <span className="font-medium">vs {event.opponent}</span>
                  {event.homeAway && (
                    <span className="text-xs text-gray-400 uppercase">
                      ({event.homeAway})
                    </span>
                  )}
                  {event.status === "completed" &&
                    event.scoreHome != null &&
                    event.scoreAway != null && (
                      <span className="ml-2 rounded bg-gray-100 px-3 py-1 text-lg font-bold text-gray-800">
                        {event.scoreHome} – {event.scoreAway}
                      </span>
                    )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(event.date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatTime(event.date)}
                  {event.endDate && ` – ${formatTime(event.endDate)}`}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </span>
                )}
              </div>

              {event.description && (
                <p className="text-sm text-gray-600">{event.description}</p>
              )}
              {event.notes && (
                <p className="text-xs italic text-gray-400 border-l-2 border-gray-200 pl-3">
                  {event.notes}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Score Input (Match only, Coach only) ─── */}
      {isMatch && event.isCoach && (
        <Card className="border-t-4 border-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Swords className="h-5 w-5 text-red-500" />
              Match Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Home team */}
              <div className="flex-1 text-center">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  {event.homeAway === "away" ? (event.opponent || "Opponent") : "Your Team"}
                </p>
                <input
                  type="number"
                  min={0}
                  value={scoreHome}
                  onChange={(e) => setScoreHome(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-24 h-16 text-center text-3xl font-bold rounded-lg border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all mx-auto block"
                  placeholder="0"
                />
              </div>

              {/* Separator */}
              <div className="text-2xl font-bold text-gray-300 hidden sm:block">–</div>
              <div className="text-sm font-bold text-gray-300 sm:hidden">vs</div>

              {/* Away team */}
              <div className="flex-1 text-center">
                <p className="text-sm font-medium text-gray-500 mb-2">
                  {event.homeAway === "away" ? "Your Team" : (event.opponent || "Opponent")}
                </p>
                <input
                  type="number"
                  min={0}
                  value={scoreAway}
                  onChange={(e) => setScoreAway(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-24 h-16 text-center text-3xl font-bold rounded-lg border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all mx-auto block"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                onClick={saveScore}
                disabled={scoreSaving}
                className="bg-red-600 hover:bg-red-700 text-white px-6"
              >
                {scoreSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {scoreSaving ? "Saving..." : "Save Score & Mark Completed"}
              </Button>
              {scoreSaved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> Saved!
                </span>
              )}
            </div>

            {/* Current score display */}
            {event.scoreHome != null && event.scoreAway != null && event.status === "completed" && (
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-400">
                  Current saved score:{" "}
                  <span className="font-bold text-gray-700">
                    {event.scoreHome} – {event.scoreAway}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Score display for players (non-coach) */}
      {isMatch && !event.isCoach && event.scoreHome != null && event.scoreAway != null && (
        <Card className="border-t-4 border-red-500">
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {event.homeAway === "away" ? (event.opponent || "Opponent") : "Your Team"}
                </p>
                <p className="text-4xl font-bold text-gray-900">{event.scoreHome}</p>
              </div>
              <div className="text-2xl font-bold text-gray-300">–</div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {event.homeAway === "away" ? "Your Team" : (event.opponent || "Opponent")}
                </p>
                <p className="text-4xl font-bold text-gray-900">{event.scoreAway}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("attendance")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "attendance"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="h-4 w-4" />
          Attendance
          {attendance.length > 0 && (
            <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
              {attendanceSummary.present + attendanceSummary.late}/{attendance.length}
            </span>
          )}
        </button>
        {isMatch && (
          <button
            onClick={() => setTab("stats")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "stats"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Match Statistics
          </button>
        )}
      </div>

      {/* ─── Attendance Tab ─── */}
      {tab === "attendance" && (
        <div className="space-y-4">
          {/* Summary cards */}
          {attendance.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <SummaryBox label="Present" value={attendanceSummary.present} color="text-green-600" />
              <SummaryBox label="Late" value={attendanceSummary.late} color="text-amber-600" />
              <SummaryBox label="Excused" value={attendanceSummary.excused} color="text-blue-600" />
              <SummaryBox label="Absent" value={attendanceSummary.absent} color="text-red-600" />
            </div>
          )}

          {attendance.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No players in this team yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          #
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Player
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Position
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Status
                        </th>
                        {event.isCoach && (
                          <th className="px-4 py-3 text-left font-medium text-gray-500">
                            Note
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attendance.map((row) => (
                        <tr key={row.playerId} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                            {row.jerseyNumber ?? "-"}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {row.playerName}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {row.position || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {event.isCoach ? (
                              <div className="flex gap-1 flex-wrap">
                                {ATTENDANCE_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() =>
                                      updateAttendanceStatus(
                                        row.playerId,
                                        opt.value
                                      )
                                    }
                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                                      row.status === opt.value
                                        ? `${opt.bg} ${opt.color} ring-2 ring-offset-1 ring-current`
                                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  ATTENDANCE_OPTIONS.find(
                                    (o) => o.value === row.status
                                  )?.bg
                                } ${
                                  ATTENDANCE_OPTIONS.find(
                                    (o) => o.value === row.status
                                  )?.color
                                }`}
                              >
                                {
                                  ATTENDANCE_OPTIONS.find(
                                    (o) => o.value === row.status
                                  )?.label
                                }
                              </span>
                            )}
                          </td>
                          {event.isCoach && (
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={row.note}
                                onChange={(e) =>
                                  updateAttendanceNote(
                                    row.playerId,
                                    e.target.value
                                  )
                                }
                                placeholder="Optional note..."
                                className="w-full max-w-[200px] rounded border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Save button */}
          {event.isCoach && attendance.length > 0 && (
            <div className="flex items-center gap-3">
              <Button
                onClick={saveAttendance}
                disabled={!attendanceDirty || attendanceSaving}
                className="gap-2"
              >
                {attendanceSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Attendance
              </Button>
              {attendanceSaved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved!
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Match Statistics Tab ─── */}
      {tab === "stats" && isMatch && (
        <div className="space-y-4">
          {matchStats.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  No players to record stats for.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Team totals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryBox
                  label="Goals"
                  value={matchStats.reduce((s, p) => s + p.goals, 0)}
                  color="text-green-600"
                />
                <SummaryBox
                  label="Assists"
                  value={matchStats.reduce((s, p) => s + p.assists, 0)}
                  color="text-blue-600"
                />
                <SummaryBox
                  label="Yellow Cards"
                  value={matchStats.reduce((s, p) => s + p.yellowCards, 0)}
                  color="text-amber-600"
                />
                <SummaryBox
                  label="Red Cards"
                  value={matchStats.filter((p) => p.redCard).length}
                  color="text-red-600"
                />
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50/50">
                          <th className="px-3 py-3 text-left font-medium text-gray-500 sticky left-0 bg-gray-50/50 min-w-[140px]">
                            Player
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Minutes Played">
                            MIN
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Goals">
                            G
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Assists">
                            A
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Shots on Target / Total">
                            SOT
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Passes Completed / Total">
                            PAS
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Tackles">
                            TKL
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Interceptions">
                            INT
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Fouls">
                            FLS
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[50px]" title="Saves">
                            SVS
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[30px]" title="Yellow Cards">
                            YC
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[30px]" title="Red Card">
                            RC
                          </th>
                          <th className="px-2 py-3 text-center font-medium text-gray-500 min-w-[55px]" title="Coach Rating (0-10)">
                            RTG
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {matchStats.map((row) => (
                          <tr key={row.playerId} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2 sticky left-0 bg-white font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                {row.jerseyNumber != null && (
                                  <span className="text-gray-400 font-mono text-xs w-5 text-right">
                                    {row.jerseyNumber}
                                  </span>
                                )}
                                <div>
                                  <div className="text-sm">{row.playerName}</div>
                                  <div className="text-xs text-gray-400">{row.position}</div>
                                </div>
                              </div>
                            </td>
                            {event.isCoach ? (
                              <>
                                <StatInput
                                  value={row.minutesPlayed}
                                  onChange={(v) => updateStat(row.playerId, "minutesPlayed", v)}
                                  max={200}
                                />
                                <StatInput
                                  value={row.goals}
                                  onChange={(v) => updateStat(row.playerId, "goals", v)}
                                />
                                <StatInput
                                  value={row.assists}
                                  onChange={(v) => updateStat(row.playerId, "assists", v)}
                                />
                                <StatInput
                                  value={row.shotsOnTarget}
                                  onChange={(v) => updateStat(row.playerId, "shotsOnTarget", v)}
                                  suffix={`/${row.shotsTotal}`}
                                  onSuffixChange={(v) => updateStat(row.playerId, "shotsTotal", v)}
                                />
                                <StatInput
                                  value={row.passesCompleted}
                                  onChange={(v) => updateStat(row.playerId, "passesCompleted", v)}
                                  suffix={`/${row.passesTotal}`}
                                  onSuffixChange={(v) => updateStat(row.playerId, "passesTotal", v)}
                                />
                                <StatInput
                                  value={row.tackles}
                                  onChange={(v) => updateStat(row.playerId, "tackles", v)}
                                />
                                <StatInput
                                  value={row.interceptions}
                                  onChange={(v) => updateStat(row.playerId, "interceptions", v)}
                                />
                                <StatInput
                                  value={row.fouls}
                                  onChange={(v) => updateStat(row.playerId, "fouls", v)}
                                />
                                <StatInput
                                  value={row.saves}
                                  onChange={(v) => updateStat(row.playerId, "saves", v)}
                                />
                                <StatInput
                                  value={row.yellowCards}
                                  onChange={(v) => updateStat(row.playerId, "yellowCards", v)}
                                  max={2}
                                  className={row.yellowCards > 0 ? "!bg-amber-50" : ""}
                                />
                                <td className="px-2 py-2 text-center">
                                  <button
                                    onClick={() =>
                                      updateStat(
                                        row.playerId,
                                        "redCard",
                                        !row.redCard
                                      )
                                    }
                                    className={`w-8 h-8 rounded border text-xs font-bold transition-colors ${
                                      row.redCard
                                        ? "bg-red-500 text-white border-red-600"
                                        : "bg-white text-gray-300 border-gray-200 hover:border-red-300"
                                    }`}
                                  >
                                    {row.redCard ? "!" : "–"}
                                  </button>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input
                                    type="number"
                                    min={0}
                                    max={10}
                                    step={0.1}
                                    value={row.rating || ""}
                                    onChange={(e) =>
                                      updateStat(
                                        row.playerId,
                                        "rating",
                                        Math.min(10, Math.max(0, parseFloat(e.target.value) || 0))
                                      )
                                    }
                                    className={`w-14 rounded border border-gray-200 bg-white px-1.5 py-1.5 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                      row.rating >= 8
                                        ? "text-green-600"
                                        : row.rating >= 6
                                        ? "text-gray-700"
                                        : row.rating > 0
                                        ? "text-red-600"
                                        : "text-gray-300"
                                    }`}
                                  />
                                </td>
                              </>
                            ) : (
                              <>
                                <StatCell value={row.minutesPlayed} />
                                <StatCell value={row.goals} highlight />
                                <StatCell value={row.assists} />
                                <StatCell
                                  value={`${row.shotsOnTarget}/${row.shotsTotal}`}
                                />
                                <StatCell
                                  value={`${row.passesCompleted}/${row.passesTotal}`}
                                />
                                <StatCell value={row.tackles} />
                                <StatCell value={row.interceptions} />
                                <StatCell value={row.fouls} />
                                <StatCell value={row.saves} />
                                <td className="px-2 py-2 text-center">
                                  {row.yellowCards > 0 && (
                                    <span className="inline-block w-4 h-5 rounded-sm bg-yellow-400" />
                                  )}
                                  {row.yellowCards > 1 && (
                                    <span className="inline-block w-4 h-5 rounded-sm bg-yellow-400 ml-0.5" />
                                  )}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  {row.redCard && (
                                    <span className="inline-block w-4 h-5 rounded-sm bg-red-500" />
                                  )}
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <span
                                    className={`text-xs font-bold ${
                                      row.rating >= 8
                                        ? "text-green-600"
                                        : row.rating >= 6
                                        ? "text-gray-700"
                                        : row.rating > 0
                                        ? "text-red-600"
                                        : "text-gray-300"
                                    }`}
                                  >
                                    {row.rating > 0 ? row.rating.toFixed(1) : "–"}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Save button */}
              {event.isCoach && (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={saveMatchStats}
                    disabled={!statsDirty || statsSaving}
                    className="gap-2"
                  >
                    {statsSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save Match Stats
                  </Button>
                  {statsSaved && (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Saved!
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────── Sub-components ────────────────── */

function SummaryBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function StatInput({
  value,
  onChange,
  max = 99,
  className = "",
  suffix,
  onSuffixChange,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  className?: string;
  suffix?: string;
  onSuffixChange?: (v: number) => void;
}) {
  if (suffix && onSuffixChange) {
    // Dual input like shots on target / total
    const suffixVal = parseInt(suffix.replace("/", "")) || 0;
    return (
      <td className="px-1 py-2 text-center">
        <div className="flex items-center justify-center gap-0.5">
          <input
            type="number"
            min={0}
            max={max}
            value={value || ""}
            onChange={(e) =>
              onChange(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))
            }
            className={`w-10 rounded border border-gray-200 bg-white px-1 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
          />
          <span className="text-gray-300 text-xs">/</span>
          <input
            type="number"
            min={0}
            max={max}
            value={suffixVal || ""}
            onChange={(e) =>
              onSuffixChange(
                Math.min(max, Math.max(0, parseInt(e.target.value) || 0))
              )
            }
            className={`w-10 rounded border border-gray-200 bg-white px-1 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
          />
        </div>
      </td>
    );
  }

  return (
    <td className="px-2 py-2 text-center">
      <input
        type="number"
        min={0}
        max={max}
        value={value || ""}
        onChange={(e) =>
          onChange(Math.min(max, Math.max(0, parseInt(e.target.value) || 0)))
        }
        className={`w-12 rounded border border-gray-200 bg-white px-1.5 py-1.5 text-center text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${className}`}
      />
    </td>
  );
}

function StatCell({
  value,
  highlight = false,
}: {
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <td
      className={`px-2 py-2 text-center text-xs ${
        highlight && value !== 0
          ? "font-bold text-green-600"
          : "text-gray-600"
      }`}
    >
      {value}
    </td>
  );
}

