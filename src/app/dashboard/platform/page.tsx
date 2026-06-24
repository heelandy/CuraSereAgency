import { requireCap } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { PlatformHealth } from "@/components/PlatformHealth";
import { AgencyVerificationQueue } from "@/components/AgencyVerificationQueue";
import { PlatformConsole } from "@/components/PlatformConsole";
import { SupportAdmin } from "@/components/SupportAdmin";
import { DeletedRecordsLog } from "@/components/DeletedRecordsLog";

export const dynamic = "force-dynamic";

// System super-admin (Platform Owner) console — oversee every agency on the platform.
export default async function PlatformPage() {
  const ctx = await requireCap("platform:manage");
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitor"
        subtitle="Platform super-admin — health and oversight across every agency"
      />
      <PlatformHealth />
      <AgencyVerificationQueue />
      <PlatformConsole homeAgencyId={ctx.homeAgencyId} />
      <SupportAdmin />
      <DeletedRecordsLog />
    </div>
  );
}
