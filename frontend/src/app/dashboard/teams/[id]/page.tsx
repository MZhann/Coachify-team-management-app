"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Copy,
  Check,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Shield,
  Trash2,
  Edit3,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface TeamDetail {
  _id: string;
  name: string;
  sport: string;
  inviteCode: string;
  playerCount: number;
  isCoach: boolean;
  coachId: any;
  createdAt: string;
}

interface Player {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  position: string;
  jerseyNumber?: number;
  status: string;
  joinedAt: string;
}

const SPORT_LABELS: Record<string, string> = {
  football: "Football",
  basketball: "Basketball",
  volleyball: "Volleyball",
  american_football: "American Football",
};

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

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Edit player state
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editPosition, setEditPosition] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const fetchTeam = useCallback(async () => {
    try {
      const [teamRes, playersRes] = await Promise.all([
        fetch(`/api/teams/${teamId}`),
        fetch(`/api/teams/${teamId}/players`),
      ]);

      if (!teamRes.ok) {
        const d = await teamRes.json();
        setError(d.error || "Failed to load team");
        return;
      }

      const teamData = await teamRes.json();
      setTeam(teamData);

      if (playersRes.ok) {
        const playersData = await playersRes.json();
        setPlayers(playersData);
      }
    } catch {
      setError("Failed to load team data");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  async function handleCopyCode() {
    if (!team) return;
    await navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRegenerateCode() {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/regenerate-code`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTeam((prev) => (prev ? { ...prev, inviteCode: data.inviteCode } : prev));
      }
    } finally {
      setRegenerating(false);
    }
  }

  async function handleEditPlayer(player: Player) {
    setEditingPlayer(player._id);
    setEditPosition(player.position);
    setEditJersey(player.jerseyNumber?.toString() || "");
    setEditStatus(player.status);
  }

  async function handleSavePlayer(playerId: string) {
    try {
      const res = await fetch(`/api/teams/${teamId}/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: editPosition,
          jerseyNumber: editJersey ? parseInt(editJersey) : undefined,
          status: editStatus,
        }),
      });

      if (res.ok) {
        setEditingPlayer(null);
        fetchTeam();
      }
    } catch {
      // Silently fail
    }
  }

  async function handleRemovePlayer(playerId: string) {
    if (!confirm("Are you sure you want to remove this player?")) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/players/${playerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTeam();
      }
    } catch {
      // Silently fail
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error || "Team not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      {/* Team Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 text-3xl">
            {SPORT_ICONS[team.sport] || "\uD83C\uDFC6"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
            <p className="text-sm text-gray-500">
              {SPORT_LABELS[team.sport] || team.sport} &middot;{" "}
              {team.playerCount} {team.playerCount === 1 ? "player" : "players"}
            </p>
          </div>
        </div>
      </div>

      {/* Invite Code Card — only for coaches */}
      {team.isCoach && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite Players</CardTitle>
            <CardDescription>
              Share this code with players so they can join your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-gray-100 px-4 py-3 font-mono text-2xl font-bold tracking-widest text-center text-gray-800">
                {team.inviteCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyCode}
                title="Copy code"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerateCode}
                disabled={regenerating}
                title="Generate new code"
              >
                <RefreshCw
                  className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Players List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                <Users className="inline h-5 w-5 mr-2" />
                Team Roster
              </CardTitle>
              <CardDescription>
                {players.length} {players.length === 1 ? "player" : "players"} in this team
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                No players yet.{" "}
                {team.isCoach
                  ? "Share the invite code above to get players to join."
                  : ""}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">#</th>
                    <th className="pb-3 font-medium">Player</th>
                    <th className="pb-3 font-medium">Position</th>
                    <th className="pb-3 font-medium">Jersey</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Joined</th>
                    {team.isCoach && (
                      <th className="pb-3 font-medium text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {players.map((player, idx) => (
                    <tr key={player._id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-400">{idx + 1}</td>
                      <td className="py-3">
                        <Link
                          href={`/dashboard/teams/${teamId}/players/${player._id}`}
                          className="flex items-center gap-3 group/player"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                            {player.userId.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 group-hover/player:text-blue-600 transition-colors">
                              {player.userId.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {player.userId.email}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="py-3">
                        {editingPlayer === player._id ? (
                          <Input
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                            className="h-8 w-28"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {player.position}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {editingPlayer === player._id ? (
                          <Input
                            value={editJersey}
                            onChange={(e) => setEditJersey(e.target.value)}
                            type="number"
                            className="h-8 w-16"
                          />
                        ) : (
                          <span className="text-gray-600">
                            {player.jerseyNumber ?? "—"}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {editingPlayer === player._id ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="h-8 rounded border border-gray-300 px-2 text-xs"
                          >
                            <option value="active">Active</option>
                            <option value="injured">Injured</option>
                            <option value="suspended">Suspended</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_COLORS[player.status] || "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {player.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-gray-500">
                        {new Date(player.joinedAt).toLocaleDateString()}
                      </td>
                      {team.isCoach && (
                        <td className="py-3 text-right">
                          {editingPlayer === player._id ? (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleSavePlayer(player._id)}
                                className="h-7 px-2 text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingPlayer(null)}
                                className="h-7 px-2 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1">
                              <Link href={`/dashboard/teams/${teamId}/players/${player._id}`}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                  title="View profile"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPlayer(player)}
                                className="h-7 w-7 p-0"
                                title="Edit"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemovePlayer(player._id)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

