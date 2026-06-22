import { z } from "zod";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { encryptField } from "@/lib/crypto";
import { INTEGRATION_PROVIDER } from "@/lib/enums";

export const dynamic = "force-dynamic";

// `secret` is the per-agency API key/token. "" clears it; omitted leaves it.
const schema = z.object({
  provider: z.string().min(1),
  connected: z.boolean().optional(),
  secret: z.string().max(2000).optional(),
});

// Integration connections. The API key/token is encrypted at rest (AES-256-GCM)
// and NEVER returned to the client — only whether one is set (hasSecret).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    const rows = await prisma.integrationSetting.findMany({ where: { agencyId: ctx.agencyId } });
    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    const integrations = Object.entries(INTEGRATION_PROVIDER).map(([provider, label]) => {
      const row = byProvider.get(provider);
      return { provider, label, connected: row?.connected ?? false, hasSecret: Boolean(row?.secret) };
    });
    return json(integrations);
  });
}

export function PATCH(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "integration", ctx.userId, RateLimits.write);
    const { provider, connected, secret } = schema.parse(await req.json().catch(() => ({})));
    if (!(provider in INTEGRATION_PROVIDER)) throw new Error("Unknown provider");

    // Encrypt a provided secret; "" clears it; undefined leaves it unchanged.
    const secretUpdate = secret === undefined ? {} : { secret: secret === "" ? null : encryptField(secret) };
    const existing = await prisma.integrationSetting.findUnique({
      where: { agencyId_provider: { agencyId: ctx.agencyId, provider } }, select: { connected: true },
    });
    const nextConnected = connected ?? existing?.connected ?? false;

    const saved = await prisma.integrationSetting.upsert({
      where: { agencyId_provider: { agencyId: ctx.agencyId, provider } },
      create: { agencyId: ctx.agencyId, provider, connected: nextConnected, ...secretUpdate },
      update: { connected: nextConnected, ...secretUpdate },
      select: { provider: true, connected: true, secret: true },
    });
    await logAdmin(ctx, { action: "integration.update", target: provider, newValue: String(nextConnected) });
    return json({ provider: saved.provider, connected: saved.connected, hasSecret: Boolean(saved.secret) });
  });
}
