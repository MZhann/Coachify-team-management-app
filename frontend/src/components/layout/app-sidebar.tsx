"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  BarChart3,
  LogOut,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JoinTeamDialog } from "@/components/dashboard/join-team-dialog";
import { useSidebar } from "@/components/layout/dashboard-shell";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/players", label: "Players", icon: Users },
  { href: "/dashboard/trainings", label: "Trainings", icon: Calendar },
  { href: "/dashboard/matches", label: "Matches", icon: Trophy },
  { href: "/dashboard/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
];

interface AppSidebarProps {
  user: { name: string; role?: string; avatar?: string | null };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { open, close } = useSidebar();

  async function handleLogout(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/auth/logout", { method: "POST" });
    document.cookie = "coachify_token=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sidebarContent = (
    <>
      {/* Mobile close button */}
      <div className="flex items-center justify-between p-4 md:hidden">
        <span className="text-lg font-bold">Coachify</span>
        <button
          onClick={close}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4 pt-0 md:pt-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-coachify-sidebarHover text-white"
                  : "text-white/90 hover:bg-coachify-sidebarHover hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.label}
              </span>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}

        {/* Join Team button */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <JoinTeamDialog />
        </div>
      </nav>

      <div className="border-t border-white/20 p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
            <AvatarFallback className="bg-coachify-sidebarHover text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-white/80">
              {user.role === "coach"
                ? "Head Coach"
                : user.role === "player"
                ? "Player"
                : user.role === "admin"
                ? "Administrator"
                : user.role ?? "Coach"}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-white/80">Online</span>
            </div>
          </div>
        </div>
        <form onSubmit={handleLogout}>
          <Button
            type="submit"
            variant="sidebar"
            className="w-full gap-2 font-medium"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible */}
      <aside className="hidden md:flex h-full w-64 shrink-0 flex-col bg-coachify-sidebar text-white">
        {sidebarContent}
      </aside>

      {/* Mobile overlay sidebar */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-coachify-sidebar text-white transition-transform duration-300 ease-in-out md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
