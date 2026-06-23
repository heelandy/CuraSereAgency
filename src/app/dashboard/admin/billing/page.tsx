import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader, Badge, StatCard } from "@/components/ui";
import { PLAN_CATALOG, planDef } from "@/lib/billing";
import { UpgradeButton } from "@/components/UpgradeButton";
import { CheckIcon } from "@/components/icons";
import { fmtDate } from "@/lib/format";
import { stripeEnabled } from "@/lib/config";
import { stripeBillingEnabled } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const ctx = await requireCap("admin:manage");
  const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId } });
  const current = agency?.plan ?? "STARTER";
  const def = planDef(current);
  const billingOn = await stripeBillingEnabled();

  const [patients, caregivers, branches] = await Promise.all([
    prisma.patient.count({ where: { agencyId: ctx.agencyId } }),
    prisma.caregiver.count({ where: { agencyId: ctx.agencyId } }),
    prisma.branch.count({ where: { agencyId: ctx.agencyId } }),
  ]);

  return (
    <div>
      <PageHeader title="Subscription & Billing" subtitle="Manage your Cura_Sera plan" />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Current Plan" value={def.name} hint={agency?.subscriptionStatus ?? "—"} />
        <StatCard label="Patients" value={`${patients}${def.limits.patients ? ` / ${def.limits.patients}` : ""}`} tone="blue" />
        <StatCard label="Caregivers" value={`${caregivers}${def.limits.caregivers ? ` / ${def.limits.caregivers}` : ""}`} tone="violet" />
        <StatCard label="Renews / Trial ends" value={fmtDate(agency?.trialEndsAt)} tone="amber" />
      </div>

      {!billingOn && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {stripeEnabled ? (
            <>Online checkout is currently disabled by the platform administrator. Plan selection is shown read-only.</>
          ) : (
            <>
              Stripe is not configured in this environment. Plan selection is shown read-only — add
              <code className="mx-1 rounded bg-white px-1">STRIPE_SECRET_KEY</code> and price IDs to enable live checkout.
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {PLAN_CATALOG.map((p) => (
          <div key={p.key} className={`card card-pad flex flex-col ${p.key === current ? "ring-2 ring-brand-500" : ""}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-900">{p.name}</h3>
              {p.key === current && <Badge tone="green">Active</Badge>}
            </div>
            <p className="mt-1 text-2xl font-semibold text-brand-700">{p.price}</p>
            <p className="muted mt-1">{p.blurb}</p>
            <ul className="mt-4 flex-1 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-surface-700">
                  <span className="mt-0.5 text-brand-600"><CheckIcon width={16} /></span>{f}
                </li>
              ))}
            </ul>
            <div className="mt-4"><UpgradeButton plan={p.key} current={p.key === current} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
