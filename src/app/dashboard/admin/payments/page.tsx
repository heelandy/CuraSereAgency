import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { AgencyPaymentsClient } from "@/components/AgencyPaymentsClient";
import { stripeEnabled } from "@/lib/config";
import { fullName } from "@/lib/format";

export const dynamic = "force-dynamic";

// Agency-facing payments hub: connect Stripe and collect from patients/clients
// (invoices, one-off links, recurring). Distinct from /dashboard/admin/billing,
// which is the agency's OWN subscription to Cura_Sera.
export default async function PaymentsPage() {
  const ctx = await requireCap("billing:read");
  const [invoices, patients] = await Promise.all([
    prisma.invoice.findMany({
      where: { agencyId: ctx.agencyId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { patient: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.patient.findMany({
      where: { agencyId: ctx.agencyId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
  ]);

  const inv = invoices.map((i) => ({
    id: i.id,
    number: i.number,
    amount: i.amount,
    amountPaid: i.amountPaid,
    status: i.status,
    patientName: fullName(i.patient),
    hasEmail: Boolean(i.patient?.email),
    payLink: i.stripePaymentLinkUrl,
  }));
  const pts = patients.map((p) => ({ id: p.id, name: fullName(p) }));

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Connect your Stripe account and collect payments from patients & clients"
      />
      <AgencyPaymentsClient
        invoices={inv}
        patients={pts}
        canWrite={ctx.caps.includes("billing:write")}
        platformConfigured={stripeEnabled}
      />
    </div>
  );
}
