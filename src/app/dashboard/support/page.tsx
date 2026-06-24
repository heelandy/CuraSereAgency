import { requireUser } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { SupportClient } from "@/components/SupportClient";

export const dynamic = "force-dynamic";

// Agency-facing help desk: raise a ticket to the platform team and follow the
// thread. Admins (admin:manage) see all of their agency's tickets; everyone else
// sees the ones they opened.
export default async function SupportPage() {
  await requireUser();
  return (
    <div>
      <PageHeader title="Support" subtitle="Get help from the platform team — we'll reply right here" />
      <SupportClient />
    </div>
  );
}
