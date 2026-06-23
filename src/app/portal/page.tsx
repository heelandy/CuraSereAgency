import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { SectionCard, Badge, EmptyState } from "@/components/ui";
import { PortalRequests } from "@/components/PortalRequests";
import { FamilyAccess } from "@/components/FamilyAccess";
import { PortalPayButton } from "@/components/PortalPayButton";
import { CalendarIcon, HeartIcon } from "@/components/icons";
import { fmtDateTime, fmtDate, fmtMoney, fullName } from "@/lib/format";
import { VISIT_STATUS } from "@/lib/enums";
import { stripeBillingEnabled } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const ctx = await requireUser();

  // Resolve the patient this portal account is attached to.
  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  const patientId =
    ctx.role === "PATIENT"
      ? (await prisma.patient.findFirst({ where: { agencyId: ctx.agencyId, userId: ctx.userId } }))?.id
      : user?.familyPatientId ?? undefined;

  if (!patientId) {
    return (
      <EmptyState
        title="No linked care record yet"
        hint="Your account isn't linked to a patient record. Please contact the agency to connect your portal."
        icon={<HeartIcon width={28} />}
      />
    );
  }

  const now = new Date();
  const [patient, visits, notes, invoices, agency, platformPay] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: patientId, agencyId: ctx.agencyId },
      include: { carePlans: { include: { goals: true }, where: { status: "ACTIVE" } } },
    }),
    prisma.visit.findMany({
      where: { patientId, scheduledStart: { gte: now } },
      include: { caregiver: { select: { firstName: true, lastName: true, discipline: true } } },
      orderBy: { scheduledStart: "asc" }, take: 6,
    }),
    prisma.visitNote.findMany({ where: { patientId, status: "SIGNED" }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.invoice.findMany({ where: { patientId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: { stripeConnectChargesEnabled: true } }),
    stripeBillingEnabled(),
  ]);

  if (!patient) return <EmptyState title="Record not found" />;

  // Online payment is offered only when the platform allows it AND the agency has
  // finished connecting its Stripe account.
  const payEnabled = platformPay && Boolean(agency?.stripeConnectChargesEnabled);

  const visitTone: Record<string, string> = { SCHEDULED: "blue", OPEN: "amber", IN_PROGRESS: "violet", COMPLETED: "green", MISSED: "red", CANCELED: "neutral" };
  const goals = patient.carePlans.flatMap((cp) => cp.goals);

  return (
    <div className="space-y-6">
      <div className="card card-pad bg-gradient-to-br from-brand-50 to-amber-50">
        <h1 className="text-2xl font-semibold text-surface-900">Hello, {fullName(patient)}</h1>
        <p className="muted mt-1">Your care, schedule and updates — all in one place.</p>
      </div>

      <SectionCard title="Upcoming Visits">
        {visits.length === 0 ? <p className="muted">No upcoming visits.</p> : (
          <ul className="divide-y divide-surface-100">
            {visits.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="icon-chip bg-brand-50 text-brand-600"><CalendarIcon width={18} /></span>
                  <div>
                    <p className="text-sm font-medium text-surface-800">{fmtDateTime(v.scheduledStart)}</p>
                    <p className="text-xs text-surface-500">
                      Caregiver: {v.caregiver ? fullName(v.caregiver) : "To be assigned"}
                    </p>
                  </div>
                </div>
                <Badge tone={visitTone[v.status]}>{VISIT_STATUS[v.status as keyof typeof VISIT_STATUS] ?? v.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard title="Care Plan Goals">
          {goals.length === 0 ? <p className="muted">No active goals.</p> : (
            <ul className="space-y-3">
              {goals.map((g) => (
                <li key={g.id}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-surface-800">{g.description}</p>
                    <span className="text-xs text-surface-500">{g.progress}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-100">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${g.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent Visit Notes">
          {notes.length === 0 ? <p className="muted">No notes available.</p> : (
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-surface-50 p-3">
                  <p className="text-xs text-surface-500">{fmtDate(n.createdAt)} · {n.type}</p>
                  <p className="mt-0.5 text-sm text-surface-700">{n.narrative || n.assessment || n.subjective || "Visit completed."}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <PortalRequests />

      {ctx.role === "PATIENT" && (
        <FamilyAccess basePath="/api/portal/family" title="Invite Family Members" />
      )}

      <SectionCard title="Invoices">
        {invoices.length === 0 ? <p className="muted">No invoices.</p> : (
          <table className="table">
            <thead><tr><th>Number</th><th>Amount</th><th>Status</th><th>Due</th>{payEnabled && <th className="text-right">Pay</th>}</tr></thead>
            <tbody>
              {invoices.map((i) => {
                const owed = i.amount - i.amountPaid;
                const payable = i.status !== "PAID" && i.status !== "VOID" && owed > 0;
                return (
                  <tr key={i.id}>
                    <td>{i.number ?? "—"}</td>
                    <td>{fmtMoney(i.amount)}</td>
                    <td><Badge tone={i.status === "PAID" ? "green" : i.status === "OVERDUE" ? "red" : "blue"}>{i.status}</Badge></td>
                    <td>{fmtDate(i.dueAt)}</td>
                    {payEnabled && <td className="text-right">{payable ? <PortalPayButton invoiceId={i.id} /> : "—"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
