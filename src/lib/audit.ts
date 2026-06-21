import { prisma } from "./prisma";
import type { Ctx } from "./authz";

// Append-only audit + security logs (APP_BLUEPRINT §4). No edit/delete path.
// Metadata must carry no private PII beyond ids.

export async function logAdmin(
  ctx: Ctx,
  entry: { action: string; target?: string; oldValue?: string; newValue?: string; ip?: string },
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        agencyId: ctx.agencyId,
        actorId: ctx.userId,
        action: entry.action,
        target: entry.target,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ip: entry.ip,
      },
    });
  } catch (e) {
    // Audit failures must never break the request path; log server-side.
    console.error("[audit] failed", e);
  }
}

export async function logSecurity(entry: {
  agencyId?: string | null;
  kind: string;
  actorId?: string | null;
  detail?: string | null;
  ip?: string | null;
}): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        agencyId: entry.agencyId ?? null,
        kind: entry.kind,
        actorId: entry.actorId ?? null,
        detail: entry.detail ?? null,
        ip: entry.ip ?? null,
      },
    });
  } catch (e) {
    console.error("[security-audit] failed", e);
  }
}
