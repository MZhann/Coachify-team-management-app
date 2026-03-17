"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "@/components/ui/dialog";

interface Badge { _id: string; name: string; description: string; icon: string; category: string; color: string; criteria: string; }

interface Props { open: boolean; onClose: () => void; onAwarded: () => void; playerId: string; }

const CATEGORY_LABELS: Record<string, string> = {
  performance: "Performance", discipline: "Discipline", attendance: "Attendance", leadership: "Leadership", special: "Special",
};

export function AwardBadgeDialog({ open, onClose, onAwarded, playerId }: Props) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [selectedBadge, setSelectedBadge] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    if (open) fetch("/api/badges").then((r) => r.json()).then(setBadges).catch(() => {});
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBadge) { setError("Please select a badge"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/badges/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, badgeId: selectedBadge, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to award badge"); return; }
      setSelectedBadge(""); setNote(""); setError(""); setFilterCategory("");
      onClose(); onAwarded();
    } catch { setError("Failed to award badge"); } finally { setLoading(false); }
  }

  const filtered = filterCategory ? badges.filter((b) => b.category === filterCategory) : badges;
  const categories = Array.from(new Set(badges.map((b) => b.category)));

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <DialogTitle>Award Badge</DialogTitle>
        <DialogDescription>Recognize this player with a badge for their achievements</DialogDescription>
      </DialogHeader>
      <DialogContent>
        <form id="badge-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFilterCategory("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!filterCategory ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>All</button>
            {categories.map((cat) => (
              <button key={cat} type="button" onClick={() => setFilterCategory(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterCategory === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {filtered.map((badge) => (
              <button key={badge._id} type="button" onClick={() => setSelectedBadge(badge._id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all ${selectedBadge === badge._id ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${badge.color} text-xl`}>{badge.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{badge.name}</p>
                  <p className="text-xs text-gray-500">{badge.description}</p>
                  <p className="mt-1 text-xs text-gray-400">Criteria: {badge.criteria}</p>
                </div>
              </button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this badge was awarded..." rows={2}
              className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </form>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="badge-form" disabled={loading || !selectedBadge}>{loading ? "Awarding..." : "Award Badge"}</Button>
      </DialogFooter>
    </Dialog>
  );
}
