import { requireUser, can } from "@/lib/authz";
import { resources } from "@/lib/resources";
import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

export default async function CaregiversPage() {
  const ctx = await requireUser();
  const readOnly = !can(ctx, resources.caregivers.writeCap);
  return <CrudResource {...resourceDefs.caregivers} detailBase="/dashboard/caregivers" readOnly={readOnly} />;
}
