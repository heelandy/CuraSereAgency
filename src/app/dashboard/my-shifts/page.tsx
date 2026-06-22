import { PageHeader } from "@/components/ui";
import { CaregiverShifts } from "@/components/CaregiverShifts";

export const dynamic = "force-dynamic";

export default function MyShiftsPage() {
  return (
    <div>
      <PageHeader title="My Shifts" subtitle="Your assigned visits and open shifts you can pick up" />
      <CaregiverShifts />
    </div>
  );
}
