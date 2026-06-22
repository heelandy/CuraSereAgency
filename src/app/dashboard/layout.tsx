import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { filterNav } from "@/lib/nav";
import { parseFlags } from "@/lib/features";
import { getAgencyBranding } from "@/lib/branding";
import { BrandStyle } from "@/components/BrandStyle";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { ROLE_LABELS, PORTAL_ROLES } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOptionalUser();
  if (!ctx) redirect("/login");
  if (PORTAL_ROLES.includes(ctx.role)) redirect("/portal");

  const [branding, agency] = await Promise.all([
    getAgencyBranding(ctx.agencyId),
    prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: { featureFlags: true } }),
  ]);
  const groups = filterNav(ctx.role, parseFlags(agency?.featureFlags));
  const brand = { name: branding.portalName, logoUrl: branding.logoUrl };

  return (
    <div className="min-h-screen bg-surface-50">
      <BrandStyle branding={branding} />
      <Sidebar
        groups={groups}
        brand={brand}
        user={{ name: ctx.name, roleLabel: ROLE_LABELS[ctx.role], agencyName: brand.name }}
      />
      <main className="md:pl-64">
        <header className="sticky top-0 z-20 hidden items-center justify-end border-b border-surface-200 bg-surface-50/80 px-8 py-2.5 backdrop-blur md:flex">
          <NotificationBell />
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
