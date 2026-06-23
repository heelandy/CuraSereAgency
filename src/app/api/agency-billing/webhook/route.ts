import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe Connect webhook — events from agencies' connected accounts (patient
// payments). Verified with the dedicated Connect signing secret. Reconciliation
// is idempotent: Payment.stripePaymentIntentId is unique.
export async function POST(req: Request) {
  if (!stripe || !config.stripe.connectWebhookSecret) {
    return new Response("Connect billing not configured", { status: 400 });
  }
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, config.stripe.connectWebhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const account = event.account; // the connected account the event belongs to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as any;

  switch (event.type) {
    // Onboarding / capability changes → keep our readiness flags in sync.
    case "account.updated": {
      if (account) {
        await prisma.agency.updateMany({
          where: { stripeConnectId: account },
          data: {
            stripeConnectChargesEnabled: Boolean(obj.charges_enabled),
            stripeConnectDetailsSubmitted: Boolean(obj.details_submitted),
          },
        });
      }
      break;
    }
    // Invoice / one-off / recurring checkout completed.
    case "checkout.session.completed": {
      const meta = obj.metadata ?? {};
      if (meta.kind === "invoice" && meta.invoiceId) {
        await markInvoicePaid(meta.invoiceId, obj.amount_total, obj.payment_intent);
      } else if (meta.kind === "recurring" && meta.recurringPlanId) {
        await prisma.recurringPlan.updateMany({
          where: { id: meta.recurringPlanId },
          data: {
            status: "ACTIVE",
            stripeSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : undefined,
          },
        });
      }
      break;
    }
    // Subscription renewals (recurring private pay).
    case "invoice.paid": {
      const subId = typeof obj.subscription === "string" ? obj.subscription : undefined;
      if (subId) await prisma.recurringPlan.updateMany({ where: { stripeSubscriptionId: subId }, data: { status: "ACTIVE" } });
      break;
    }
    case "invoice.payment_failed": {
      const subId = typeof obj.subscription === "string" ? obj.subscription : undefined;
      if (subId) await prisma.recurringPlan.updateMany({ where: { stripeSubscriptionId: subId }, data: { status: "PAST_DUE" } });
      break;
    }
    case "customer.subscription.deleted": {
      const subId = typeof obj.id === "string" ? obj.id : undefined;
      if (subId) await prisma.recurringPlan.updateMany({ where: { stripeSubscriptionId: subId }, data: { status: "CANCELED" } });
      break;
    }
    default:
      break;
  }

  return new Response("ok");
}

// Record an online payment against an invoice and advance its status. Idempotent
// via the unique PaymentIntent id, so webhook retries never double-count.
async function markInvoicePaid(invoiceId: string, amountTotal: unknown, paymentIntent: unknown): Promise<void> {
  const piId = typeof paymentIntent === "string" ? paymentIntent : null;
  if (piId) {
    const existing = await prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } });
    if (existing) return;
  }
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) return;

  const paid = typeof amountTotal === "number" ? amountTotal / 100 : invoice.amount - invoice.amountPaid;
  const newPaid = invoice.amountPaid + paid;
  await prisma.$transaction([
    prisma.payment.create({
      data: {
        agencyId: invoice.agencyId, invoiceId: invoice.id, amount: paid,
        method: "STRIPE", status: "COMPLETED", reference: "Stripe online payment",
        stripePaymentIntentId: piId ?? undefined,
      },
    }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: { amountPaid: newPaid, status: newPaid >= invoice.amount ? "PAID" : "PARTIAL" },
    }),
  ]);
}
