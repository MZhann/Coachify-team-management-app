"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "@/components/ui/dialog";

interface Player { _id: string; userId: { name: string }; jerseyNumber?: number; }
interface EventData { _id: string; title: string; opponent?: string; date: string; }
interface Team { _id: string; name: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  teams: Team[];
  preselectedPlayerId?: string;
  preselectedTeamId?: string;
  preselectedEventId?: string;
}

const VIOLATION_TYPES = [
  { value: "yellow_card", label: "Yellow Card" },
  { value: "red_card", label: "Red Card" },
  { value: "warning", label: "Warning" },
  { value: "verbal_warning", label: "Verbal Warning" },
  { value: "fine", label: "Fine" },
  { value: "suspension", label: "Suspension" },
  { value: "unexcused_absence", label: "Unexcused Absence" },
  { value: "late_arrival", label: "Late Arrival" },
  { value: "misconduct", label: "Misconduct" },
  { value: "other", label: "Other" },
];

const SEVERITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function AddDisciplineDialog({ open, onClose, onCreated, teams, preselectedPlayerId, preselectedTeamId, preselectedEventId }: Props) {
  const [teamId, setTeamId] = useState(preselectedTeamId || "");
  const [playerId, setPlayerId] = useState(preselectedPlayerId || "");
  const [eventId, setEventId] = useState(preselectedEventId || "");
  const [violationType, setViolationType] = useState("yellow_card");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [fineAmount, setFineAmount] = useState("");
  const [suspensionDays, setSuspensionDays] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (teamId) {
      fetch(`/api/teams/${teamId}/players`).then((r) => r.json()).then(setPlayers).catch(() => {});
      fetch(`/api/events?teamId=${teamId}&type=match`).then((r) => r.json()).then(setEvents).catch(() => {});
    } else {
      setPlayers([]);
      setEvents([]);
    }
  }, [teamId]);

  useEffect(() => {
    if (preselectedTeamId) setTeamId(preselectedTeamId);
    if (preselectedPlayerId) setPlayerId(preselectedPlayerId);
    if (preselectedEventId) setEventId(preselectedEventId);
  }, [preselectedTeamId, preselectedPlayerId, preselectedEventId]);

  function resetForm() {
    if (!preselectedTeamId) setTeamId("");
    if (!preselectedPlayerId) setPlayerId("");
    if (!preselectedEventId) setEventId("");
    setViolationType("yellow_card");
    setSeverity("medium");
    setDescription("");
    setDate(new Date().toISOString().split("T")[0]);
    setFineAmount("");
    setSuspensionDays("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/discipline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId, playerId, eventId: eventId || undefined,
          violationType, severity, description, date,
          fineAmount: fineAmount ? parseFloat(fineAmount) : undefined,
          suspensionDays: suspensionDays ? parseInt(suspensionDays) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create record"); return; }
      resetForm();
      onClose();
      onCreated();
    } catch { setError("Failed to create record"); } finally { setLoading(false); }
  }

  const selectClass = "flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Record Disciplinary Action</DialogTitle>
        <DialogDescription>Log a violation, warning, or disciplinary action for a player</DialogDescription>
      </DialogHeader>
      <DialogContent>
        <form id="discipline-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Team *</label>
              <select value={teamId} onChange={(e) => setTeamId(e.target.value)} required className={selectClass}>
                <option value="">Select team</option>
                {teams.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Player *</label>
              <select value={playerId} onChange={(e) => setPlayerId(e.target.value)} required disabled={!teamId} className={selectClass}>
                <option value="">Select player</option>
                {players.map((p) => <option key={p._id} value={p._id}>{p.jerseyNumber ? `#${p.jerseyNumber} ` : ""}{p.userId?.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Match (optional)</label>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} disabled={!teamId} className={selectClass}>
              <option value="">No match linked</option>
              {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title} — {new Date(ev.date).toLocaleDateString()}</option>)}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Violation *</label>
              <select value={violationType} onChange={(e) => setViolationType(e.target.value)} required className={selectClass}>
                {VIOLATION_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Severity *</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} required className={selectClass}>
                {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the violation or incident..." required className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {(violationType === "fine" || violationType === "suspension") && (
            <div className="grid gap-4 sm:grid-cols-2">
              {violationType === "fine" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fine Amount ($)</label>
                  <Input type="number" min="0" step="0.01" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} placeholder="0.00" />
                </div>
              )}
              {violationType === "suspension" && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Suspension Days</label>
                  <Input type="number" min="1" value={suspensionDays} onChange={(e) => setSuspensionDays(e.target.value)} placeholder="1" />
                </div>
              )}
            </div>
          )}
        </form>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="discipline-form" disabled={loading}>{loading ? "Recording..." : "Record Violation"}</Button>
      </DialogFooter>
    </Dialog>
  );
}
