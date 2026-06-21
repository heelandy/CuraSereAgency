import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

export default function CarePlansPage() {
  return <CrudResource {...resourceDefs["care-plans"]} detailBase="/dashboard/care-plans" />;
}
