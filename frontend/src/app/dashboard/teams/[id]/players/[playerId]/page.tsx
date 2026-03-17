"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, User, Award, AlertTriangle, Plus, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadarChart } from "@/components/player/radar-chart";
import { BadgeUI } from "@/components/ui/badge-ui";
import { AwardBadgeDialog } from "@/components/badges/award-badge-dialog";
import { AddDisciplineDialog } from "@/components/discipline/add-record-dialog";

interface PlayerBadgeData {
  _id: string;
  badgeId: { _id: string; name: string; description: string; icon: string; category: string; color: string };
  awardedBy: { name: string };
  awardedAt: string;
  note?: string;
}

interface DisciplineRecord {
  _id: string;
  violationType: string;
  severity: string;
  description: string;
  date: string;
  eventId?: { _id: string; title: string; opponent?: string };
  resolved: boolean;
  fineAmount?: number;
  suspensionDays?: number;
}

const VIOLATION_LABELS: Record<string, string> = {
  yellow_card: "Yellow Card", red_card: "Red Card", warning: "Warning",
  verbal_warning: "Verbal Warning", fine: "Fine", suspension: "Suspension",
  unexcused_absence: "Unexcused Absence", late_arrival: "Late Arrival",
  misconduct: "Misconduct", other: "Other",
};

const SEV_CONFIG: Record<string, { variant: "success" | "warning" | "destructive"; label: string }> = {
  low: { variant: "success", label: "Low" },
  medium: { variant: "warning", label: "Medium" },
  high: { variant: "destructive", label: "High" },
  critical: { variant: "destructive", label: "Critical" },
};

/* ───── Types ───── */
interface PlayerStats {
  acceleration: number;
  sprintSpeed: number;
  positioning: number;
  finishing: number;
  shotPower: number;
  longShots: number;
  volleys: number;
  penalties: number;
  vision: number;
  crossing: number;
  fkAccuracy: number;
  shortPassing: number;
  longPassing: number;
  curve: number;
  agility: number;
  balance: number;
  reactions: number;
  ballControl: number;
  dribbling: number;
  composure: number;
  interceptions: number;
  headingAccuracy: number;
  marking: number;
  standTackle: number;
  slideTackle: number;
  jumping: number;
  stamina: number;
  strength: number;
  aggression: number;
}

interface PlayerProfile {
  _id: string;
  userId: { _id: string; name: string; email: string; avatar?: string };
  teamId: string;
  position: string;
  jerseyNumber?: number;
  status: string;
  nationality: string;
  age?: number;
  height?: number;
  weight?: number;
  preferredFoot: string;
  stats: PlayerStats;
  isCoach: boolean;
  joinedAt: string;
}

/* ───── Stat groupings for display ───── */
const STAT_GROUPS: {
  label: string;
  color: string;
  keys: { key: keyof PlayerStats; label: string }[];
}[] = [
  {
    label: "Pace",
    color: "bg-green-500",
    keys: [
      { key: "acceleration", label: "Acceleration" },
      { key: "sprintSpeed", label: "Sprint Speed" },
    ],
  },
  {
    label: "Shooting",
    color: "bg-red-500",
    keys: [
      { key: "positioning", label: "Att. Position" },
      { key: "finishing", label: "Finishing" },
      { key: "shotPower", label: "Shot Power" },
      { key: "longShots", label: "Long Shots" },
      { key: "volleys", label: "Volleys" },
      { key: "penalties", label: "Penalties" },
    ],
  },
  {
    label: "Passing",
    color: "bg-blue-500",
    keys: [
      { key: "vision", label: "Vision" },
      { key: "crossing", label: "Crossing" },
      { key: "fkAccuracy", label: "FK Accuracy" },
      { key: "shortPassing", label: "Short Pass" },
      { key: "longPassing", label: "Long Pass" },
      { key: "curve", label: "Curve" },
    ],
  },
  {
    label: "Dribbling",
    color: "bg-amber-500",
    keys: [
      { key: "agility", label: "Agility" },
      { key: "balance", label: "Balance" },
      { key: "reactions", label: "Reactions" },
      { key: "ballControl", label: "Ball Control" },
      { key: "dribbling", label: "Dribbling" },
      { key: "composure", label: "Composure" },
    ],
  },
  {
    label: "Defending",
    color: "bg-indigo-500",
    keys: [
      { key: "interceptions", label: "Interceptions" },
      { key: "headingAccuracy", label: "Heading Acc." },
      { key: "marking", label: "Marking" },
      { key: "standTackle", label: "Stand Tackle" },
      { key: "slideTackle", label: "Slide Tackle" },
    ],
  },
  {
    label: "Physical",
    color: "bg-orange-500",
    keys: [
      { key: "jumping", label: "Jumping" },
      { key: "stamina", label: "Stamina" },
      { key: "strength", label: "Strength" },
      { key: "aggression", label: "Aggression" },
    ],
  },
];

/* ───── Default stats (all 50) ───── */
const DEFAULT_STATS: PlayerStats = {
  acceleration: 50, sprintSpeed: 50,
  positioning: 50, finishing: 50, shotPower: 50, longShots: 50, volleys: 50, penalties: 50,
  vision: 50, crossing: 50, fkAccuracy: 50, shortPassing: 50, longPassing: 50, curve: 50,
  agility: 50, balance: 50, reactions: 50, ballControl: 50, dribbling: 50, composure: 50,
  interceptions: 50, headingAccuracy: 50, marking: 50, standTackle: 50, slideTackle: 50,
  jumping: 50, stamina: 50, strength: 50, aggression: 50,
};

/** Merge incoming (possibly partial / undefined) stats with safe defaults */
function safeStats(raw: Partial<PlayerStats> | undefined | null): PlayerStats {
  if (!raw) return { ...DEFAULT_STATS };
  return { ...DEFAULT_STATS, ...raw };
}

/* ───── Compute radar values ───── */
function computeRadar(s: PlayerStats) {
  const avg = (...vals: number[]) =>
    Math.round(vals.reduce((a, b) => a + (b ?? 50), 0) / vals.length);

  return {
    ATT: avg(s.positioning, s.finishing, s.shotPower, s.longShots, s.volleys),
    TEC: avg(s.ballControl, s.dribbling, s.shortPassing, s.longPassing, s.vision, s.crossing),
    STA: avg(s.stamina, s.agility, s.balance, s.reactions, s.composure),
    DEF: avg(s.marking, s.standTackle, s.slideTackle, s.interceptions, s.headingAccuracy),
    POW: avg(s.strength, s.aggression, s.jumping, s.shotPower),
    SPD: avg(s.acceleration, s.sprintSpeed, s.agility),
  };
}

/* ───── Stat value color ───── */
function statColor(v: number): string {
  if (v >= 80) return "text-red-600 font-bold";
  if (v >= 70) return "text-amber-600 font-semibold";
  return "text-gray-700";
}

/* ───── Component ───── */
export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.id as string;
  const playerId = params.playerId as string;

  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [badges, setBadges] = useState<PlayerBadgeData[]>([]);
  const [disciplineRecords, setDisciplineRecords] = useState<DisciplineRecord[]>([]);
  const [showBadgeDialog, setShowBadgeDialog] = useState(false);
  const [showDisciplineDialog, setShowDisciplineDialog] = useState(false);
  const [teams, setTeams] = useState<{ _id: string; name: string }[]>([]);

  // Editable state
  const [editBio, setEditBio] = useState({
    nationality: "",
    age: "",
    height: "",
    weight: "",
    preferredFoot: "R",
    position: "",
    jerseyNumber: "",
  });
  const [editStats, setEditStats] = useState<PlayerStats | null>(null);

  const fetchPlayer = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/players/${playerId}`);
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to load player");
        return;
      }
      const data: PlayerProfile = await res.json();
      setPlayer(data);
    } catch {
      setError("Failed to load player profile");
    } finally {
      setLoading(false);
    }
  }, [teamId, playerId]);

  const fetchBadges = useCallback(async () => {
    try {
      const res = await fetch(`/api/badges/player/${playerId}`);
      if (res.ok) setBadges(await res.json());
    } catch { /* skip */ }
  }, [playerId]);

  const fetchDiscipline = useCallback(async () => {
    try {
      const res = await fetch(`/api/discipline?playerId=${playerId}`);
      if (res.ok) setDisciplineRecords(await res.json());
    } catch { /* skip */ }
  }, [playerId]);

  useEffect(() => {
    fetchPlayer();
    fetchBadges();
    fetchDiscipline();
    fetch("/api/teams").then((r) => r.json()).then(setTeams).catch(() => {});
  }, [fetchPlayer, fetchBadges, fetchDiscipline]);

  function startEditing() {
    if (!player) return;
    setEditBio({
      nationality: player.nationality || "",
      age: player.age?.toString() || "",
      height: player.height?.toString() || "",
      weight: player.weight?.toString() || "",
      preferredFoot: player.preferredFoot || "R",
      position: player.position || "",
      jerseyNumber: player.jerseyNumber?.toString() || "",
    });
    setEditStats({ ...safeStats(player.stats) });
    setEditing(true);
  }

  function handleStatChange(key: keyof PlayerStats, value: string) {
    if (!editStats) return;
    const num = parseInt(value);
    if (value === "") {
      setEditStats({ ...editStats, [key]: 0 });
    } else if (!isNaN(num) && num >= 0 && num <= 99) {
      setEditStats({ ...editStats, [key]: num });
    }
  }

  async function handleSave() {
    if (!editStats) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/players/${playerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: editBio.position,
          jerseyNumber: editBio.jerseyNumber ? parseInt(editBio.jerseyNumber) : undefined,
          nationality: editBio.nationality,
          age: editBio.age ? parseInt(editBio.age) : undefined,
          height: editBio.height ? parseInt(editBio.height) : undefined,
          weight: editBio.weight ? parseInt(editBio.weight) : undefined,
          preferredFoot: editBio.preferredFoot,
          stats: editStats,
        }),
      });
      if (res.ok) {
        setEditing(false);
        fetchPlayer();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/teams/${teamId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to team
        </Button>
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
          {error || "Player not found"}
        </div>
      </div>
    );
  }

  const playerStats = safeStats(player.stats);
  const radar = computeRadar(editing && editStats ? editStats : playerStats);
  const displayStats = editing && editStats ? editStats : playerStats;

  const initials = player.userId.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Overall rating (average of 6 radar categories)
  const overall = Math.round(
    (radar.ATT + radar.TEC + radar.STA + radar.DEF + radar.POW + radar.SPD) / 6
  );

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/teams/${teamId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to team
        </Button>
        {player.isCoach && !editing && (
          <Button size="sm" onClick={startEditing} className="gap-2">
            Edit Profile & Stats
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </div>

      {/* Player Header */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-2xl font-bold text-white shadow-lg">
            {initials}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow">
            {overall}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {player.userId.name}
          </h1>
          <p className="text-sm text-gray-500">{player.userId.email}</p>
          <div className="mt-1 flex items-center gap-2">
            {player.jerseyNumber && (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                #{player.jerseyNumber}
              </span>
            )}
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {player.position}
            </span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                player.status === "active"
                  ? "bg-green-100 text-green-700"
                  : player.status === "injured"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {player.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column — Radar + Bio */}
        <div className="space-y-6">
          {/* Radar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Player Rating</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <RadarChart values={radar} size={280} />
            </CardContent>
            {/* Radar category values */}
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-2 text-center">
                {(Object.entries(radar) as [string, number][]).map(
                  ([key, val]) => (
                    <div
                      key={key}
                      className="rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <p className="text-xs font-medium text-gray-500">
                        {key}
                      </p>
                      <p
                        className={`text-lg font-bold ${
                          val >= 80
                            ? "text-red-600"
                            : val >= 60
                            ? "text-amber-600"
                            : "text-gray-700"
                        }`}
                      >
                        {val}
                      </p>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bio info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Player Info</CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Nationality
                    </label>
                    <Input
                      value={editBio.nationality}
                      onChange={(e) =>
                        setEditBio({ ...editBio, nationality: e.target.value })
                      }
                      placeholder="e.g. Portugal"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Age
                    </label>
                    <Input
                      value={editBio.age}
                      onChange={(e) =>
                        setEditBio({ ...editBio, age: e.target.value })
                      }
                      type="number"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Height (cm)
                    </label>
                    <Input
                      value={editBio.height}
                      onChange={(e) =>
                        setEditBio({ ...editBio, height: e.target.value })
                      }
                      type="number"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Weight (kg)
                    </label>
                    <Input
                      value={editBio.weight}
                      onChange={(e) =>
                        setEditBio({ ...editBio, weight: e.target.value })
                      }
                      type="number"
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Preferred Foot
                    </label>
                    <select
                      value={editBio.preferredFoot}
                      onChange={(e) =>
                        setEditBio({ ...editBio, preferredFoot: e.target.value })
                      }
                      className="h-9 w-full rounded-md border border-gray-300 bg-gray-50 px-3 text-sm"
                    >
                      <option value="R">Right</option>
                      <option value="L">Left</option>
                      <option value="Both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Position
                    </label>
                    <Input
                      value={editBio.position}
                      onChange={(e) =>
                        setEditBio({ ...editBio, position: e.target.value })
                      }
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Jersey #
                    </label>
                    <Input
                      value={editBio.jerseyNumber}
                      onChange={(e) =>
                        setEditBio({ ...editBio, jerseyNumber: e.target.value })
                      }
                      type="number"
                      className="h-9"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <BioRow label="Nationality" value={player.nationality || "—"} />
                  <BioRow label="Age" value={player.age?.toString() || "—"} />
                  <BioRow
                    label="Height"
                    value={player.height ? `${player.height} cm` : "—"}
                  />
                  <BioRow
                    label="Weight"
                    value={player.weight ? `${player.weight} kg` : "—"}
                  />
                  <BioRow
                    label="Preferred Foot"
                    value={
                      player.preferredFoot === "R"
                        ? "Right"
                        : player.preferredFoot === "L"
                        ? "Left"
                        : "Both"
                    }
                  />
                  <BioRow
                    label="Joined"
                    value={new Date(player.joinedAt).toLocaleDateString()}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — Detailed stats */}
        <div className="space-y-4">
          {STAT_GROUPS.map((group) => (
            <Card key={group.label}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${group.color}`} />
                  <CardTitle className="text-sm">{group.label}</CardTitle>
                  {!editing && (
                    <span className="ml-auto text-sm font-bold text-gray-600">
                      {Math.round(
                        group.keys.reduce(
                          (sum, k) => sum + (displayStats[k.key] ?? 50),
                          0
                        ) / group.keys.length
                      )}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {group.keys.map(({ key, label }) => {
                  const val = displayStats[key] ?? 50;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-gray-500">
                        {label}
                      </span>
                      {editing ? (
                        <Input
                          value={editStats ? editStats[key].toString() : "50"}
                          onChange={(e) => handleStatChange(key, e.target.value)}
                          type="number"
                          min={0}
                          max={99}
                          className="h-7 w-16 text-center text-sm"
                        />
                      ) : (
                        <>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                val >= 80
                                  ? "bg-red-500"
                                  : val >= 70
                                  ? "bg-amber-400"
                                  : val >= 50
                                  ? "bg-green-400"
                                  : "bg-gray-300"
                              }`}
                              style={{ width: `${(val / 99) * 100}%` }}
                            />
                          </div>
                          <span
                            className={`w-8 text-right text-sm ${statColor(val)}`}
                          >
                            {val}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Badges & Achievements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-5 w-5 text-amber-500" />
            Badges & Achievements ({badges.length})
          </CardTitle>
          {player.isCoach && (
            <Button size="sm" variant="outline" onClick={() => setShowBadgeDialog(true)} className="gap-1">
              <Plus className="h-3 w-3" /> Award Badge
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {badges.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No badges earned yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((pb) => (
                <div key={pb._id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300 transition-colors">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${pb.badgeId.color} text-xl`}>
                    {pb.badgeId.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{pb.badgeId.name}</p>
                    <p className="text-xs text-gray-500">{pb.badgeId.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Awarded by {pb.awardedBy.name} on {new Date(pb.awardedAt).toLocaleDateString()}
                    </p>
                    {pb.note && <p className="text-xs italic text-gray-400 mt-0.5">&quot;{pb.note}&quot;</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discipline History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Discipline History ({disciplineRecords.length})
          </CardTitle>
          {player.isCoach && (
            <Button size="sm" variant="outline" onClick={() => setShowDisciplineDialog(true)} className="gap-1">
              <Plus className="h-3 w-3" /> Record Violation
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {disciplineRecords.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">Clean record — no disciplinary actions</p>
          ) : (
            <div className="space-y-3">
              {disciplineRecords.map((dr) => {
                const sev = SEV_CONFIG[dr.severity] || SEV_CONFIG.low;
                return (
                  <div key={dr._id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${dr.resolved ? "bg-green-100" : "bg-red-100"}`}>
                      {dr.resolved ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-red-600" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{VIOLATION_LABELS[dr.violationType] || dr.violationType}</span>
                        <BadgeUI variant={sev.variant}>{sev.label}</BadgeUI>
                        {dr.resolved ? <BadgeUI variant="success">Resolved</BadgeUI> : <BadgeUI variant="warning">Pending</BadgeUI>}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{dr.description}</p>
                      <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-400">
                        <span>{new Date(dr.date).toLocaleDateString()}</span>
                        {dr.eventId && <span>Match: {dr.eventId.title || `vs ${dr.eventId.opponent}`}</span>}
                        {dr.fineAmount != null && <span>Fine: ${dr.fineAmount}</span>}
                        {dr.suspensionDays != null && <span>Suspension: {dr.suspensionDays} days</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AwardBadgeDialog open={showBadgeDialog} onClose={() => setShowBadgeDialog(false)} onAwarded={fetchBadges} playerId={playerId} />
      <AddDisciplineDialog open={showDisciplineDialog} onClose={() => setShowDisciplineDialog(false)} onCreated={fetchDiscipline}
        teams={teams} preselectedPlayerId={playerId} preselectedTeamId={teamId} />
    </div>
  );
}

/* ───── Helper ───── */
function BioRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <span className="font-medium text-gray-500">{label}:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </>
  );
}

