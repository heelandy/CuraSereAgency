import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AgencySettingsForm } from "@/components/AgencySettingsForm";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { EmailVerification } from "@/components/EmailVerification";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireCap("admin:manage");
  const [agency, user] = await Promise.all([
    prisma.agency.findUnique({
      where: { id: ctx.agencyId },
      select: { name: true, legalName: true, npi: true, email: true, phone: true, addressLine: true, city: true, state: true, zip: true, timezone: true },
    }),
    prisma.user.findUnique({ where: { id: ctx.userId }, select: { twoFactorEnabled: true, emailVerified: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <PageHeader title="Agency Settings" subtitle="Organization profile and contact details" />
        <AgencySettingsForm initial={(agency ?? {}) as Record<string, string | null>} />
      </div>
      <EmailVerification initialVerified={Boolean(user?.emailVerified)} email={ctx.email} />
      <TwoFactorSettings initialEnabled={user?.twoFactorEnabled ?? false} />
    </div>
  );
}
