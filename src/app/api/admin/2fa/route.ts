import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { generateSecret, otpauthUrl, verifyToken } from "@/lib/totp";
import { encryptField, decryptField } from "@/lib/crypto";
import { logSecurity } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["setup", "enable", "disable"]),
  token: z.string().trim().optional(),
});

// Manage the current user's TOTP 2FA (Phase 22).
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    mutationGuard(req, "2fa", ctx.userId, RateLimits.auth);
    const { action, token } = schema.parse(await req.json().catch(() => ({})));

    if (action === "setup") {
      const secret = generateSecret();
      await prisma.user.update({ where: { id: ctx.userId }, data: { twoFactorSecret: encryptField(secret), twoFactorEnabled: false } });
      return json({ secret, otpauthUrl: otpauthUrl(secret, ctx.email) });
    }

    if (action === "enable") {
      const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { twoFactorSecret: true } });
      if (!user?.twoFactorSecret) throw Errors.badRequest("Run setup first");
      if (!verifyToken(decryptField(user.twoFactorSecret) ?? "", token ?? "")) throw Errors.badRequest("Invalid code — try again");
      await prisma.user.update({ where: { id: ctx.userId }, data: { twoFactorEnabled: true } });
      await logSecurity({ agencyId: ctx.agencyId, actorId: ctx.userId, kind: "2FA", detail: "enabled" });
      return json({ enabled: true });
    }

    // disable
    await prisma.user.update({ where: { id: ctx.userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
    await logSecurity({ agencyId: ctx.agencyId, actorId: ctx.userId, kind: "2FA", detail: "disabled" });
    return json({ enabled: false });
  });
}
