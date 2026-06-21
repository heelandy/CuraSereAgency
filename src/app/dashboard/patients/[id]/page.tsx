import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CrudResource, type CrudConfig } from "@/components/CrudResource";
import { childDefs, resourceDefs } from "@/components/resource-defs";
import { Badge } from "@/components/ui";
import { fmtDate, fullName } from "@/lib/format";
import { PATIENT_STATUS } from "@/lib/enums";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "green", PENDING: "amber", ON_HOLD: "amber", DISCHARGED: "neutral", DECEASED: "neutral",
};

function Panel({ cfg, fixed }: { cfg: CrudConfig; fixed: Record<string, string> }) {
  return (
    <section>
      <h2 className="mb-2 mt-2 text-base font-semibold text-surface-800">{cfg.title}</h2>
      <CrudResource {...cfg} embedded fixed={fixed} />
    </section>
  );
}

export default async function PatientDetail({ params }: { params: { id: string } }) {
  const ctx = await requireUser();
  const p = await prisma.patient.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
  if (!p) notFound();

  const fixed = { patientId: p.id };
  const info: [string, string][] = [
    ["MRN", p.mrn ?? "—"],
    ["Date of birth", fmtDate(p.dob)],
    ["Phone", p.phone ?? "—"],
    ["Email", p.email ?? "—"],
    ["Address", [p.addressLine, p.city, p.state, p.zip].filter(Boolean).join(", ") || "—"],
    ["Admitted", fmtDate(p.admittedAt)],
  ];

  return (
    <div>
      <Link href="/dashboard/patients" className="text-sm text-brand-600 hover:underline">← All patients</Link>

      <div className="card card-pad mt-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-lg font-semibold text-brand-700">
              {fullName(p).split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-surface-900">{fullName(p)}</h1>
              <div className="mt-1 flex items-center gap-2">
                <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{PATIENT_STATUS[p.status as keyof typeof PATIENT_STATUS] ?? p.status}</Badge>
                {p.mrn && <span className="muted">MRN {p.mrn}</span>}
              </div>
            </div>
          </div>
          <a href={`/api/patients/${p.id}/pdf`} className="btn-secondary" target="_blank" rel="noopener">Download summary PDF</a>
        </div>
        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-surface-400">{k}</dt>
              <dd className="text-sm text-surface-800">{v}</dd>
            </div>
          ))}
        </dl>
        {p.notes && <p className="mt-4 rounded-xl bg-surface-50 p-3 text-sm text-surface-600">{p.notes}</p>}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel cfg={childDefs["emergency-contacts"]} fixed={fixed} />
        <Panel cfg={childDefs.insurance} fixed={fixed} />
        <Panel cfg={childDefs.diagnoses} fixed={fixed} />
        <Panel cfg={childDefs.allergies} fixed={fixed} />
        <Panel cfg={childDefs.medications} fixed={fixed} />
        <Panel cfg={childDefs.physicians} fixed={fixed} />
      </div>

      <div className="mt-6 space-y-6">
        <Panel cfg={resourceDefs["care-plans"]} fixed={fixed} />
        <Panel cfg={resourceDefs["service-auths"]} fixed={fixed} />
        <Panel cfg={resourceDefs["visit-notes"]} fixed={fixed} />
        <Panel cfg={resourceDefs.documents} fixed={fixed} />
      </div>
    </div>
  );
}
