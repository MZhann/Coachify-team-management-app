"use client";

import { useEffect, useState } from "react";
import { Loader2, Trophy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TeamOption {
  _id: string;
  name: string;
  sport: string;
  coachId?: { name: string };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateTournamentDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [sport, setSport] = useState("football");
  const [format, setFormat] = useState<"groups_knockout" | "league" | "knockout">("groups_knockout");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [advancePerGroup, setAdvancePerGroup] = useState(2);

  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch teams when sport changes
  useEffect(() => {
    if (!open) return;
    setLoadingTeams(true);
    setSelectedTeamIds([]);
    fetch(`/api/tournaments/sports/teams?sport=${sport}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailableTeams(Array.isArray(data) ? data : []);
      })
      .catch(() => setAvailableTeams([]))
      .finally(() => setLoadingTeams(false));
  }, [sport, open]);

  function toggleTeam(id: string) {
    setSelectedTeamIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedTeamIds.length === availableTeams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(availableTeams.map((t) => t._id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Tournament name is required");
      return;
    }
    if (selectedTeamIds.length < 2) {
      setError("Select at least 2 teams");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sport,
          format,
          description: description.trim(),
          teamIds: selectedTeamIds,
          teamsPerGroup,
          advancePerGroup,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create tournament");
        return;
      }

      const tournament = await res.json();

      // Auto-generate fixtures
      const genRes = await fetch(`/api/tournaments/${tournament._id}/generate`, {
        method: "POST",
      });
      if (!genRes.ok) {
        const genData = await genRes.json();
        console.warn("Fixture generation:", genData.error);
      }

      setName("");
      setDescription("");
      setSelectedTeamIds([]);
      onOpenChange(false);
      onCreated();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl m-4">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            Create Tournament
          </h2>
          <p className="text-sm text-white/80 mt-0.5">
            Set up a competitive tournament for your teams
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tournament Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Champions League 2026"
              className="w-full"
            />
          </div>

          {/* Sport & Format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sport *
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="volleyball">Volleyball</option>
                <option value="american_football">American Football</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Format *
              </label>
              <select
                value={format}
                onChange={(e) =>
                  setFormat(e.target.value as typeof format)
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                <option value="groups_knockout">Groups + Knockout (UCL style)</option>
                <option value="league">League (Round Robin)</option>
                <option value="knockout">Knockout Only</option>
              </select>
            </div>
          </div>

          {/* Groups config (only for groups_knockout) */}
          {format === "groups_knockout" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teams Per Group
                </label>
                <Input
                  type="number"
                  min={2}
                  max={8}
                  value={teamsPerGroup}
                  onChange={(e) => setTeamsPerGroup(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Per Group
                </label>
                <Input
                  type="number"
                  min={1}
                  max={teamsPerGroup - 1}
                  value={advancePerGroup}
                  onChange={(e) => setAdvancePerGroup(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 resize-none"
            />
          </div>

          {/* Team Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Teams * ({selectedTeamIds.length} selected)
              </label>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
              >
                {selectedTeamIds.length === availableTeams.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {loadingTeams ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : availableTeams.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                No teams found for this sport. Create teams first.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {availableTeams.map((team) => {
                  const selected = selectedTeamIds.includes(team._id);
                  return (
                    <button
                      key={team._id}
                      type="button"
                      onClick={() => toggleTeam(team._id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                        selected
                          ? "bg-amber-50 border-2 border-amber-400 text-amber-800 font-medium"
                          : "bg-gray-50 border-2 border-transparent text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                          selected
                            ? "bg-amber-500 text-white"
                            : "bg-white border border-gray-300"
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate">{team.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create & Generate Fixtures
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

