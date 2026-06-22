import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { parseFlags } from "@/lib/features";
import { FEATURE_FLAGS } from "@/lib/enums";

export const dynamic = "force-dynamic";

const schema = z.object({ flags: z.record(z.string(), z.boolean()) });

// Per-agency feature flags (Agency Configuration Center).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: { featureFlags: true } });
    return json({ flags: parseFlags(agency?.featureFlags), labels: FEATURE_FLAGS });
  });
}

export function PATCH(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "flags", ctx.userId, RateLimits.write);
    const { flags } = schema.parse(await req.json().catch(() => ({})));
    // Only persist known flag keys.
    const clean: Record<string, boolean> = {};
    for (const k of Object.keys(FEATURE_FLAGS)) clean[k] = flags[k] !== false;
    await prisma.agency.update({ where: { id: ctx.agencyId }, data: { featureFlags: JSON.stringify(clean) } });
    await logAdmin(ctx, { action: "agency.featureFlags" });
    return json({ flags: clean });
  });
}
