"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Filter, AlertTriangle, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeUI } from "@/components/ui/badge-ui";
import { AddDisciplineDialog } from "@/components/discipline/add-record-dialog";

interface DisciplineRecord {
  _id: string;
  playerId: { _id: string; userId: { name: string }; jerseyNumber?: number; position: string };
  eventId?: { _id: string; title: string; opponent?: string; date: string };
  teamId: { _id: string; name: string };
  violationType: string;
  severity: string;
  description: string;
  date: string;
  fineAmount?: number;
  suspensionDays?: number;
  resolved: boolean;
}

interface Team { _id: string; name: string; }

const VIOLATION_LABELS: Record<string, string> = {
  yellow_card: "Yellow Card", red_card: "Red Card", warning: "Warning",
  verbal_warning: "Verbal Warning", fine: "Fine", suspension: "Suspension",
  unexcused_absence: "Unexcused Absence", late_arrival: "Late Arrival",
  misconduct: "Misconduct", other: "Other",
};

const SEVERITY_CONFIG: Record<string, { variant: "success" | "warning" | "destructive"; label: string }> = {
  low: { variant: "success", label: "Low" },
  medium: { variant: "warning", label: "Medium" },
  high: { variant: "destructive", label: "High" },
  critical: { variant: "destructive", label: "Critical" },
};

export default function DisciplinePage() {
  const [records, setRecords] = useState<DisciplineRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [filterTeam, setFilterTeam] = useState("");
  const [filterResolved, setFilterResolved] = useState("");
  const [isCoach, setIsCoach] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterTeam) params.set("teamId", filterTeam);
      if (filterResolved) params.set("resolved", filterResolved);
      const res = await fetch(`/api/discipline?${params}`);
      if (res.ok) setRecords(await res.json());
    } catch (err) { console.error("Failed to fetch records:", err); }
    finally { setLoading(false); }
  }, [filterTeam, filterResolved]);

  useEffect(() => {
    fetch("/api/teams").then((r) => r.json()).then(setTeams).catch(() => {});
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      setIsCoach(d.user?.role === "coach" || d.user?.role === "admin");
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  async function handleResolve(id: string) {
    const res = await fetch(`/api/discipline/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true, resolvedDate: new Date().toISOString() }),
    });
    if (res.ok) fetchRecords();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this disciplinary record?")) return;
    const res = await fetch(`/api/discipline/${id}`, { method: "DELETE" });
    if (res.ok) fetchRecords();
  }

  const stats = {
    total: records.length,
    unresolved: records.filter((r) => !r.resolved).length,
    yellowCards: records.filter((r) => r.violationType === "yellow_card").length,
    redCards: records.filter((r) => r.violationType === "red_card").length,
  };

  const selectClass = "h-9 rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Discipline Log</h1>
          <p className="mt-1 text-sm text-gray-500">Track warnings, fouls, suspensions, and other disciplinary actions</p>
        </div>
        {isCoach && (
          <Button onClick={() => setShowDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Record Violation
          </Button>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard icon={<Clock className="h-5 w-5 text-blue-600" />} bg="bg-blue-100" value={stats.total} label="Total Records" />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-600" />} bg="bg-red-100" value={stats.unresolved} label="Unresolved" />
        <StatCard icon={<XCircle className="h-5 w-5 text-yellow-600" />} bg="bg-yellow-100" value={stats.yellowCards} label="Yellow Cards" />
        <StatCard icon={<XCircle className="h-5 w-5 text-red-700" />} bg="bg-red-100" value={stats.redCards} label="Red Cards" />
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className={selectClass}>
          <option value="">All Teams</option>
          {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </select>
        <select value={filterResolved} onChange={(e) => setFilterResolved(e.target.value)} className={selectClass}>
          <option value="">All Status</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>
      </div>

      <Card>
        <CardHeader><CardTitle>Discipline Records</CardTitle></CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="py-12 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-sm text-gray-500">No discipline records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Date</th>
                    <th className="pb-3 pr-4 font-medium">Player</th>
                    <th className="pb-3 pr-4 font-medium">Team</th>
                    <th className="pb-3 pr-4 font-medium">Violation</th>
                    <th className="pb-3 pr-4 font-medium">Severity</th>
                    <th className="pb-3 pr-4 font-medium">Match</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    {isCoach && <th className="pb-3 font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {records.map((r) => {
                    const sev = SEVERITY_CONFIG[r.severity] || SEVERITY_CONFIG.low;
                    const playerName = r.playerId?.userId?.name || "Unknown";
                    const jerseyNum = r.playerId?.jerseyNumber;
                    return (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="py-3 pr-4 whitespace-nowrap">{new Date(r.date).toLocaleDateString()}</td>
                        <td className="py-3 pr-4">
                          <span className="font-medium text-gray-900">
                            {jerseyNum ? `#${jerseyNum} ` : ""}{playerName}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{r.teamId?.name}</td>
                        <td className="py-3 pr-4">{VIOLATION_LABELS[r.violationType] || r.violationType}</td>
                        <td className="py-3 pr-4"><BadgeUI variant={sev.variant}>{sev.label}</BadgeUI></td>
                        <td className="py-3 pr-4">
                          {r.eventId ? (
                            <Link href={`/dashboard/events/${r.eventId._id}`} className="text-blue-600 hover:underline text-xs">
                              {r.eventId.title || `vs ${r.eventId.opponent}`}
                            </Link>
                          ) : <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className="py-3 pr-4">
                          {r.resolved
                            ? <BadgeUI variant="success"><CheckCircle className="mr-1 h-3 w-3" /> Resolved</BadgeUI>
                            : <BadgeUI variant="warning"><Clock className="mr-1 h-3 w-3" /> Pending</BadgeUI>
                          }
                        </td>
                        {isCoach && (
                          <td className="py-3">
                            <div className="flex gap-1">
                              {!r.resolved && <Button variant="outline" size="sm" onClick={() => handleResolve(r._id)}>Resolve</Button>}
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(r._id)}>Delete</Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddDisciplineDialog open={showDialog} onClose={() => setShowDialog(false)} onCreated={fetchRecords} teams={teams} />
    </div>
  );
}

function StatCard({ icon, bg, value, label }: { icon: React.ReactNode; bg: string; value: number; label: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
          <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-gray-500">{label}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}
