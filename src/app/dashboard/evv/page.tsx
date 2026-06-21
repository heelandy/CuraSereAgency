import { PageHeader } from "@/components/ui";
import { EvvBoard } from "@/components/EvvBoard";

export const dynamic = "force-dynamic";

export default function EvvPage() {
  return (
    <div>
      <PageHeader title="Electronic Visit Verification" subtitle="GPS check-in / check-out for today's visits" />
      <EvvBoard />
    </div>
  );
}
