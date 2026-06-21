import Link from "next/link";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { StatCard, SectionCard, Badge, PageHeader } from "@/components/ui";
import { UsersIcon, UserIcon, CalendarIcon, DollarIcon, ShieldIcon, HeartIcon } from "@/components/icons";
import { fmtDateTime, fmtDate, fmtMoney, fullName, daysUntil } from "@/lib/format";
import { VISIT_STATUS, INCIDENT_TYPE, SEVERITY } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const ctx = await requireUser();
  const agencyId = ctx.agencyId;
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const in30 = new Date(now.getTime() + 30 * 86_400_000);

  const [
    patients, caregivers, visitsToday, openShifts, expiringCompliance, invoices,
    upcomingVisits, expiringItems, recentIncidents, announcements,
  ] = await Promise.all([
    prisma.patient.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.caregiver.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.visit.count({ where: { agencyId, scheduledStart: { gte: startOfDay, lte: endOfDay } } }),
    prisma.visit.count({ where: { agencyId, status: "OPEN" } }),
    prisma.complianceItem.count({ where: { agencyId, OR: [{ status: "EXPIRING" }, { status: "EXPIRED" }, { expiresAt: { lte: in30 } }] } }),
    prisma.invoice.findMany({ where: { agencyId, status: { notIn: ["PAID", "VOID"] } }, select: { amount: true, amountPaid: true } }),
    prisma.visit.findMany({
      where: { agencyId, scheduledStart: { gte: now } },
      include: { patient: { select: { firstName: true, lastName: true } }, caregiver: { select: { firstName: true, lastName: true } } },
      orderBy: { scheduledStart: "asc" }, take: 6,
    }),
    prisma.complianceItem.findMany({
      where: { agencyId, expiresAt: { not: null } },
      include: { caregiver: { select: { firstName: true, lastName: true } } },
      orderBy: { expiresAt: "asc" }, take: 6,
    }),
    prisma.incidentReport.findMany({
      where: { agencyId },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" }, take: 5,
    }),
    prisma.announcement.findMany({ where: { agencyId }, orderBy: { createdAt: "desc" }, take: 3 }),
  ]);

  const ar = invoices.reduce((sum, i) => sum + (i.amount - i.amountPaid), 0);

  const visitTone: Record<string, string> = { SCHEDULED: "blue", OPEN: "amber", IN_PROGRESS: "violet", COMPLETED: "green", MISSED: "red", CANCELED: "neutral" };
  const sevTone: Record<string, string> = { LOW: "neutral", MODERATE: "amber", HIGH: "red", CRITICAL: "red" };

  return (
    <div>
      <PageHeader title={`Welcome back, ${ctx.name.split(" ")[0]}`} subtitle="Your agency at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Active Patients" value={patients} icon={<UserIcon />} tone="green" />
        <StatCard label="Active Caregivers" value={caregivers} icon={<UsersIcon />} tone="blue" />
        <StatCard label="Visits Today" value={visitsToday} icon={<CalendarIcon />} tone="violet" />
        <StatCard label="Open Shifts" value={openShifts} icon={<CalendarIcon />} tone="amber" />
        <StatCard label="Compliance Alerts" value={expiringCompliance} icon={<ShieldIcon />} tone={expiringCompliance > 0 ? "red" : "green"} />
        <StatCard label="Outstanding A/R" value={fmtMoney(ar)} icon={<DollarIcon />} tone="green" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Upcoming Visits"
          action={<Link href="/dashboard/visits" className="text-sm text-brand-600 hover:underline">View all →</Link>}>
          {upcomingVisits.length === 0 ? (
            <p className="muted">No upcoming visits scheduled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>Patient</th><th>Caregiver</th><th>When</th><th>Status</th></tr></thead>
                <tbody>
                  {upcomingVisits.map((v) => (
                    <tr key={v.id}>
                      <td>{fullName(v.patient)}</td>
                      <td>{v.caregiver ? fullName(v.caregiver) : <span className="badge-amber">Unassigned</span>}</td>
                      <td>{fmtDateTime(v.scheduledStart)}</td>
                      <td><Badge tone={visitTone[v.status]}>{VISIT_STATUS[v.status as keyof typeof VISIT_STATUS] ?? v.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Compliance Watch"
          action={<Link href="/dashboard/compliance" className="text-sm text-brand-600 hover:underline">All →</Link>}>
          {expiringItems.length === 0 ? (
            <p className="muted">Nothing expiring soon.</p>
          ) : (
            <ul className="space-y-3">
              {expiringItems.map((c) => {
                const d = daysUntil(c.expiresAt);
                const tone = d == null ? "neutral" : d < 0 ? "red" : d <= 30 ? "amber" : "green";
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-surface-800">{c.name}</p>
                      <p className="truncate text-xs text-surface-500">{c.caregiver ? fullName(c.caregiver) : "Agency"}</p>
                    </div>
                    <Badge tone={tone}>{d == null ? "—" : d < 0 ? `${-d}d overdue` : `${d}d`}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Recent Incidents"
          action={<Link href="/dashboard/incidents" className="text-sm text-brand-600 hover:underline">View all →</Link>}>
          {recentIncidents.length === 0 ? (
            <p className="muted">No incidents reported.</p>
          ) : (
            <ul className="divide-y divide-surface-100">
              {recentIncidents.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-surface-800">
                      {INCIDENT_TYPE[i.type as keyof typeof INCIDENT_TYPE] ?? i.type}
                      {i.patient && <span className="text-surface-400"> — {fullName(i.patient)}</span>}
                    </p>
                    <p className="text-xs text-surface-500">{fmtDate(i.occurredAt ?? i.createdAt)}</p>
                  </div>
                  <Badge tone={sevTone[i.severity]}>{SEVERITY[i.severity as keyof typeof SEVERITY] ?? i.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Announcements"
          action={<Link href="/dashboard/announcements" className="text-sm text-brand-600 hover:underline">All →</Link>}>
          {announcements.length === 0 ? (
            <p className="muted">No announcements.</p>
          ) : (
            <ul className="space-y-3">
              {announcements.map((a) => (
                <li key={a.id}>
                  <div className="flex items-center gap-2">
                    {a.priority === "EMERGENCY" && <Badge tone="red">Emergency</Badge>}
                    <p className="text-sm font-medium text-surface-800">{a.title}</p>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-surface-500">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
