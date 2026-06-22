import { requireCap } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { IntegrationsClient } from "@/components/IntegrationsClient";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireCap("admin:manage");
  return (
    <div>
      <PageHeader
        title="Integrations"
        subtitle="Connect QuickBooks, payroll, calendar, SMS and e-signature providers"
      />
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Connection toggles are stored per agency. Live API credentials are configured via
        environment variables / OAuth (server-side); secrets are never stored in the app UI.
      </div>
      <IntegrationsClient />
    </div>
  );
}
