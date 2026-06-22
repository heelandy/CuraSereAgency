import { redirect } from "next/navigation";
import { getOptionalUser } from "@/lib/authz";
import { PORTAL_ROLES, ROLE_LABELS } from "@/lib/enums";
import { getAgencyBranding } from "@/lib/branding";
import { BrandStyle } from "@/components/BrandStyle";
import { Logo } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getOptionalUser();
  if (!ctx) redirect("/login");
  if (!PORTAL_ROLES.includes(ctx.role)) redirect("/dashboard");

  const branding = await getAgencyBranding(ctx.agencyId);

  return (
    <div className="min-h-screen bg-surface-50">
      <BrandStyle branding={branding} />
      <header className="border-b border-surface-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Logo name={branding.portalName} logoUrl={branding.logoUrl} />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-surface-600 sm:inline">{ctx.name} · {ROLE_LABELS[ctx.role]}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
