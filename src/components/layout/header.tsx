"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface HeaderProps {
  user: { name: string; avatar?: string | null };
}

export function Header({ user }: HeaderProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-14 items-center gap-4 border-b border-gray-200 bg-white px-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500">
          <span className="text-lg font-bold text-white">C</span>
        </div>
        <span className="text-xl font-bold text-gray-800">Coachify</span>
      </Link>
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search players or teams..."
            className="pl-9 bg-gray-100 border-0"
          />
        </div>
      </div>
      <Avatar className="h-9 w-9">
        <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
        <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
