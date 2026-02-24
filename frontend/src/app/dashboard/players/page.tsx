"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Loader2, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Team {
  _id: string;
  name: string;
  sport: string;
  playerCount: number;
}

interface Player {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  teamId: string;
  position: string;
  jerseyNumber?: number;
  status: string;
  joinedAt: string;
}

const SPORT_ICONS: Record<string, string> = {
  football: "\u26BD",
  basketball: "\uD83C\uDFC0",
  volleyball: "\uD83C\uDFD0",
  american_football: "\uD83C\uDFC8",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  injured: "bg-red-100 text-red-700",
  suspended: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-600",
};

export default function PlayersPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [playersByTeam, setPlayersByTeam] = useState<
    Record<string, Player[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const teamsRes = await fetch("/api/teams");
        if (!teamsRes.ok) return;
        const teamsData: Team[] = await teamsRes.json();
        setTeams(teamsData);

        // Fetch players for each team in parallel
        const results = await Promise.all(
          teamsData.map(async (team) => {
            try {
              const res = await fetch(`/api/teams/${team._id}/players`);
              if (res.ok) {
                const players = await res.json();
                return { teamId: team._id, players };
              }
            } catch {
              // Skip
            }
            return { teamId: team._id, players: [] };
          })
        );

        const map: Record<string, Player[]> = {};
        for (const r of results) {
          map[r.teamId] = r.players;
        }
        setPlayersByTeam(map);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalPlayers = Object.values(playersByTeam).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Players
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {totalPlayers} {totalPlayers === 1 ? "player" : "players"} across{" "}
          {teams.length} {teams.length === 1 ? "team" : "teams"}
        </p>
      </div>

      {teams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              No teams yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 text-center max-w-sm">
              Create a team first, then invite players with the team&apos;s invite code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => {
            const players = playersByTeam[team._id] || [];
            return (
              <Card key={team._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {SPORT_ICONS[team.sport] || "\uD83C\uDFC6"}
                      </span>
                      <div>
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        <CardDescription>
                          {players.length}{" "}
                          {players.length === 1 ? "player" : "players"}
                        </CardDescription>
                      </div>
                    </div>
                    <Link href={`/dashboard/teams/${team._id}`}>
                      <span className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                        View team
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {players.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">
                      No players in this team yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-left text-gray-500">
                            <th className="pb-2 font-medium">Player</th>
                            <th className="pb-2 font-medium">Position</th>
                            <th className="pb-2 font-medium">Jersey</th>
                            <th className="pb-2 font-medium">Status</th>
                            <th className="pb-2 font-medium">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {players.map((player) => (
                            <tr key={player._id} className="hover:bg-gray-50">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                    {player.userId.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900 text-sm">
                                      {player.userId.name}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 text-gray-600">
                                {player.position}
                              </td>
                              <td className="py-2.5 text-gray-600">
                                {player.jerseyNumber ?? "—"}
                              </td>
                              <td className="py-2.5">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    STATUS_COLORS[player.status] ||
                                    "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {player.status}
                                </span>
                              </td>
                              <td className="py-2.5 text-gray-500">
                                {new Date(
                                  player.joinedAt
                                ).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
