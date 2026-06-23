import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { config } from "@/lib/config";
import { stripeBillingEnabled } from "@/lib/platform";
import { createRecurringCheckout, connectAgencySelect } from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  patientId: z.string().min(1),
  description: z.string().trim().min(1).max(200),
  amount: z.number().positive().max(1_000_000),
  interval: z.enum(["week", "month"]).default("month"),
});

// List this agency's recurring plans (with patient name) for the Payments page.
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("billing:read");
    const plans = await prisma.recurringPlan.findMany({
      where: { agencyId: ctx.agencyId },
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { firstName: true, lastName: true } } },
    });
    return json(plans);
  });
}

// Create a recurring plan + a subscription checkout URL to capture the card.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("billing:write");
    mutationGuard(req, "recurring", ctx.userId, RateLimits.write);
    if (!(await stripeBillingEnabled())) throw Errors.badRequest("Stripe is disabled by the platform administrator.");
    const data = schema.parse(await req.json().catch(() => ({})));

    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: connectAgencySelect });
    if (!agency) throw Errors.notFound();
    const patient = await prisma.patient.findFirst({ where: { id: data.patientId, agencyId: ctx.agencyId }, select: { id: true } });
    if (!patient) throw Errors.badRequest("Unknown patient.");

    const plan = await prisma.recurringPlan.create({
      data: {
        agencyId: ctx.agencyId, patientId: patient.id,
        description: data.description, amount: data.amount, interval: data.interval, status: "PENDING",
      },
    });
    const url = await createRecurringCheckout(agency, plan, config.nextAuthUrl);
    await logAdmin(ctx, { action: "payment.recurring.create", target: plan.id, newValue: data.description });
    return json({ id: plan.id, url }, 201);
  });
}
