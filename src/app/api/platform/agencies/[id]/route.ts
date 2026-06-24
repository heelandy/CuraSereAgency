import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { PLAN } from "@/lib/enums";

export const dynamic = "force-dynamic";

const schema = z.object({
  active: z.boolean().optional(),
  plan: z.enum(Object.keys(PLAN) as [string, ...string[]]).optional(),
  subscriptionStatus: z.string().max(40).optional(),
  verificationStatus: z.enum(["PENDING", "VERIFIED", "REJECTED"]).optional(),
  verificationNotes: z.string().max(2000).optional(),
});

// Platform super-admin: suspend/reactivate an agency or change its plan/status.
export function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("platform:manage");
    mutationGuard(req, "platformAgency", ctx.userId, RateLimits.write);
    const data = schema.parse(await req.json().catch(() => ({})));

    const agency = await prisma.agency.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!agency) throw Errors.notFound();

    const updated = await prisma.agency.update({
      where: { id: params.id },
      data: {
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.plan ? { plan: data.plan } : {}),
        ...(data.subscriptionStatus ? { subscriptionStatus: data.subscriptionStatus } : {}),
        ...(data.verificationStatus ? {
          verificationStatus: data.verificationStatus,
          verifiedAt: data.verificationStatus === "VERIFIED" ? new Date() : null,
          verifiedById: data.verificationStatus === "VERIFIED" ? ctx.userId : null,
        } : {}),
        ...(data.verificationNotes !== undefined ? { verificationNotes: data.verificationNotes } : {}),
      },
      select: { id: true, active: true, plan: true, subscriptionStatus: true, verificationStatus: true },
    });
    await logAdmin(ctx, { action: "platform.agency.update", target: params.id, newValue: JSON.stringify(data) });
    return json(updated);
  });
}
