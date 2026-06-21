import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CrudResource, type CrudConfig } from "@/components/CrudResource";
import { childDefs, resourceDefs } from "@/components/resource-defs";
import { Badge } from "@/components/ui";
import { fmtDate, fmtMoney, fullName } from "@/lib/format";
import { CAREGIVER_STATUS, CAREGIVER_DISCIPLINE } from "@/lib/enums";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  ACTIVE: "green", ONBOARDING: "blue", INACTIVE: "neutral", ON_LEAVE: "amber", TERMINATED: "red",
};

function Panel({ cfg, fixed }: { cfg: CrudConfig; fixed: Record<string, string> }) {
  return (
    <section>
      <h2 className="mb-2 mt-2 text-base font-semibold text-surface-800">{cfg.title}</h2>
      <CrudResource {...cfg} embedded fixed={fixed} />
    </section>
  );
}

export default async function CaregiverDetail({ params }: { params: { id: string } }) {
  const ctx = await requireUser();
  const c = await prisma.caregiver.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
  if (!c) notFound();

  const fixed = { caregiverId: c.id };
  const info: [string, string][] = [
    ["Discipline", CAREGIVER_DISCIPLINE[c.discipline as keyof typeof CAREGIVER_DISCIPLINE] ?? c.discipline],
    ["Phone", c.phone ?? "—"],
    ["Email", c.email ?? "—"],
    ["Languages", c.languages ?? "—"],
    ["Hourly rate", c.hourlyRate != null ? fmtMoney(c.hourlyRate) : "—"],
    ["Hired", fmtDate(c.hireDate)],
  ];

  return (
    <div>
      <Link href="/dashboard/caregivers" className="text-sm text-brand-600 hover:underline">← All caregivers</Link>

      <div className="card card-pad mt-3">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-lg font-semibold text-sky-700">
            {fullName(c).split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-surface-900">{fullName(c)}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={STATUS_TONE[c.status] ?? "neutral"}>{CAREGIVER_STATUS[c.status as keyof typeof CAREGIVER_STATUS] ?? c.status}</Badge>
            </div>
          </div>
        </div>
        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {info.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-surface-400">{k}</dt>
              <dd className="text-sm text-surface-800">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel cfg={childDefs.certifications} fixed={fixed} />
        <Panel cfg={childDefs["background-checks"]} fixed={fixed} />
        <Panel cfg={childDefs.availability} fixed={fixed} />
        <Panel cfg={resourceDefs.performance} fixed={fixed} />
      </div>

      <div className="mt-6 space-y-6">
        <Panel cfg={resourceDefs.compliance} fixed={fixed} />
        <Panel cfg={resourceDefs.documents} fixed={fixed} />
      </div>
    </div>
  );
}
