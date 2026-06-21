import { PageHeader } from "@/components/ui";
import { SchedulingBoard } from "@/components/SchedulingBoard";

export const dynamic = "force-dynamic";

export default function SchedulingPage() {
  return (
    <div>
      <PageHeader title="Scheduling" subtitle="Agenda, open shifts and AI caregiver matching" />
      <SchedulingBoard />
    </div>
  );
}
