import { requireCap } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { PlatformConsole } from "@/components/PlatformConsole";

export const dynamic = "force-dynamic";

// System super-admin (Platform Owner) console — oversee every agency on the platform.
export default async function PlatformPage() {
  const ctx = await requireCap("platform:manage");
  return (
    <div>
      <PageHeader
        title="System Monitor"
        subtitle="Platform super-admin — health and oversight across every agency"
      />
      <PlatformConsole homeAgencyId={ctx.homeAgencyId} />
    </div>
  );
}
