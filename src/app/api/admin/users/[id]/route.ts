import bcrypt from "bcryptjs";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { userSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SAFE = { id: true, name: true, email: true, role: true, active: true, branchId: true, lastLoginAt: true, createdAt: true };

export function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "adminUser", ctx.userId, RateLimits.write);
    const existing = await prisma.user.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
    if (!existing) throw Errors.notFound();

    const data = userSchema.partial().parse(await req.json().catch(() => ({})));
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.role !== undefined) update.role = data.role;
    if (data.branchId !== undefined) update.branchId = data.branchId ?? null;
    if (data.email !== undefined) update.email = data.email.toLowerCase().trim();
    if (data.active !== undefined) {
      update.active = data.active;
      // Deactivating bumps tokenVersion → immediate logout everywhere.
      if (data.active === false) update.tokenVersion = { increment: 1 };
    }
    if (data.password) update.passwordHash = await bcrypt.hash(data.password, 12);

    const updated = await prisma.user.update({ where: { id: params.id }, data: update, select: SAFE });
    await logAdmin(ctx, { action: "user.update", target: params.id });
    return json(updated);
  });
}

export function DELETE(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "adminUser", ctx.userId, RateLimits.write);
    if (params.id === ctx.userId) throw Errors.badRequest("You can't delete your own account");
    const existing = await prisma.user.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
    if (!existing) throw Errors.notFound();
    await prisma.user.delete({ where: { id: params.id } });
    await logAdmin(ctx, { action: "user.delete", target: params.id });
    return json({ ok: true });
  });
}
