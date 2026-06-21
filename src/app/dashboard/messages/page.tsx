import { requireUser } from "@/lib/authz";
import { PageHeader } from "@/components/ui";
import { MessagesClient } from "@/components/MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const ctx = await requireUser();
  return (
    <div>
      <PageHeader title="Secure Messaging" subtitle="Team, caregiver and family communication" />
      <MessagesClient currentUserId={ctx.userId} />
    </div>
  );
}
