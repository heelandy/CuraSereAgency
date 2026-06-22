import Link from "next/link";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ConfigCenter } from "@/components/ConfigCenter";
import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";
import { parseFlags } from "@/lib/features";

export const dynamic = "force-dynamic";

export default async function ConfigPage() {
  const ctx = await requireCap("admin:manage");
  const agency = await prisma.agency.findUnique({
    where: { id: ctx.agencyId },
    select: {
      slug: true, logoUrl: true, faviconUrl: true, loginBannerUrl: true,
      primaryColor: true, secondaryColor: true, portalName: true,
      supportEmail: true, supportPhone: true, pdfFooter: true,
      payPeriod: true, mileageRate: true, featureFlags: true,
    },
  });

  const branding = {
    portalName: agency?.portalName ?? "",
    slug: agency?.slug ?? "",
    logoUrl: agency?.logoUrl ?? "",
    faviconUrl: agency?.faviconUrl ?? "",
    loginBannerUrl: agency?.loginBannerUrl ?? "",
    primaryColor: agency?.primaryColor ?? "",
    secondaryColor: agency?.secondaryColor ?? "",
    supportEmail: agency?.supportEmail ?? "",
    supportPhone: agency?.supportPhone ?? "",
    pdfFooter: agency?.pdfFooter ?? "",
    payPeriod: agency?.payPeriod ?? "BIWEEKLY",
    mileageRate: String(agency?.mileageRate ?? 0.67),
  };

  return (
    <div>
      <PageHeader
        title="Agency Configuration Center"
        subtitle="One codebase, configured per agency — branding, features, services and forms"
      />
      <ConfigCenter initialBranding={branding} initialFlags={parseFlags(agency?.featureFlags)} />

      <div className="mt-8">
        <h2 className="mb-2 text-base font-semibold text-surface-800">Service Catalog</h2>
        <CrudResource {...resourceDefs.services} embedded />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/dashboard/forms" className="btn-secondary">Forms Builder →</Link>
        <Link href="/dashboard/admin/integrations" className="btn-secondary">Integrations →</Link>
        <Link href="/dashboard/pto-balances" className="btn-secondary">PTO Balances →</Link>
      </div>
    </div>
  );
}
