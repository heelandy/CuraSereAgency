import { requireUser, can } from "@/lib/authz";
import { resources } from "@/lib/resources";
import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const ctx = await requireUser();
  // Patient create/edit/delete is Owner + Admin (admissions) only — others view-only.
  const readOnly = !can(ctx, resources.patients.writeCap);
  return <CrudResource {...resourceDefs.patients} detailBase="/dashboard/patients" readOnly={readOnly} />;
}
