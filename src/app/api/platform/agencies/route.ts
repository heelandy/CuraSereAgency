import bcrypt from "bcryptjs";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { signupSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Platform (super-admin) console: oversee ALL agencies. These are the only
// endpoints that intentionally cross tenant boundaries — gated by platform:manage.
export function GET() {
  return handle(async () => {
    await requireCap("platform:manage");
    const agencies = await prisma.agency.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, slug: true, plan: true, subscriptionStatus: true, active: true, createdAt: true,
        _count: { select: { users: true, patients: true, caregivers: true, branches: true, visits: true } },
      },
    });
    return json(agencies);
  });
}

// Provision a new agency + its Agency Owner from the platform console.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("platform:manage");
    mutationGuard(req, "platformAgency", ctx.userId, RateLimits.write);
    const data = signupSchema.parse(await req.json().catch(() => ({})));

    const exists = await prisma.user.findFirst({ where: { email: data.email }, select: { id: true } });
    if (exists) throw Errors.conflict("An account with that email already exists.");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const agency = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: { name: data.agencyName, portalName: data.agencyName, plan: "STARTER", subscriptionStatus: "trialing" },
      });
      const branch = await tx.branch.create({ data: { agencyId: agency.id, name: "Main Office" } });
      await tx.user.create({
        data: {
          agencyId: agency.id, branchId: branch.id, name: data.name, email: data.email,
          passwordHash, role: "AGENCY_OWNER", emailVerified: new Date(),
        },
      });
      return agency;
    });
    await logAdmin(ctx, { action: "platform.agency.create", target: agency.id, newValue: data.agencyName });
    return json({ id: agency.id, name: agency.name }, 201);
  });
}
