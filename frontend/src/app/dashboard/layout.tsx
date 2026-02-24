import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = {
    name: session.name,
    role: session.role,
    avatar: null,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <AppSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={{ name: session.name, avatar: null }} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

