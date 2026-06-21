import { notFound } from "next/navigation";
import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

// Generic CRUD page for every registered resource. Specialized routes
// (patients, caregivers, scheduling, evv, analytics, admin, messages) have
// their own folders and take precedence over this dynamic segment.
export default function ResourcePage({ params }: { params: { resource: string } }) {
  const cfg = resourceDefs[params.resource];
  if (!cfg) notFound();
  return <CrudResource {...cfg} />;
}
