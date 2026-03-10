"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EventData } from "./event-card";

interface EventFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pre-selected event type (for "new" flow) */
  defaultType: "training" | "match";
  /** If editing, pass existing event */
  editEvent?: EventData | null;
  /** Available teams for the coach */
  teams: { _id: string; name: string }[];
}

export function EventFormDialog({
  open,
  onClose,
  onSaved,
  defaultType,
  editEvent,
  teams,
}: EventFormDialogProps) {
  const isEdit = !!editEvent;

  const [type, setType] = useState<"training" | "match">(defaultType);
  const [teamId, setTeamId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [opponent, setOpponent] = useState("");
  const [homeAway, setHomeAway] = useState<"home" | "away" | "neutral">("home");
  const [notes, setNotes] = useState("");
  const [scoreHome, setScoreHome] = useState<number | "">("");
  const [scoreAway, setScoreAway] = useState<number | "">("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Populate fields when editing
  useEffect(() => {
    if (editEvent) {
      setType(editEvent.type);
      setTeamId(typeof editEvent.teamId === "object" ? editEvent.teamId._id : editEvent.teamId);
      setTitle(editEvent.title);
      setDescription(editEvent.description || "");
      const d = new Date(editEvent.date);
      setDate(d.toISOString().split("T")[0]);
      setTime(d.toTimeString().slice(0, 5));
      if (editEvent.endDate) {
        const ed = new Date(editEvent.endDate);
        setEndTime(ed.toTimeString().slice(0, 5));
      } else {
        setEndTime("");
      }
      setLocation(editEvent.location || "");
      setOpponent(editEvent.opponent || "");
      setHomeAway(editEvent.homeAway || "home");
      setNotes(editEvent.notes || "");
      setScoreHome(editEvent.scoreHome ?? "");
      setScoreAway(editEvent.scoreAway ?? "");
    } else {
      // Reset form for new event
      setType(defaultType);
      setTeamId(teams.length === 1 ? teams[0]._id : "");
      setTitle("");
      setDescription("");
      setDate("");
      setTime("");
      setEndTime("");
      setLocation("");
      setOpponent("");
      setHomeAway("home");
      setNotes("");
      setScoreHome("");
      setScoreAway("");
    }
    setError("");
  }, [editEvent, open, defaultType, teams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!teamId) {
      setError("Please select a team");
      return;
    }
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!date || !time) {
      setError("Date and time are required");
      return;
    }

    setLoading(true);
    try {
      const dateTime = new Date(`${date}T${time}`);
      const endDateTime = endTime
        ? new Date(`${date}T${endTime}`)
        : undefined;

      const body: any = {
        teamId,
        type,
        title: title.trim(),
        description: description.trim(),
        date: dateTime.toISOString(),
        endDate: endDateTime?.toISOString(),
        location: location.trim(),
        notes: notes.trim(),
      };

      if (type === "match") {
        body.opponent = opponent.trim();
        body.homeAway = homeAway;
        if (isEdit && scoreHome !== "") body.scoreHome = Number(scoreHome);
        if (isEdit && scoreAway !== "") body.scoreAway = Number(scoreAway);
      }

      const url = isEdit ? `/api/events/${editEvent!._id}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save event");
        return;
      }

      onSaved();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>
                {isEdit ? "Edit Event" : `Schedule ${type === "match" ? "Match" : "Training"}`}
              </CardTitle>
              <CardDescription>
                {isEdit
                  ? "Update event details"
                  : type === "match"
                  ? "Create a match event with opponent details"
                  : "Schedule a training session for your team"}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              {/* Type toggle (only for new events) */}
              {!isEdit && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Event Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType("training")}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        type === "training"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      🏋️ Training
                    </button>
                    <button
                      type="button"
                      onClick={() => setType("match")}
                      className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                        type === "match"
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      ⚔️ Match
                    </button>
                  </div>
                </div>
              )}

              {/* Team select */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  required
                  disabled={isEdit}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                >
                  <option value="">Select team...</option>
                  {teams.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    type === "match"
                      ? "e.g. League Match Day 5"
                      : "e.g. Tactical Session"
                  }
                  required
                />
              </div>

              {/* Opponent (match only) */}
              {type === "match" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Opponent
                    </label>
                    <Input
                      value={opponent}
                      onChange={(e) => setOpponent(e.target.value)}
                      placeholder="e.g. Red Lions FC"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Home / Away
                    </label>
                    <select
                      value={homeAway}
                      onChange={(e) =>
                        setHomeAway(e.target.value as "home" | "away" | "neutral")
                      }
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="home">Home</option>
                      <option value="away">Away</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Score (only when editing a match) */}
              {type === "match" && isEdit && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Final Score
                  </label>
                  <div className="grid grid-cols-5 gap-2 items-center">
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={0}
                        value={scoreHome}
                        onChange={(e) =>
                          setScoreHome(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Home"
                        className="text-center font-bold"
                      />
                      <p className="text-xs text-gray-400 text-center mt-1">Home</p>
                    </div>
                    <div className="text-center text-lg font-bold text-gray-400">–</div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min={0}
                        value={scoreAway}
                        onChange={(e) =>
                          setScoreAway(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Away"
                        className="text-center font-bold"
                      />
                      <p className="text-xs text-gray-400 text-center mt-1">Away</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Location
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. City Stadium, Field 3"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Event details..."
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Additional notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Coach Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the team..."
                  className="flex min-h-[60px] w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Saving..."
                  : isEdit
                  ? "Update Event"
                  : `Schedule ${type === "match" ? "Match" : "Training"}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}


