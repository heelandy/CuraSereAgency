import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { stripeBillingEnabled } from "@/lib/platform";
import { createInvoicePaymentLink, connectAgencySelect } from "@/lib/stripe-connect";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.boolean().optional() });

// Staff: create a hosted payment link for an invoice and optionally email it to
// the patient. The connected-account webhook reconciles the payment.
export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("billing:write");
    mutationGuard(req, "payLink", ctx.userId, RateLimits.write);
    if (!(await stripeBillingEnabled())) throw Errors.badRequest("Stripe is disabled by the platform administrator.");
    const { email } = schema.parse(await req.json().catch(() => ({})));

    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: connectAgencySelect });
    if (!agency) throw Errors.notFound();
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, agencyId: ctx.agencyId },
      include: { patient: { select: { email: true } } },
    });
    if (!invoice) throw Errors.notFound();

    const url = await createInvoicePaymentLink(agency, invoice);

    let emailed = false;
    if (email) {
      const to = invoice.patient?.email;
      if (!to) throw Errors.badRequest("This patient has no email on file.");
      const r = await sendMail({
        to,
        fromName: agency.name,
        subject: `Payment request — Invoice ${invoice.number ?? ""}`.trim(),
        text: `Hello,\n\nPlease use the secure link below to pay your invoice from ${agency.name}:\n\n${url}\n\nThank you.`,
      });
      emailed = r.delivered;
    }
    await logAdmin(ctx, { action: "invoice.payLink", target: invoice.id, newValue: email ? "emailed" : "link" });
    return json({ url, emailed });
  });
}
