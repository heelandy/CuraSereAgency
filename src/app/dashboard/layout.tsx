import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { filterNav } from "@/lib/nav";
import { Sidebar } from "@/components/Sidebar";
import { ROLE_LABELS, PORTAL_ROLES } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOptionalUser();
  if (!ctx) redirect("/login");
  if (PORTAL_ROLES.includes(ctx.role)) redirect("/portal");

  const agency = await prisma.agency.findUnique({
    where: { id: ctx.agencyId },
    select: { name: true },
  });
  const groups = filterNav(ctx.role);

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        groups={groups}
        user={{ name: ctx.name, roleLabel: ROLE_LABELS[ctx.role], agencyName: agency?.name ?? "Agency" }}
      />
      <main className="md:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
