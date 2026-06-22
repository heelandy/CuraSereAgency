import { z } from "zod";
import { Prisma } from "@prisma/client";
import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { normalizeHost } from "@/lib/branding";

export const dynamic = "force-dynamic";

const addSchema = z.object({ domain: z.string().trim().min(3).max(255), isPrimary: z.boolean().optional() });

// White-label custom domains for this agency (tenant resolution by host).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    const domains = await prisma.agencyDomain.findMany({
      where: { agencyId: ctx.agencyId }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return json(domains);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "domain", ctx.userId, RateLimits.write);
    const { domain, isPrimary } = addSchema.parse(await req.json().catch(() => ({})));
    // Strip protocol/path/port → bare hostname.
    const host = normalizeHost(domain.replace(/^https?:\/\//, "").split("/")[0]);
    if (!host.includes(".")) throw Errors.badRequest("Enter a full domain, e.g. portal.youragency.com");

    try {
      if (isPrimary) {
        await prisma.agencyDomain.updateMany({ where: { agencyId: ctx.agencyId }, data: { isPrimary: false } });
      }
      const created = await prisma.agencyDomain.create({
        data: { agencyId: ctx.agencyId, domain: host, isPrimary: isPrimary ?? false },
      });
      await logAdmin(ctx, { action: "domain.add", target: host });
      return json(created, 201);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw Errors.conflict("That domain is already registered.");
      }
      throw e;
    }
  });
}

export function DELETE(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "domain", ctx.userId, RateLimits.write);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw Errors.badRequest("id required");
    // Scope delete to this agency (IDOR-safe).
    const existing = await prisma.agencyDomain.findFirst({ where: { id, agencyId: ctx.agencyId }, select: { id: true, domain: true } });
    if (!existing) throw Errors.notFound();
    await prisma.agencyDomain.delete({ where: { id: existing.id } });
    await logAdmin(ctx, { action: "domain.remove", target: existing.domain });
    return json({ ok: true });
  });
}
