import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { portalPatientId } from "@/lib/portal";
import { stripeBillingEnabled } from "@/lib/platform";
import { createInvoicePaymentLink, connectAgencySelect } from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Patient/Family: pay one of THEIR invoices. Returns a hosted Stripe URL.
export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireUser();
    if (ctx.role !== "PATIENT" && ctx.role !== "FAMILY") throw Errors.forbidden();
    mutationGuard(req, "portalPay", ctx.userId, RateLimits.write);
    if (!(await stripeBillingEnabled())) throw Errors.badRequest("Online payments are unavailable right now.");

    const patientId = await portalPatientId(ctx);
    if (!patientId) throw Errors.badRequest("No linked patient record.");

    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: connectAgencySelect });
    if (!agency) throw Errors.notFound();
    const invoice = await prisma.invoice.findFirst({ where: { id: params.id, agencyId: ctx.agencyId, patientId } });
    if (!invoice) throw Errors.notFound();
    if (invoice.status === "PAID") throw Errors.badRequest("This invoice is already paid.");

    const url = await createInvoicePaymentLink(agency, invoice);
    return json({ url });
  });
}
