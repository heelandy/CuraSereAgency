import { requireCap } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { SchedulingBoard } from "@/components/SchedulingBoard";
import { GenerateRecurringButton } from "@/components/GenerateRecurringButton";

export const dynamic = "force-dynamic";

export default async function SchedulingPage() {
  // Scheduling/visits are scheduler-and-up only (Owner, Admin, Director, Nurse
  // Supervisor, Scheduler). Field staff have no scheduling:read.
  await requireCap("scheduling:read");
  return (
    <div>
      <PageHeader
        title="Scheduling"
        subtitle="Agenda, open shifts and AI caregiver matching"
        action={<GenerateRecurringButton />}
      />
      <SchedulingBoard />
    </div>
  );
}
