import { requireCap } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { RequestsReview } from "@/components/RequestsReview";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requireCap("scheduling:read");
  return (
    <div>
      <PageHeader title="Patient & Family Requests" subtitle="Review and approve schedule / availability change requests" />
      <RequestsReview />
    </div>
  );
}
