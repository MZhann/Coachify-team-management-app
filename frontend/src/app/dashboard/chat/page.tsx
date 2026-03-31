"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  MessageCircle,
  Send,
  Users,
  Globe,
  Hash,
  Loader2,
  Shield,
  Crown,
  User as UserIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  _id: string;
  channel: "global" | "team";
  teamId?: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderTeamName?: string;
  content: string;
  createdAt: string;
}

interface TeamInfo {
  _id: string;
  name: string;
  sport: string;
}

const SPORT_ICONS: Record<string, string> = {
  football: "\u26BD",
  basketball: "\uD83C\uDFC0",
  volleyball: "\uD83C\uDFD0",
  american_football: "\uD83C\uDFC8",
};

function getToken(): string | undefined {
  return document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("coachify_token="))
    ?.split("=")
    .slice(1)
    .join("=");
}

function getRoleBadge(role: string, teamName?: string) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        <Shield className="h-3 w-3" /> Admin
      </span>
    );
  }
  if (role === "coach") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Crown className="h-3 w-3" /> Coach{teamName ? ` of ${teamName}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
      <UserIcon className="h-3 w-3" /> Player{teamName ? ` from ${teamName}` : ""}
    </span>
  );
}

function timeStr(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function ChatPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState<"global" | "team">("global");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teams, setTeams] = useState<TeamInfo[]>([]);
  const [globalMessages, setGlobalMessages] = useState<ChatMessage[]>([]);
  const [teamMessages, setTeamMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Fetch current user info
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.userId) setCurrentUserId(data.user.userId);
      })
      .catch(() => {});
  }, []);

  // Fetch teams
  useEffect(() => {
    fetch("/api/chat/my-teams")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeams(data);
          if (data.length > 0) setSelectedTeamId(data[0]._id);
        }
      })
      .catch(() => {});
  }, []);

  // Connect Socket.IO
  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const token = getToken();

    const s = io(backendUrl, {
      auth: { token },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      console.log("Socket connected");
    });

    s.on("chat:global:message", (msg: ChatMessage) => {
      setGlobalMessages((prev) => [...prev, msg]);
    });

    s.on("chat:team:message", (msg: ChatMessage) => {
      setTeamMessages((prev) => [...prev, msg]);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Fetch global history
  useEffect(() => {
    setLoading(true);
    fetch("/api/chat/global")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setGlobalMessages(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch team history when selectedTeamId changes
  useEffect(() => {
    if (!selectedTeamId) return;
    setLoading(true);
    fetch(`/api/chat/team/${selectedTeamId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTeamMessages(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedTeamId]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [globalMessages, teamMessages, activeTab, scrollToBottom]);

  function handleSend() {
    if (!input.trim() || !socket) return;

    if (activeTab === "global") {
      socket.emit("chat:global", { content: input.trim() });
    } else if (selectedTeamId) {
      socket.emit("chat:team", {
        teamId: selectedTeamId,
        content: input.trim(),
      });
    }

    setInput("");
    inputRef.current?.focus();
  }

  const messages = activeTab === "global" ? globalMessages : teamMessages;

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const d = dateLabel(msg.createdAt);
    if (d !== lastDate) {
      groupedMessages.push({ date: d, msgs: [msg] });
      lastDate = d;
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat</h1>
          <p className="text-sm text-gray-500">
            Communicate with your teams and the community
          </p>
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden w-64 shrink-0 flex-col gap-2 md:flex">
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              <button
                onClick={() => setActiveTab("global")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  activeTab === "global"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Globe className="h-4 w-4" />
                Global Chat
              </button>

              {teams.length > 0 && (
                <>
                  <div className="px-3 pt-4 pb-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Team Chats
                    </p>
                  </div>
                  {teams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => {
                        setActiveTab("team");
                        setSelectedTeamId(team._id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        activeTab === "team" && selectedTeamId === team._id
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <span className="text-base">
                        {SPORT_ICONS[team.sport] || "#"}
                      </span>
                      <span className="truncate">{team.name}</span>
                    </button>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main chat area */}
        <Card className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile tab switcher */}
          <div className="flex items-center gap-2 border-b p-3 md:hidden">
            <button
              onClick={() => setActiveTab("global")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                activeTab === "global"
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-500"
              )}
            >
              Global
            </button>
            {teams.length > 0 && (
              <select
                value={activeTab === "team" ? selectedTeamId : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setActiveTab("team");
                    setSelectedTeamId(e.target.value);
                  }
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium border-0 bg-transparent",
                  activeTab === "team"
                    ? "text-blue-700"
                    : "text-gray-500"
                )}
              >
                <option value="" disabled>
                  Team chats...
                </option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Chat header */}
          <div className="flex items-center gap-3 border-b bg-gray-50/50 px-4 py-3">
            {activeTab === "global" ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                  <Globe className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Global Chat
                  </p>
                  <p className="text-xs text-gray-500">
                    Everyone in the platform
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-lg">
                  {SPORT_ICONS[
                    teams.find((t) => t._id === selectedTeamId)?.sport || ""
                  ] || <Hash className="h-5 w-5 text-green-600" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {teams.find((t) => t._id === selectedTeamId)?.name ||
                      "Team Chat"}
                  </p>
                  <p className="text-xs text-gray-500">Team members only</p>
                </div>
              </>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageCircle className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">
                  No messages yet
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Be the first to send a message!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {groupedMessages.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        {group.date}
                      </span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                    {group.msgs.map((msg, idx) => {
                      const isOwn = msg.senderId === currentUserId;
                      const showAvatar =
                        idx === 0 ||
                        group.msgs[idx - 1].senderId !== msg.senderId;
                      return (
                        <div
                          key={msg._id}
                          className={cn(
                            "group flex gap-3",
                            showAvatar ? "mt-3" : "mt-0.5",
                            isOwn ? "flex-row-reverse" : ""
                          )}
                        >
                          {showAvatar ? (
                            <div
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                                msg.senderRole === "admin"
                                  ? "bg-red-500"
                                  : msg.senderRole === "coach"
                                  ? "bg-amber-500"
                                  : "bg-blue-500"
                              )}
                            >
                              {msg.senderName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                          ) : (
                            <div className="w-8 shrink-0" />
                          )}
                          <div
                            className={cn(
                              "max-w-[75%] min-w-0",
                              isOwn ? "text-right" : ""
                            )}
                          >
                            {showAvatar && (
                              <div
                                className={cn(
                                  "mb-1 flex items-center gap-2 flex-wrap",
                                  isOwn
                                    ? "flex-row-reverse"
                                    : ""
                                )}
                              >
                                <span className="text-xs font-semibold text-gray-900">
                                  {msg.senderName}
                                </span>
                                {activeTab === "global" &&
                                  getRoleBadge(
                                    msg.senderRole,
                                    msg.senderTeamName
                                  )}
                                <span className="text-[10px] text-gray-400">
                                  {timeStr(msg.createdAt)}
                                </span>
                              </div>
                            )}
                            <div
                              className={cn(
                                "inline-block rounded-2xl px-3.5 py-2 text-sm",
                                isOwn
                                  ? "bg-blue-600 text-white rounded-tr-md"
                                  : "bg-gray-100 text-gray-800 rounded-tl-md"
                              )}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t bg-white p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={
                  activeTab === "global"
                    ? "Message everyone..."
                    : `Message ${teams.find((t) => t._id === selectedTeamId)?.name || "team"}...`
                }
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-blue-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim()}
                size="icon"
                className="h-10 w-10 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
