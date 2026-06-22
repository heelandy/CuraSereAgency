import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { filterNav } from "@/lib/nav";
import { parseFlags } from "@/lib/features";
import { getAgencyBranding, PLATFORM_DEFAULT } from "@/lib/branding";
import { BrandStyle } from "@/components/BrandStyle";
import { Sidebar } from "@/components/Sidebar";
import { PlatformBanner } from "@/components/PlatformBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { ROLE_LABELS, PORTAL_ROLES } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOptionalUser();
  if (!ctx) redirect("/login");
  if (PORTAL_ROLES.includes(ctx.role)) redirect("/portal");

  // System super-admin (not impersonating) gets a platform-level shell — neutral
  // branding and the full nav — never a single agency's theme. Otherwise the shell
  // reflects the effective agency (their own, or the one they're "viewing as").
  const isPlatform = ctx.role === "PLATFORM_OWNER" && !ctx.impersonating;
  const [branding, agency] = await Promise.all([
    isPlatform ? Promise.resolve(PLATFORM_DEFAULT) : getAgencyBranding(ctx.agencyId),
    isPlatform ? Promise.resolve(null) : prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: { featureFlags: true } }),
  ]);
  const groups = filterNav(ctx.caps, isPlatform ? undefined : parseFlags(agency?.featureFlags));
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
        {ctx.impersonating && <PlatformBanner agencyName={brand.name} />}
        <header className="sticky top-0 z-20 hidden items-center justify-end border-b border-surface-200 bg-surface-50/80 px-8 py-2.5 backdrop-blur md:flex">
          <NotificationBell />
        </header>
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
