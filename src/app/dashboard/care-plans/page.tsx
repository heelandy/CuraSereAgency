import { requireUser, can } from "@/lib/authz";
import { resources } from "@/lib/resources";
import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

export default async function CarePlansPage() {
  const ctx = await requireUser();
  const readOnly = !can(ctx, resources["care-plans"].writeCap);
  return <CrudResource {...resourceDefs["care-plans"]} detailBase="/dashboard/care-plans" readOnly={readOnly} />;
}
