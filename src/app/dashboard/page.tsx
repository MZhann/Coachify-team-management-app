import Link from "next/link";
import { Shirt, Calendar, ClipboardList, BarChart3 } from "lucide-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";

const cards = [
  {
    title: "Player Roster",
    description: "Add, edit, or assign players to your team.",
    href: "/dashboard/players",
    buttonLabel: "Manage",
    icon: Shirt,
    iconBg: "bg-orange-500",
    iconColor: "text-white",
  },
  {
    title: "Schedule Events",
    description: "Plan trainings and upcoming matches.",
    href: "/dashboard/trainings",
    buttonLabel: "Schedule",
    icon: Calendar,
    iconBg: "bg-green-500",
    iconColor: "text-white",
  },
  {
    title: "Discipline Log",
    description: "Track warnings, fouls, and absences.",
    href: "/dashboard/discipline",
    buttonLabel: "Review",
    icon: ClipboardList,
    iconBg: "bg-red-500",
    iconColor: "text-white",
  },
  {
    title: "Team Stats & Reports",
    description: "View performance stats and reports.",
    href: "/dashboard/analytics",
    buttonLabel: "View",
    icon: BarChart3,
    iconBg: "bg-orange-500",
    iconColor: "text-white",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Team Management
        </h1>
        <CreateTeamDialog />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.iconBg} ${item.iconColor}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
              <CardFooter>
                <Link
                  href={item.href}
                  className={cn(buttonVariants({ variant: "default" }))}
                >
                  {item.buttonLabel}
                </Link>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
