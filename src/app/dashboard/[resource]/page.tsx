import { notFound } from "next/navigation";
import { requireUser, can, type Capability } from "@/lib/authz";
import { resources } from "@/lib/resources";
import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

// Generic CRUD page for every registered resource. Specialized routes
// (patients, caregivers, scheduling, evv, analytics, admin, messages) have
// their own folders and take precedence over this dynamic segment.
export default async function ResourcePage({ params }: { params: { resource: string } }) {
  const cfg = resourceDefs[params.resource];
  if (!cfg) notFound();

  // Capability-gate from the server registry: no read → not found (defense in
  // depth; nav already hides it). No write → render read-only so Add/Edit/Delete
  // never show for unauthorized users.
  const ctx = await requireUser();
  const reg = (resources as Record<string, { readCap: Capability; writeCap: Capability }>)[params.resource];
  if (reg && !can(ctx, reg.readCap)) notFound();
  const readOnly = cfg.readOnly || (reg ? !can(ctx, reg.writeCap) : false);

  return <CrudResource {...cfg} readOnly={readOnly} />;
}
