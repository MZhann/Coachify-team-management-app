"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JoinTeamDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to join team");
        return;
      }
      setSuccess(`Successfully joined "${data.team.name}"!`);
      setCode("");
      setTimeout(() => {
        setOpen(false);
        setSuccess("");
        router.push(`/dashboard/teams/${data.team._id}`);
        router.refresh();
      }, 1500);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="gap-2 w-full border-white/20 bg-transparent text-white hover:bg-coachify-sidebarHover hover:text-white"
      >
        <UserPlus className="h-4 w-4" />
        Join Team
      </Button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={() => {
          setOpen(false);
          setError("");
          setSuccess("");
        }}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 px-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Join a Team</CardTitle>
              <CardDescription>
                Enter the invite code provided by your coach
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setError("");
                setSuccess("");
              }}
            >
              Cancel
            </Button>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm font-medium text-green-700">{success}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                <div>
                  <label
                    htmlFor="invite-code"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Invite Code
                  </label>
                  <Input
                    id="invite-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A3F8B2C"
                    required
                    className="text-center font-mono text-lg tracking-widest uppercase"
                    maxLength={7}
                  />
                </div>
                <Button type="submit" disabled={loading || code.trim().length === 0} className="w-full">
                  {loading ? "Joining..." : "Join Team"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

