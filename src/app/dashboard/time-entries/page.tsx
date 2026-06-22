import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

export default function TimeEntriesPage() {
  return <CrudResource {...resourceDefs["time-entries"]} />;
}
