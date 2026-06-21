import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

export default function CaregiversPage() {
  return <CrudResource {...resourceDefs.caregivers} detailBase="/dashboard/caregivers" />;
}
