"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Trophy,
  ChevronRight,
  Loader2,
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

interface Team {
  _id: string;
  name: string;
  sport: string;
  inviteCode?: string;
  playerCount: number;
  createdAt: string;
  coachId: any;
}

const SPORT_ICONS: Record<string, string> = {
  football: "\u26BD",
  basketball: "\uD83C\uDFC0",
  volleyball: "\uD83C\uDFD0",
  american_football: "\uD83C\uDFC8",
};

const SPORT_LABELS: Record<string, string> = {
  football: "Football",
  basketball: "Basketball",
  volleyball: "Volleyball",
  american_football: "American Football",
};

const SPORT_COLORS: Record<string, string> = {
  football: "bg-green-500",
  basketball: "bg-orange-500",
  volleyball: "bg-blue-500",
  american_football: "bg-red-500",
};

export default function DashboardPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) {
        setError("Failed to load teams");
        return;
      }
      const data = await res.json();
      setTeams(data);
    } catch {
      setError("Failed to load teams");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            My Teams
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {teams.length === 0
              ? "Create your first team to get started"
              : `You have ${teams.length} team${teams.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <CreateTeamDialog onCreated={fetchTeams} />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {teams.length === 0 && !error ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              No teams yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 text-center max-w-sm">
              Create a team to start managing players, scheduling trainings, and
              tracking progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team._id} href={`/dashboard/teams/${team._id}`}>
              <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-blue-300">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                      SPORT_COLORS[team.sport] || "bg-gray-500"
                    } text-2xl`}
                  >
                    {SPORT_ICONS[team.sport] || "\uD83C\uDFC6"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{team.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {SPORT_LABELS[team.sport] || team.sport}
                    </CardDescription>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>
                        {team.playerCount}{" "}
                        {team.playerCount === 1 ? "player" : "players"}
                      </span>
                    </div>
                    {team.inviteCode && (
                      <div className="ml-auto font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                        {team.inviteCode}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
