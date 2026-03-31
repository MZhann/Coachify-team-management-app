"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Trophy,
  Users,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Target,
  Calendar,
  Award,
  Flame,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TeamOverview {
  _id: string;
  name: string;
  sport: string;
  playerCount: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

interface MonthlyResult {
  month: string;
  wins: number;
  draws: number;
  losses: number;
}

interface AttendanceTrend {
  month: string;
  rate: number;
}

interface PlayerStat {
  playerId: string;
  name: string;
  goals: number;
  assists: number;
  matches: number;
  rating: number;
}

interface AnalyticsData {
  teamOverview: TeamOverview[];
  monthlyResults: MonthlyResult[];
  attendanceTrend: AttendanceTrend[];
  topScorers: PlayerStat[];
  topAssists: PlayerStat[];
  disciplineSummary: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  sportDistribution: { sport: string; count: number }[];
  eventBreakdown: { trainings: number; matches: number };
}

const SPORT_LABELS: Record<string, string> = {
  football: "Football",
  basketball: "Basketball",
  volleyball: "Volleyball",
  american_football: "American Football",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6"];
const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
        {error || "Something went wrong"}
      </div>
    );
  }

  const {
    teamOverview,
    monthlyResults,
    attendanceTrend,
    topScorers,
    topAssists,
    disciplineSummary,
    sportDistribution,
    eventBreakdown,
  } = data;

  const totalPlayers = teamOverview.reduce((s, t) => s + t.playerCount, 0);
  const totalMatches = teamOverview.reduce((s, t) => s + t.matches, 0);
  const totalWins = teamOverview.reduce((s, t) => s + t.wins, 0);
  const totalGoals = teamOverview.reduce((s, t) => s + t.goalsFor, 0);
  const overallWinRate =
    totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

  const eventPieData = [
    { name: "Trainings", value: eventBreakdown.trainings },
    { name: "Matches", value: eventBreakdown.matches },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-blue-600" />
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive statistics and insights for your teams
          </p>
        </div>
        {teamOverview.length > 1 && (
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Teams</option>
            {teamOverview.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          iconBg="bg-blue-100 text-blue-600"
          label="Total Players"
          value={totalPlayers}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          iconBg="bg-green-100 text-green-600"
          label="Total Matches"
          value={totalMatches}
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          iconBg="bg-purple-100 text-purple-600"
          label="Win Rate"
          value={`${overallWinRate}%`}
        />
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          iconBg="bg-amber-100 text-amber-600"
          label="Total Goals"
          value={totalGoals}
        />
      </div>

      {/* Team standings */}
      {teamOverview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Team Overview
            </CardTitle>
            <CardDescription>
              Performance summary across all teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-2">Team</th>
                    <th className="py-3 px-2 text-center">P</th>
                    <th className="py-3 px-2 text-center">W</th>
                    <th className="py-3 px-2 text-center">D</th>
                    <th className="py-3 px-2 text-center">L</th>
                    <th className="py-3 px-2 text-center">GF</th>
                    <th className="py-3 px-2 text-center">GA</th>
                    <th className="py-3 px-2 text-center">GD</th>
                    <th className="py-3 px-2 text-center">Players</th>
                    <th className="py-3 px-2 text-right">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {teamOverview.map((team) => {
                    const winPct =
                      team.matches > 0
                        ? Math.round((team.wins / team.matches) * 100)
                        : 0;
                    return (
                      <tr
                        key={team._id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {team.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {SPORT_LABELS[team.sport] || team.sport}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-medium">
                          {team.matches}
                        </td>
                        <td className="py-3 px-2 text-center text-green-600 font-medium">
                          {team.wins}
                        </td>
                        <td className="py-3 px-2 text-center text-amber-600 font-medium">
                          {team.draws}
                        </td>
                        <td className="py-3 px-2 text-center text-red-600 font-medium">
                          {team.losses}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {team.goalsFor}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {team.goalsAgainst}
                        </td>
                        <td
                          className={cn(
                            "py-3 px-2 text-center font-medium",
                            team.goalDiff > 0
                              ? "text-green-600"
                              : team.goalDiff < 0
                              ? "text-red-600"
                              : "text-gray-500"
                          )}
                        >
                          {team.goalDiff > 0 ? "+" : ""}
                          {team.goalDiff}
                        </td>
                        <td className="py-3 px-2 text-center">
                          {team.playerCount}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                              winPct >= 60
                                ? "bg-green-100 text-green-700"
                                : winPct >= 40
                                ? "bg-amber-100 text-amber-700"
                                : winPct > 0
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-500"
                            )}
                          >
                            {winPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly results chart */}
        {monthlyResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Monthly Match Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyResults}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "12px" }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="wins"
                    fill="#22c55e"
                    name="Wins"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="draws"
                    fill="#f59e0b"
                    name="Draws"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="losses"
                    fill="#ef4444"
                    name="Losses"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Attendance trend */}
        {attendanceTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-purple-500" />
                Attendance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Rate"]}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: "#8b5cf6", r: 4 }}
                    name="Attendance Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Second row: pie charts + top players */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event breakdown pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {eventBreakdown.trainings + eventBreakdown.matches === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No events yet
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={eventPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top scorers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-amber-500" />
              Top Scorers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topScorers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No match stats yet
              </p>
            ) : (
              <div className="space-y-2">
                {topScorers.slice(0, 5).map((p, i) => (
                  <div
                    key={p.playerId}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                        i === 0
                          ? "bg-amber-500"
                          : i === 1
                          ? "bg-gray-400"
                          : i === 2
                          ? "bg-amber-700"
                          : "bg-gray-300"
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.matches} matches
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {p.goals}
                      </p>
                      <p className="text-[10px] text-gray-400">goals</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top assists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-blue-500" />
              Top Assists
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topAssists.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No match stats yet
              </p>
            ) : (
              <div className="space-y-2">
                {topAssists.slice(0, 5).map((p, i) => (
                  <div
                    key={p.playerId}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white",
                        i === 0
                          ? "bg-blue-500"
                          : i === 1
                          ? "bg-gray-400"
                          : i === 2
                          ? "bg-blue-700"
                          : "bg-gray-300"
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.matches} matches
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {p.assists}
                      </p>
                      <p className="text-[10px] text-gray-400">assists</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Discipline summary */}
      {disciplineSummary.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Discipline Summary
            </CardTitle>
            <CardDescription>
              {disciplineSummary.total} total records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By severity */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  By Severity
                </p>
                <div className="space-y-2">
                  {Object.entries(disciplineSummary.bySeverity)
                    .filter(([, count]) => count > 0)
                    .map(([severity, count]) => (
                      <div
                        key={severity}
                        className="flex items-center justify-between"
                      >
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                            SEVERITY_COLORS[severity] ||
                              "bg-gray-100 text-gray-600"
                          )}
                        >
                          {severity}
                        </span>
                        <span className="text-sm font-medium text-gray-700">
                          {count}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
              {/* By type */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  By Type
                </p>
                <div className="space-y-2">
                  {Object.entries(disciplineSummary.byType)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600 capitalize">
                          {type.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-orange-500"
                              style={{
                                width: `${Math.min((count / disciplineSummary.total) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-6 text-right">
                            {count}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {teamOverview.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No data to analyze yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Create teams and start logging matches to see analytics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
