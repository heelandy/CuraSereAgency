import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AgencySettingsForm } from "@/components/AgencySettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireCap("admin:manage");
  const agency = await prisma.agency.findUnique({
    where: { id: ctx.agencyId },
    select: { name: true, legalName: true, npi: true, email: true, phone: true, addressLine: true, city: true, state: true, zip: true, timezone: true },
  });

  return (
    <div>
      <PageHeader title="Agency Settings" subtitle="Organization profile and contact details" />
      <AgencySettingsForm initial={(agency ?? {}) as Record<string, string | null>} />
    </div>
  );
}
