import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Ctx } from "@/lib/authz";
import { StatCard, SectionCard, Badge, PageHeader, EmptyState } from "@/components/ui";
import { CalendarIcon, ClockIcon, HeartIcon } from "@/components/icons";
import { fmtDate, fmtTime, fullName } from "@/lib/format";
import { SERVICE_TYPE, VISIT_STATUS } from "@/lib/enums";

// Field-staff home: a caregiver only ever sees their OWN assigned shifts and
// figures — never the agency-wide schedule or roster (isolation rule).
export async function CaregiverHome({ ctx }: { ctx: Ctx }) {
  const cg = await prisma.caregiver.findFirst({
    where: { userId: ctx.userId, agencyId: ctx.agencyId },
    select: { id: true, firstName: true },
  });

  if (!cg) {
    return (
      <div>
        <PageHeader title={`Welcome, ${ctx.name.split(" ")[0]}`} subtitle="Your shifts and time" />
        <EmptyState
          title="No caregiver profile linked yet"
          hint="Your account isn't linked to a caregiver record. Ask your scheduler to connect it so your shifts appear here."
          icon={<HeartIcon width={28} />}
        />
      </div>
    );
  }

  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const weekStart = new Date(startOfDay); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);

  const [todayShifts, upcoming, weekVisits, pendingClaims] = await Promise.all([
    prisma.visit.count({ where: { agencyId: ctx.agencyId, caregiverId: cg.id, scheduledStart: { gte: startOfDay, lte: endOfDay } } }),
    prisma.visit.findMany({
      where: { agencyId: ctx.agencyId, caregiverId: cg.id, scheduledStart: { gte: now }, status: { notIn: ["CANCELED"] } },
      include: { patient: { select: { firstName: true, lastName: true, city: true } } },
      orderBy: { scheduledStart: "asc" }, take: 6,
    }),
    prisma.visit.findMany({
      where: { agencyId: ctx.agencyId, caregiverId: cg.id, scheduledStart: { gte: weekStart, lt: weekEnd }, status: { notIn: ["CANCELED"] } },
      select: { scheduledStart: true, scheduledEnd: true },
    }),
    prisma.scheduleRequest.count({ where: { agencyId: ctx.agencyId, type: "CLAIM", status: "PENDING", requestedById: ctx.userId } }),
  ]);

  const weekHours = weekVisits.reduce((sum, v) => sum + (new Date(v.scheduledEnd).getTime() - new Date(v.scheduledStart).getTime()) / 3_600_000, 0);
  const visitTone: Record<string, string> = { SCHEDULED: "blue", OPEN: "amber", IN_PROGRESS: "violet", COMPLETED: "green", MISSED: "red", CANCELED: "neutral" };

  return (
    <div>
      <PageHeader title={`Welcome back, ${ctx.name.split(" ")[0]}`} subtitle="Your shifts and time at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Shifts Today" value={todayShifts} icon={<CalendarIcon />} tone="violet" href="/dashboard/my-shifts" />
        <StatCard label="Upcoming Shifts" value={upcoming.length} icon={<CalendarIcon />} tone="blue" href="/dashboard/my-shifts" />
        <StatCard label="Scheduled Hours (wk)" value={`${Math.round(weekHours)}h`} icon={<ClockIcon />} tone="green" href="/dashboard/my-time" />
        <StatCard label="Pending Claims" value={pendingClaims} icon={<CalendarIcon />} tone={pendingClaims > 0 ? "amber" : "neutral"} href="/dashboard/my-shifts" />
      </div>

      <div className="mt-6">
        <SectionCard title="My Upcoming Shifts"
          action={<Link href="/dashboard/my-shifts" className="text-sm text-brand-600 hover:underline">Open My Shifts →</Link>}>
          {upcoming.length === 0 ? (
            <p className="muted">No upcoming shifts. Pick up an open shift from My Shifts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead><tr><th>When</th><th>Patient</th><th>Service</th><th>Status</th></tr></thead>
                <tbody>
                  {upcoming.map((v) => (
                    <tr key={v.id}>
                      <td>{fmtDate(v.scheduledStart)} · {fmtTime(v.scheduledStart)}–{fmtTime(v.scheduledEnd)}</td>
                      <td>{fullName(v.patient)}{v.patient?.city ? <span className="text-surface-400"> · {v.patient.city}</span> : null}</td>
                      <td>{SERVICE_TYPE[v.serviceType as keyof typeof SERVICE_TYPE] ?? v.serviceType}</td>
                      <td><Badge tone={visitTone[v.status]}>{VISIT_STATUS[v.status as keyof typeof VISIT_STATUS] ?? v.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
