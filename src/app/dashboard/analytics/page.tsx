import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, SectionCard } from "@/components/ui";
import { UserIcon, UsersIcon, CalendarIcon, DollarIcon, ChartIcon, ShieldIcon } from "@/components/icons";
import { fmtMoney } from "@/lib/format";
import { VISIT_STATUS, REFERRAL_STAGE } from "@/lib/enums";

export const dynamic = "force-dynamic";

function Bars({ items, tone = "bg-brand-500" }: { items: { label: string; value: number }[]; tone?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between text-xs text-surface-600"><span>{i.label}</span><span>{i.value}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-100">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AnalyticsPage() {
  const ctx = await requireCap("analytics:read");
  const agencyId = ctx.agencyId;

  const [
    patients, caregivers, visitGroups, payments, invoices, payroll,
    complianceValid, complianceAlerts, referralGroups, sources,
  ] = await Promise.all([
    prisma.patient.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.caregiver.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.visit.groupBy({ by: ["status"], where: { agencyId }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { agencyId, status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.invoice.findMany({ where: { agencyId, status: { notIn: ["PAID", "VOID"] } }, select: { amount: true, amountPaid: true } }),
    prisma.payrollEntry.aggregate({ where: { agencyId }, _sum: { grossPay: true } }),
    prisma.complianceItem.count({ where: { agencyId, status: "VALID" } }),
    prisma.complianceItem.count({ where: { agencyId, status: { in: ["EXPIRING", "EXPIRED", "MISSING"] } } }),
    prisma.referral.groupBy({ by: ["stage"], where: { agencyId }, _count: { _all: true } }),
    prisma.referralSource.findMany({ where: { agencyId }, include: { _count: { select: { referrals: true } }, referrals: { select: { estimatedRevenue: true } } }, take: 6 }),
  ]);

  const visitCounts: Record<string, number> = {};
  visitGroups.forEach((g) => { visitCounts[g.status] = g._count._all; });
  const totalVisits = Object.values(visitCounts).reduce((a, b) => a + b, 0);
  const missed = visitCounts.MISSED ?? 0;
  const missedRate = totalVisits ? Math.round((missed / totalVisits) * 100) : 0;

  const revenue = payments._sum.amount ?? 0;
  const ar = invoices.reduce((s, i) => s + (i.amount - i.amountPaid), 0);
  const payrollTotal = payroll._sum.grossPay ?? 0;
  const profit = revenue - payrollTotal;

  const visitBars = Object.entries(VISIT_STATUS).map(([k, label]) => ({ label, value: visitCounts[k] ?? 0 }));
  const referralCounts: Record<string, number> = {};
  referralGroups.forEach((g) => { referralCounts[g.stage] = g._count._all; });
  const referralBars = Object.entries(REFERRAL_STAGE).map(([k, label]) => ({ label, value: referralCounts[k] ?? 0 }));

  const sourceBars = sources
    .map((s) => ({ label: s.name, value: s._count.referrals }))
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Agency performance, revenue and quality at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active Patients" value={patients} icon={<UserIcon />} tone="green" />
        <StatCard label="Active Caregivers" value={caregivers} icon={<UsersIcon />} tone="blue" />
        <StatCard label="Total Visits" value={totalVisits} icon={<CalendarIcon />} tone="violet" />
        <StatCard label="Missed Rate" value={`${missedRate}%`} icon={<ChartIcon />} tone={missedRate > 5 ? "red" : "green"} />
        <StatCard label="Revenue (paid)" value={fmtMoney(revenue)} icon={<DollarIcon />} tone="green" />
        <StatCard label="Outstanding A/R" value={fmtMoney(ar)} icon={<DollarIcon />} tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Payroll (gross)" value={fmtMoney(payrollTotal)} tone="violet" />
        <StatCard label="Est. Profitability" value={fmtMoney(profit)} tone={profit >= 0 ? "green" : "red"} />
        <StatCard label="Compliance Valid" value={complianceValid} icon={<ShieldIcon />} tone="green" />
        <StatCard label="Compliance Alerts" value={complianceAlerts} icon={<ShieldIcon />} tone={complianceAlerts > 0 ? "red" : "green"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard title="Visits by Status"><Bars items={visitBars} /></SectionCard>
        <SectionCard title="Referral Pipeline"><Bars items={referralBars} tone="bg-violet-500" /></SectionCard>
        <SectionCard title="Top Referral Sources">
          {sourceBars.length === 0 ? <p className="muted">No referral sources.</p> : <Bars items={sourceBars} tone="bg-amber-500" />}
        </SectionCard>
      </div>
    </div>
  );
}
