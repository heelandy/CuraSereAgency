import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { stripe } from "@/lib/stripe";
import { config } from "@/lib/config";
import { stripeBillingEnabled } from "@/lib/platform";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ plan: z.enum(["STARTER", "PROFESSIONAL", "GROWTH", "ENTERPRISE"]) });

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "billing", ctx.userId, RateLimits.write);
    const { plan } = schema.parse(await req.json().catch(() => ({})));

    if (!(await stripeBillingEnabled()) || !stripe) {
      throw Errors.badRequest("Online billing is currently disabled. Contact the platform administrator, or set STRIPE_SECRET_KEY and plan price IDs to enable checkout.");
    }
    const price = config.stripe.prices[plan];
    if (!price) throw Errors.badRequest(`No Stripe price configured for ${plan}.`);

    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId } });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer: agency?.stripeCustomerId ?? undefined,
      customer_email: agency?.stripeCustomerId ? undefined : (agency?.email ?? ctx.email),
      success_url: `${config.nextAuthUrl}/dashboard/admin/billing?status=success`,
      cancel_url: `${config.nextAuthUrl}/dashboard/admin/billing?status=cancel`,
      metadata: { agencyId: ctx.agencyId, plan },
      subscription_data: { metadata: { agencyId: ctx.agencyId, plan } },
    });
    return json({ url: session.url });
  });
}
