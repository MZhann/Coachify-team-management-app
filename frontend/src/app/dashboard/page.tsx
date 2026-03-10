"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Trophy,
  ChevronRight,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Swords,
  TrendingUp,
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Dumbbell,
  Target,
  ChevronLeft,
  Send,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";

/* ────────────────── Types ────────────────── */

interface Team {
  _id: string;
  name: string;
  sport: string;
  inviteCode?: string;
  playerCount: number;
}

interface EventItem {
  _id: string;
  teamId: any;
  type: "training" | "match";
  title: string;
  date: string;
  endDate?: string;
  location: string;
  opponent?: string;
  homeAway?: string;
  scoreHome?: number;
  scoreAway?: number;
  tournamentId?: string;
  status: string;
  notes: string;
}

interface NoteItem {
  _id: string;
  teamId: any;
  authorId: { _id: string; name: string };
  content: string;
  pinned: boolean;
  createdAt: string;
}

interface DashboardData {
  user: { name: string; role: string; isCoach: boolean };
  teams: Team[];
  stats: {
    totalTeams: number;
    totalPlayers: number;
    matchRecord: { played: number; wins: number; draws: number; losses: number };
    attendanceRate: number;
  };
  nextEvent: EventItem | null;
  upcomingEvents: EventItem[];
  recentMatches: EventItem[];
  notes: NoteItem[];
}

/* ────────────────── Constants ────────────────── */

const SPORT_ICONS: Record<string, string> = {
  football: "\u26BD",
  basketball: "\uD83C\uDFC0",
  volleyball: "\uD83C\uDFD0",
  american_football: "\uD83C\uDFC8",
};
const SPORT_COLORS: Record<string, string> = {
  football: "bg-green-500",
  basketball: "bg-orange-500",
  volleyball: "bg-blue-500",
  american_football: "bg-red-500",
};

/* ────────────────── Helpers ────────────────── */

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const seconds = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function daysUntil(iso: string) {
  const diff = Math.ceil(
    (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `In ${diff} days`;
}

function matchResult(m: EventItem): { label: string; color: string } {
  if (m.scoreHome == null || m.scoreAway == null)
    return { label: "—", color: "text-gray-400" };
  // Determine OUR score vs OPPONENT score based on home/away
  const ourScore = m.homeAway === "away" ? m.scoreAway : m.scoreHome;
  const theirScore = m.homeAway === "away" ? m.scoreHome : m.scoreAway;
  if (ourScore > theirScore) return { label: "W", color: "text-green-600" };
  if (ourScore < theirScore) return { label: "L", color: "text-red-600" };
  return { label: "D", color: "text-amber-600" };
}

/* ────────────────── Page ────────────────── */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notes
  const [newNote, setNewNote] = useState("");
  const [noteTeamId, setNoteTeamId] = useState("");
  const [noteSending, setNoteSending] = useState(false);

  // Calendar
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        setError("Failed to load dashboard");
        return;
      }
      const d: DashboardData = await res.json();
      setData(d);
      if (d.teams.length > 0 && !noteTeamId) {
        setNoteTeamId(d.teams[0]._id);
      }
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handlePostNote() {
    if (!newNote.trim() || !noteTeamId) return;
    setNoteSending(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: noteTeamId, content: newNote.trim() }),
      });
      if (res.ok) {
        setNewNote("");
        fetchDashboard();
      }
    } finally {
      setNoteSending(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm("Delete this note?")) return;
    const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) fetchDashboard();
  }

  async function handleTogglePin(noteId: string, currentPinned: boolean) {
    await fetch(`/api/notes/${noteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !currentPinned }),
    });
    fetchDashboard();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
        {error || "Something went wrong"}
      </div>
    );
  }

  const { user, teams, stats, nextEvent, upcomingEvents, recentMatches, notes } = data;
  const isCoach = user.isCoach;

  /* ─── Calendar helpers ─── */
  const calYear = calMonth.getFullYear();
  const calMon = calMonth.getMonth();
  const daysInMonth = new Date(calYear, calMon + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMon, 1).getDay(); // 0=Sun

  // Map events to day numbers for this month
  const eventDayMap = new Map<number, EventItem[]>();
  upcomingEvents.forEach((ev) => {
    const d = new Date(ev.date);
    if (d.getFullYear() === calYear && d.getMonth() === calMon) {
      const day = d.getDate();
      if (!eventDayMap.has(day)) eventDayMap.set(day, []);
      eventDayMap.get(day)!.push(ev);
    }
  });

  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === calYear && today.getMonth() === calMon;

  return (
    <div className="space-y-6">
      {/* ─── Welcome banner ─── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-coachify-sidebar to-coachify-sidebarHover p-6 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">
            Welcome back, {user.name.split(" ")[0]}!
          </h1>
          <p className="mt-1 text-white/80 text-sm">
            {isCoach
              ? `You're managing ${stats.totalTeams} team${stats.totalTeams !== 1 ? "s" : ""} with ${stats.totalPlayers} player${stats.totalPlayers !== 1 ? "s" : ""}.`
              : `You're part of ${stats.totalTeams} team${stats.totalTeams !== 1 ? "s" : ""}.`}
          </p>
          {nextEvent && (
            <div className="mt-4 inline-flex items-center gap-3 rounded-lg bg-white/15 backdrop-blur-sm px-4 py-2.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  nextEvent.type === "match" ? "bg-red-500" : "bg-green-500"
                }`}
              >
                {nextEvent.type === "match" ? (
                  <Swords className="h-5 w-5 text-white" />
                ) : (
                  <Dumbbell className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <p className="text-xs text-white/70">Next up</p>
                <p className="font-semibold text-sm">{nextEvent.title}</p>
                <p className="text-xs text-white/80">
                  {daysUntil(nextEvent.date)} &middot;{" "}
                  {formatTime(nextEvent.date)}
                  {nextEvent.location && ` &middot; ${nextEvent.location}`}
                </p>
              </div>
              <Link
                href={`/dashboard/events/${nextEvent._id}`}
                className="ml-2 text-white/70 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          )}
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-10 h-32 w-32 rounded-full bg-white/5" />
      </div>

      {/* ─── Quick stat cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-blue-100 text-blue-600"
          label={isCoach ? "Total Players" : "Teams"}
          value={isCoach ? stats.totalPlayers : stats.totalTeams}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          iconBg="bg-green-100 text-green-600"
          label="Matches Played"
          value={stats.matchRecord.played}
          sub={
            stats.matchRecord.played > 0
              ? `${stats.matchRecord.wins}W ${stats.matchRecord.draws}D ${stats.matchRecord.losses}L`
              : undefined
          }
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          iconBg="bg-purple-100 text-purple-600"
          label="Win Rate"
          value={
            stats.matchRecord.played > 0
              ? `${Math.round(
                  (stats.matchRecord.wins / stats.matchRecord.played) * 100
                )}%`
              : "—"
          }
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconBg="bg-amber-100 text-amber-600"
          label={isCoach ? "Team Attendance" : "My Attendance"}
          value={stats.attendanceRate > 0 ? `${stats.attendanceRate}%` : "—"}
        />
      </div>

      {/* ─── Main grid: left column + right column ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent match results */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-red-500" />
                  Recent Matches
                </CardTitle>
                <Link
                  href="/dashboard/matches"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentMatches.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No completed matches yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {recentMatches.slice(0, 5).map((m) => {
                    const result = matchResult(m);
                    return (
                      <Link
                        key={m._id}
                        href={`/dashboard/events/${m._id}`}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                      >
                        {/* Result badge */}
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold text-sm ${
                            result.label === "W"
                              ? "bg-green-100 text-green-700"
                              : result.label === "L"
                              ? "bg-red-100 text-red-700"
                              : result.label === "D"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {result.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {m.title}
                            </span>
                            {m.opponent && (
                              <span className="text-xs text-gray-500">
                                vs {m.opponent}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {formatDate(m.date)} &middot;{" "}
                            {(m.teamId as any)?.name || ""}
                          </p>
                        </div>
                        {/* Score */}
                        {m.scoreHome != null && m.scoreAway != null && (
                          <div className="text-lg font-bold text-gray-800 tabular-nums">
                            {m.scoreHome}
                            <span className="text-gray-300 mx-0.5">-</span>
                            {m.scoreAway}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coach notes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-amber-500" />
                  Coach Notes
                </CardTitle>
              </div>
              <CardDescription>
                {isCoach
                  ? "Post announcements for your team"
                  : "Latest updates from your coach"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Compose (coach only) */}
              {isCoach && teams.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="flex gap-2">
                    {teams.length > 1 && (
                      <select
                        value={noteTeamId}
                        onChange={(e) => setNoteTeamId(e.target.value)}
                        className="h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm"
                      >
                        {teams.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="flex flex-1 gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Write a note for your team..."
                        className="flex-1 h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handlePostNote();
                          }
                        }}
                      />
                      <Button
                        onClick={handlePostNote}
                        disabled={!newNote.trim() || noteSending}
                        size="sm"
                        className="h-10 gap-1.5"
                      >
                        <Send className="h-4 w-4" />
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes list */}
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No notes yet.{" "}
                  {isCoach && "Post a note to keep your team informed."}
                </p>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div
                      key={note._id}
                      className={`rounded-lg border p-3 ${
                        note.pinned
                          ? "border-amber-200 bg-amber-50/50"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {note.pinned && (
                              <Pin className="h-3 w-3 text-amber-500" />
                            )}
                            <span className="text-xs font-medium text-gray-500">
                              {note.authorId?.name || "Coach"}
                            </span>
                            <span className="text-xs text-gray-400">
                              &middot; {timeAgo(note.createdAt)}
                            </span>
                            {note.teamId?.name && (
                              <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                {note.teamId.name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{note.content}</p>
                        </div>
                        {isCoach && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() =>
                                handleTogglePin(note._id, note.pinned)
                              }
                              className={`p-1 rounded hover:bg-gray-100 ${
                                note.pinned
                                  ? "text-amber-500"
                                  : "text-gray-300 hover:text-gray-500"
                              }`}
                              title={note.pinned ? "Unpin" : "Pin"}
                            >
                              <Pin className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note._id)}
                              className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teams */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>My Teams</CardTitle>
                {isCoach && <CreateTeamDialog onCreated={fetchDashboard} />}
              </div>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  {isCoach
                    ? "Create your first team to get started."
                    : "Join a team using an invite code."}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {teams.map((team) => (
                    <Link
                      key={team._id}
                      href={`/dashboard/teams/${team._id}`}
                      className="group flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 hover:border-blue-200 transition-all"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          SPORT_COLORS[team.sport] || "bg-gray-500"
                        } text-xl`}
                      >
                        {SPORT_ICONS[team.sport] || "\uD83C\uDFC6"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {team.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {team.playerCount} player
                          {team.playerCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {team.inviteCode && (
                        <div className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                          {team.inviteCode}
                        </div>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN (1/3) ── */}
        <div className="space-y-6">
          {/* Mini calendar */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Calendar
                </CardTitle>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      setCalMonth(
                        new Date(calYear, calMon - 1, 1)
                      )
                    }
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() =>
                      setCalMonth(
                        new Date(calYear, calMon + 1, 1)
                      )
                    }
                    className="p-1 rounded hover:bg-gray-100"
                  >
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                {calMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-medium text-gray-400 py-1"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8" />
                ))}
                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = eventDayMap.get(day);
                  const isToday =
                    isCurrentMonth && today.getDate() === day;
                  const hasTraining = dayEvents?.some(
                    (e) => e.type === "training"
                  );
                  const hasMatch = dayEvents?.some(
                    (e) => e.type === "match"
                  );

                  return (
                    <div
                      key={day}
                      className={`relative flex flex-col items-center justify-center h-8 rounded-md text-xs transition-colors ${
                        isToday
                          ? "bg-blue-600 text-white font-bold"
                          : dayEvents
                          ? "bg-gray-50 font-medium text-gray-800 hover:bg-gray-100 cursor-default"
                          : "text-gray-500"
                      }`}
                      title={
                        dayEvents
                          ? dayEvents
                              .map(
                                (e) =>
                                  `${e.type === "match" ? "⚔️" : "🏋️"} ${e.title} ${formatTime(e.date)}`
                              )
                              .join("\n")
                          : undefined
                      }
                    >
                      {day}
                      {/* Event dots */}
                      {dayEvents && !isToday && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          {hasTraining && (
                            <span className="h-1 w-1 rounded-full bg-green-500" />
                          )}
                          {hasMatch && (
                            <span className="h-1 w-1 rounded-full bg-red-500" />
                          )}
                        </div>
                      )}
                      {dayEvents && isToday && (
                        <div className="absolute bottom-0.5 flex gap-0.5">
                          {hasTraining && (
                            <span className="h-1 w-1 rounded-full bg-white/80" />
                          )}
                          {hasMatch && (
                            <span className="h-1 w-1 rounded-full bg-white/80" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Training
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Match
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming events list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No upcoming events.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 8).map((ev) => (
                    <Link
                      key={ev._id}
                      href={`/dashboard/events/${ev._id}`}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white text-xs font-bold ${
                          ev.type === "match" ? "bg-red-500" : "bg-green-500"
                        }`}
                      >
                        {new Date(ev.date).getDate()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {ev.title}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {formatDate(ev.date)} &middot;{" "}
                          {formatTime(ev.date)}
                          {ev.opponent && ` vs ${ev.opponent}`}
                        </p>
                      </div>
                      {ev.tournamentId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-50 text-amber-700">
                          🏆
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          ev.type === "match"
                            ? "bg-red-50 text-red-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {ev.type === "match" ? "Match" : "Training"}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick win/loss form (match record visual) */}
          {stats.matchRecord.played > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-500" />
                  Match Record
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Bar */}
                  <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                    {stats.matchRecord.wins > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{
                          width: `${
                            (stats.matchRecord.wins /
                              stats.matchRecord.played) *
                            100
                          }%`,
                        }}
                      />
                    )}
                    {stats.matchRecord.draws > 0 && (
                      <div
                        className="bg-amber-400 transition-all"
                        style={{
                          width: `${
                            (stats.matchRecord.draws /
                              stats.matchRecord.played) *
                            100
                          }%`,
                        }}
                      />
                    )}
                    {stats.matchRecord.losses > 0 && (
                      <div
                        className="bg-red-500 transition-all"
                        style={{
                          width: `${
                            (stats.matchRecord.losses /
                              stats.matchRecord.played) *
                            100
                          }%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-600 font-medium">
                      {stats.matchRecord.wins} Won
                    </span>
                    <span className="text-amber-600 font-medium">
                      {stats.matchRecord.draws} Drawn
                    </span>
                    <span className="text-red-600 font-medium">
                      {stats.matchRecord.losses} Lost
                    </span>
                  </div>
                  {/* Last 5 form */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 mb-1.5 uppercase tracking-wider font-medium">
                      Last 5 Results
                    </p>
                    <div className="flex gap-1">
                      {recentMatches.slice(0, 5).map((m) => {
                        const r = matchResult(m);
                        return (
                          <div
                            key={m._id}
                            className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                              r.label === "W"
                                ? "bg-green-100 text-green-700"
                                : r.label === "L"
                                ? "bg-red-100 text-red-700"
                                : r.label === "D"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            {r.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────── Sub-components ────────────────── */

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
            {sub && (
              <p className="text-[10px] text-gray-400 font-medium">{sub}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
