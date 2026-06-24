import bcrypt from "bcryptjs";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { userSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const SAFE = {
  id: true, name: true, email: true, role: true, active: true, branchId: true,
  lastLoginAt: true, twoFactorEnabled: true, createdAt: true,
};

// Users & roles (Phase 19). Passwords are hashed server-side; hashes never returned.
// The PLATFORM_OWNER (super-admin) is system-level and is NEVER listed in any
// agency's roster, messaging, or permissions surfaces.
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    const users = await prisma.user.findMany({
      where: { agencyId: ctx.agencyId, role: { not: "PLATFORM_OWNER" } },
      select: SAFE, orderBy: { name: "asc" },
    });
    return json(users);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "adminUser", ctx.userId, RateLimits.write);
    const data = userSchema.parse(await req.json().catch(() => ({})));
    if (data.role === "PLATFORM_OWNER") throw Errors.forbidden("The platform owner is system-level and can't be created here.");
    if (!data.password) throw Errors.badRequest("Password is required for new users");

    const email = data.email.toLowerCase().trim();
    const exists = await prisma.user.findFirst({ where: { agencyId: ctx.agencyId, email } });
    if (exists) throw Errors.conflict("A user with that email already exists");

    const created = await prisma.user.create({
      data: {
        agencyId: ctx.agencyId, name: data.name, email, role: data.role,
        branchId: data.branchId ?? null, active: data.active ?? true,
        passwordHash: await bcrypt.hash(data.password, 12),
      },
      select: SAFE,
    });
    await logAdmin(ctx, { action: "user.create", target: created.id, newValue: data.role });
    return json(created, 201);
  });
}
