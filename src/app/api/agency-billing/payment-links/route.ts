import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { stripeBillingEnabled } from "@/lib/platform";
import { createOneOffPaymentLink, connectAgencySelect } from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  amount: z.number().positive().max(1_000_000),
  description: z.string().trim().min(1).max(200),
});

// Staff: create an ad-hoc payment link not tied to an invoice (deposits, copays…).
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("billing:write");
    mutationGuard(req, "oneoffLink", ctx.userId, RateLimits.write);
    if (!(await stripeBillingEnabled())) throw Errors.badRequest("Stripe is disabled by the platform administrator.");
    const { amount, description } = schema.parse(await req.json().catch(() => ({})));

    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: connectAgencySelect });
    if (!agency) throw Errors.notFound();

    const url = await createOneOffPaymentLink(agency, { amount, description });
    await logAdmin(ctx, { action: "payment.oneoffLink", newValue: description });
    return json({ url });
  });
}
