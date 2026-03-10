"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Trophy,
  Plus,
  Loader2,
  Users,
  Calendar,
  ChevronRight,
  Swords,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CreateTournamentDialog } from "@/components/tournament/create-tournament-dialog";

interface TeamRef {
  _id: string;
  name: string;
  sport: string;
}

interface Tournament {
  _id: string;
  name: string;
  sport: string;
  format: "groups_knockout" | "league" | "knockout";
  status: "draft" | "group_stage" | "knockout" | "completed";
  description: string;
  teamIds: TeamRef[];
  createdBy: { _id: string; name: string };
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

const FORMAT_LABELS: Record<string, string> = {
  groups_knockout: "Groups + Knockout",
  league: "League",
  knockout: "Knockout",
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  group_stage: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "Group Stage",
  },
  knockout: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    label: "Knockout",
  },
  completed: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Completed",
  },
};

const SPORT_COLORS: Record<string, string> = {
  football: "from-green-500 to-emerald-600",
  basketball: "from-orange-500 to-red-500",
  volleyball: "from-yellow-500 to-amber-600",
  american_football: "from-blue-600 to-indigo-700",
};

const SPORT_ICONS: Record<string, string> = {
  football: "⚽",
  basketball: "🏀",
  volleyball: "🏐",
  american_football: "🏈",
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterSport, setFilterSport] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = useCallback(async () => {
    try {
      const [tourRes, meRes] = await Promise.all([
        fetch("/api/tournaments"),
        fetch("/api/auth/me"),
      ]);

      if (tourRes.ok) {
        const data = await tourRes.json();
        setTournaments(data);
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        setIsAdmin(meData.user.role === "admin");
      }
    } catch (err) {
      console.error("Failed to fetch tournaments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = tournaments.filter((t) => {
    if (filterSport !== "all" && t.sport !== filterSport) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    return true;
  });

  const activeTournaments = filtered.filter((t) => t.status !== "completed");
  const completedTournaments = filtered.filter(
    (t) => t.status === "completed"
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" />
            Tournaments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Competitive tournaments with automatic standings
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            <Plus className="h-4 w-4" />
            Create Tournament
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        >
          <option value="all">All Sports</option>
          <option value="football">Football</option>
          <option value="basketball">Basketball</option>
          <option value="volleyball">Volleyball</option>
          <option value="american_football">American Football</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="group_stage">Group Stage</option>
          <option value="knockout">Knockout</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* No tournaments */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trophy className="h-16 w-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">
              No tournaments yet
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {isAdmin
                ? "Create your first tournament to get started!"
                : "No tournaments are available at the moment."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active Tournaments */}
      {activeTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Swords className="h-5 w-5 text-amber-500" />
            Active Tournaments
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeTournaments.map((t) => (
              <TournamentCard key={t._id} tournament={t} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tournaments */}
      {completedTournaments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Completed
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedTournaments.map((t) => (
              <TournamentCard key={t._id} tournament={t} />
            ))}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      {isAdmin && (
        <CreateTournamentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreated={fetchData}
        />
      )}
    </div>
  );
}

/* ─── Tournament Card Component ─── */

function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  const statusStyle = STATUS_STYLES[t.status] || STATUS_STYLES.draft;
  const gradientClass =
    SPORT_COLORS[t.sport] || "from-gray-500 to-gray-600";
  const sportIcon = SPORT_ICONS[t.sport] || "🏆";

  return (
    <Link href={`/dashboard/tournaments/${t._id}`}>
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group">
        {/* Gradient header */}
        <div
          className={`bg-gradient-to-r ${gradientClass} p-4 relative overflow-hidden`}
        >
          <div className="absolute top-2 right-3 text-4xl opacity-20 group-hover:opacity-30 transition-opacity">
            {sportIcon}
          </div>
          <h3 className="text-lg font-bold text-white truncate pr-10">
            {t.name}
          </h3>
          <p className="text-sm text-white/80 mt-0.5 capitalize">
            {t.sport.replace("_", " ")} • {FORMAT_LABELS[t.format]}
          </p>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusStyle.label}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </div>

          {/* Info */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {t.teamIds.length} teams
            </span>
            {t.startDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(t.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Teams preview */}
          {t.teamIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {t.teamIds.slice(0, 4).map((team) => (
                <span
                  key={team._id}
                  className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-200"
                >
                  {team.name}
                </span>
              ))}
              {t.teamIds.length > 4 && (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-400">
                  +{t.teamIds.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {t.description && (
            <p className="text-xs text-gray-400 truncate">{t.description}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
