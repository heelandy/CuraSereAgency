import { z } from "zod";
import { cookies } from "next/headers";
import { requireCap, ACTING_AGENCY_COOKIE } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ agencyId: z.string().min(1) });

// Platform super-admin "view as": set the acting-agency cookie so the whole app
// operates on the chosen tenant. Only platform:manage may do this.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("platform:manage");
    mutationGuard(req, "actAs", ctx.userId, RateLimits.write);
    const { agencyId } = schema.parse(await req.json().catch(() => ({})));
    const agency = await prisma.agency.findUnique({ where: { id: agencyId }, select: { id: true, name: true } });
    if (!agency) throw Errors.notFound("Agency not found");

    cookies().set(ACTING_AGENCY_COOKIE, agency.id, {
      httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production",
    });
    await logAdmin(ctx, { action: "platform.actAs", target: agency.id, newValue: agency.name });
    return json({ ok: true, agencyId: agency.id, name: agency.name });
  });
}

// Exit "view as" — return to the platform owner's home agency.
export function DELETE() {
  return handle(async () => {
    await requireCap("platform:manage");
    cookies().delete(ACTING_AGENCY_COOKIE);
    return json({ ok: true });
  });
}
