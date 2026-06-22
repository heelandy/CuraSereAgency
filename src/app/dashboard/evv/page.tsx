import { requireCap } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { EvvBoard } from "@/components/EvvBoard";

export const dynamic = "force-dynamic";

export default async function EvvPage() {
  // Agency-wide EVV monitoring is a supervisor/scheduler view; field staff use My Shifts.
  await requireCap("scheduling:read");
  return (
    <div>
      <PageHeader title="Electronic Visit Verification" subtitle="GPS check-in / check-out for today's visits" />
      <EvvBoard />
    </div>
  );
}
