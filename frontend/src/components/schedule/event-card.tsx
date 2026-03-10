"use client";

import {
  Calendar,
  Clock,
  MapPin,
  Swords,
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  BarChart3,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { useState } from "react";

export interface EventData {
  _id: string;
  teamId: string | { _id: string; name: string; sport?: string };
  awayTeamId?: string | { _id: string; name: string; sport?: string };
  type: "training" | "match";
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  opponent?: string;
  homeAway?: "home" | "away" | "neutral";
  scoreHome?: number;
  scoreAway?: number;
  tournamentId?: string;
  tournamentMatchNumber?: number;
  status: "scheduled" | "completed" | "cancelled";
  notes: string;
  createdBy?: { _id: string; name: string };
}

interface EventCardProps {
  event: EventData;
  isCoach: boolean;
  onEdit?: (event: EventData) => void;
  onDelete?: (eventId: string) => void;
  onStatusChange?: (eventId: string, status: string) => void;
}

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: "bg-blue-100", text: "text-blue-700", label: "Scheduled" },
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelled" },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EventCard({
  event,
  isCoach,
  onEdit,
  onDelete,
  onStatusChange,
}: EventCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const badge = STATUS_BADGES[event.status] || STATUS_BADGES.scheduled;
  const isPast = new Date(event.date) < new Date();
  const isMatch = event.type === "match";

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${
        event.status === "cancelled" ? "opacity-60" : ""
      }`}
    >
      {/* Colored top bar */}
      <div
        className={`h-1.5 ${
          isMatch ? "bg-red-500" : "bg-green-500"
        } ${event.status === "cancelled" ? "bg-gray-300" : ""}`}
      />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">
                {event.title}
              </h3>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
              >
                {badge.label}
              </span>
              {isMatch && (
                <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                  <Swords className="mr-1 h-3 w-3" />
                  Match
                </span>
              )}
              {event.tournamentId && (
                <Link
                  href={`/dashboard/tournaments/${event.tournamentId}`}
                  className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trophy className="mr-1 h-3 w-3" />
                  Tournament
                </Link>
              )}
            </div>

            {/* Opponent for matches */}
            {isMatch && event.opponent && (
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-sm font-medium text-gray-700">
                  vs {event.opponent}
                </span>
                {event.homeAway && (
                  <span className="text-xs text-gray-400 uppercase">
                    ({event.homeAway})
                  </span>
                )}
                {event.status === "completed" &&
                  event.scoreHome != null &&
                  event.scoreAway != null && (
                    <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-sm font-bold text-gray-800">
                      {event.scoreHome} – {event.scoreAway}
                    </span>
                  )}
              </div>
            )}

            {/* Date / Time / Location */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(event.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(event.date)}
                {event.endDate && ` – ${formatTime(event.endDate)}`}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <p className="text-sm text-gray-600">{event.description}</p>
            )}

            {/* Notes */}
            {event.notes && (
              <p className="text-xs italic text-gray-400 border-l-2 border-gray-200 pl-2">
                {event.notes}
              </p>
            )}

            {/* Quick action link to detail page */}
            <div className="flex items-center gap-3 pt-1">
              <Link
                href={`/dashboard/events/${event._id}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                Attendance
              </Link>
              {isMatch && (
                <Link
                  href={`/dashboard/events/${event._id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Match Stats
                </Link>
              )}
            </div>
          </div>

          {/* Coach actions menu */}
          {isCoach && (
            <div className="relative shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-8 z-40 w-44 rounded-lg border border-gray-200 bg-white shadow-lg py-1">
                    <Link
                      href={`/dashboard/events/${event._id}`}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Users className="h-3.5 w-3.5" /> Attendance & Stats
                    </Link>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit?.(event);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    {event.status === "scheduled" && (
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                        onClick={() => {
                          setMenuOpen(false);
                          onStatusChange?.(event._id, "completed");
                        }}
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Mark
                        Completed
                      </button>
                    )}
                    {event.status === "scheduled" && (
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                        onClick={() => {
                          setMenuOpen(false);
                          onStatusChange?.(event._id, "cancelled");
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel Event
                      </button>
                    )}
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete?.(event._id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
