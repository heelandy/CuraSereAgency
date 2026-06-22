import { z } from "zod";
import { requireCap, requireUser, GRANTABLE_CAPABILITIES, parseGrantedCaps } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";

export const dynamic = "force-dynamic";

const GRANTABLE = new Set(GRANTABLE_CAPABILITIES.map((g) => g.cap));
const schema = z.object({ capabilities: z.array(z.string()).max(40) });

// A user's owner-granted capabilities. Reading needs admin:manage; CHANGING is
// restricted to the Agency Owner (owner "enables permissions" for users).
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    const user = await prisma.user.findFirst({
      where: { id: params.id, agencyId: ctx.agencyId }, select: { id: true, extraCapabilities: true },
    });
    if (!user) throw Errors.notFound();
    return json({ granted: parseGrantedCaps(user.extraCapabilities) });
  });
}

export function PUT(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireUser();
    // Only the Agency Owner (or platform owner) may change another user's grants.
    if (ctx.role !== "AGENCY_OWNER" && ctx.role !== "PLATFORM_OWNER") {
      throw Errors.forbidden("Only the agency owner can change a user's permissions.");
    }
    mutationGuard(req, "permissions", ctx.userId, RateLimits.write);

    const { capabilities } = schema.parse(await req.json().catch(() => ({})));
    const clean = [...new Set(capabilities.filter((c) => GRANTABLE.has(c as never)))];

    const user = await prisma.user.findFirst({ where: { id: params.id, agencyId: ctx.agencyId }, select: { id: true } });
    if (!user) throw Errors.notFound();

    await prisma.user.update({ where: { id: user.id }, data: { extraCapabilities: JSON.stringify(clean) } });
    await logAdmin(ctx, { action: "user.permissions.update", target: user.id, newValue: clean.join(",") || "(none)" });
    return json({ granted: clean });
  });
}
