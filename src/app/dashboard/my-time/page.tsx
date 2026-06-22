import { PageHeader } from "@/components/ui";
import { MyTime } from "@/components/MyTime";

export const dynamic = "force-dynamic";

export default function MyTimePage() {
  return (
    <div>
      <PageHeader title="My Time & Pay" subtitle="Your hours, PTO, mileage and estimated pay" />
      <MyTime />
    </div>
  );
}
