import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { INTEGRATION_PROVIDER } from "@/lib/enums";

export const dynamic = "force-dynamic";

const schema = z.object({ provider: z.string().min(1), connected: z.boolean() });

// Integration connection toggles (non-secret config; real credentials are env-only).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    const rows = await prisma.integrationSetting.findMany({ where: { agencyId: ctx.agencyId } });
    const byProvider = new Map(rows.map((r) => [r.provider, r.connected]));
    const integrations = Object.entries(INTEGRATION_PROVIDER).map(([provider, label]) => ({
      provider, label, connected: byProvider.get(provider) ?? false,
    }));
    return json(integrations);
  });
}

export function PATCH(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "integration", ctx.userId, RateLimits.write);
    const { provider, connected } = schema.parse(await req.json().catch(() => ({})));
    if (!(provider in INTEGRATION_PROVIDER)) throw new Error("Unknown provider");
    await prisma.integrationSetting.upsert({
      where: { agencyId_provider: { agencyId: ctx.agencyId, provider } },
      create: { agencyId: ctx.agencyId, provider, connected },
      update: { connected },
    });
    await logAdmin(ctx, { action: "integration.toggle", target: provider, newValue: String(connected) });
    return json({ provider, connected });
  });
}
