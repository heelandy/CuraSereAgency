import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CrudResource } from "@/components/CrudResource";
import { childDefs } from "@/components/resource-defs";
import { Badge } from "@/components/ui";
import { fmtDate, fullName } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CarePlanDetail({ params }: { params: { id: string } }) {
  const ctx = await requireUser();
  const cp = await prisma.carePlan.findFirst({
    where: { id: params.id, agencyId: ctx.agencyId },
    include: { patient: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!cp) notFound();

  return (
    <div>
      <Link href="/dashboard/care-plans" className="text-sm text-brand-600 hover:underline">← All care plans</Link>
      <div className="card card-pad mt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-surface-900">{cp.title}</h1>
            <p className="muted mt-1">
              {cp.patient && <Link className="text-brand-600 hover:underline" href={`/dashboard/patients/${cp.patient.id}`}>{fullName(cp.patient)}</Link>}
              {" · Review "}{fmtDate(cp.reviewDate)}
            </p>
          </div>
          <Badge tone={cp.status === "ACTIVE" ? "green" : cp.status === "DRAFT" ? "amber" : "neutral"}>{cp.status}</Badge>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-base font-semibold text-surface-800">Goals &amp; Interventions</h2>
        <CrudResource {...childDefs["care-goals"]} embedded fixed={{ carePlanId: cp.id }} />
      </div>
    </div>
  );
}
