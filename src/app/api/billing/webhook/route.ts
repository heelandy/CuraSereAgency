import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe webhook → entitlements derive only from signed, idempotent events
// (APP_BLUEPRINT §9). A pull-reconcile fallback by customer id/email would
// complement this in production.
export async function POST(req: Request) {
  if (!stripe || !config.stripe.webhookSecret) {
    return new Response("Billing not configured", { status: 400 });
  }
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, config.stripe.webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = event.data.object as any;
  const agencyId: string | undefined = obj?.metadata?.agencyId;

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      if (agencyId) {
        await prisma.agency.update({
          where: { id: agencyId },
          data: {
            subscriptionStatus: obj.status ?? "active",
            plan: obj.metadata?.plan ?? undefined,
            stripeCustomerId: typeof obj.customer === "string" ? obj.customer : undefined,
            stripeSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : (typeof obj.id === "string" ? obj.id : undefined),
          },
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      if (agencyId) {
        await prisma.agency.update({ where: { id: agencyId }, data: { subscriptionStatus: "canceled" } });
      }
      break;
    }
    default:
      break;
  }

  return new Response("ok");
}
