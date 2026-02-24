"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventCard, type EventData } from "@/components/schedule/event-card";
import { EventFormDialog } from "@/components/schedule/event-form-dialog";

interface Team {
  _id: string;
  name: string;
}

export default function TrainingsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCoach, setIsCoach] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<EventData | null>(null);

  // Filter
  const [filterTeam, setFilterTeam] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = useCallback(async () => {
    try {
      // Fetch teams
      const teamsRes = await fetch("/api/teams");
      if (!teamsRes.ok) return;
      const teamsData: Team[] = await teamsRes.json();
      setTeams(teamsData);

      // Check if coach (if user owns teams)
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setIsCoach(meData.user.role === "coach" || meData.user.role === "admin");
      }

      // Fetch trainings for all teams
      const allEvents: EventData[] = [];
      await Promise.all(
        teamsData.map(async (team) => {
          try {
            const res = await fetch(
              `/api/events?teamId=${team._id}&type=training`
            );
            if (res.ok) {
              const data = await res.json();
              allEvents.push(...data);
            }
          } catch {
            // skip
          }
        })
      );

      // Sort by date ascending
      allEvents.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEvents(allEvents);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(eventId: string) {
    if (!confirm("Delete this training session?")) return;
    const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
    if (res.ok) fetchData();
  }

  async function handleStatusChange(eventId: string, status: string) {
    const res = await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchData();
  }

  function handleEdit(event: EventData) {
    setEditEvent(event);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditEvent(null);
    setDialogOpen(true);
  }

  // Filter events
  const filtered = events.filter((e) => {
    if (filterTeam !== "all" && e.teamId !== filterTeam) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    return true;
  });

  // Separate upcoming vs past
  const now = new Date();
  const upcoming = filtered.filter(
    (e) => new Date(e.date) >= now && e.status === "scheduled"
  );
  const past = filtered.filter(
    (e) => new Date(e.date) < now || e.status !== "scheduled"
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Trainings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {upcoming.length} upcoming session{upcoming.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isCoach && (
          <Button onClick={handleNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Schedule Training
          </Button>
        )}
      </div>

      {/* Filters */}
      {teams.length > 1 && (
        <div className="flex gap-3 flex-wrap">
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="all">All teams</option>
            {teams.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
              <Dumbbell className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              No trainings scheduled
            </h3>
            <p className="mt-1 text-sm text-gray-500 text-center max-w-sm">
              {isCoach
                ? 'Click "Schedule Training" to create your first session.'
                : "Your coach hasn't scheduled any trainings yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map((ev) => (
                  <EventCard
                    key={ev._id}
                    event={ev}
                    isCoach={isCoach}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past / Completed */}
          {past.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                Past & Completed
              </h2>
              <div className="space-y-3">
                {past.map((ev) => (
                  <EventCard
                    key={ev._id}
                    event={ev}
                    isCoach={isCoach}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <EventFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditEvent(null);
        }}
        onSaved={fetchData}
        defaultType="training"
        editEvent={editEvent}
        teams={teams}
      />
    </div>
  );
}
