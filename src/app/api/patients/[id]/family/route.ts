import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { requireUser, requireCapability } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().trim().min(1).max(120), email: z.string().email() });

const SAFE = { id: true, name: true, email: true, createdAt: true };

// Family accounts are always created UNDER a patient (Phase 8 — invite via patient side).
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireUser();
    requireCapability(ctx, "patients:read");
    const patient = await prisma.patient.findFirst({ where: { id: params.id, agencyId: ctx.agencyId }, select: { id: true } });
    if (!patient) throw Errors.notFound();
    const family = await prisma.user.findMany({
      where: { agencyId: ctx.agencyId, role: "FAMILY", familyPatientId: patient.id }, select: SAFE, orderBy: { name: "asc" },
    });
    return json(family);
  });
}

export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireUser();
    requireCapability(ctx, "patients:write");
    mutationGuard(req, "family", ctx.userId, RateLimits.write);
    const patient = await prisma.patient.findFirst({ where: { id: params.id, agencyId: ctx.agencyId }, select: { id: true } });
    if (!patient) throw Errors.notFound();

    const { name, email } = schema.parse(await req.json().catch(() => ({})));
    const lower = email.toLowerCase().trim();
    const exists = await prisma.user.findFirst({ where: { agencyId: ctx.agencyId, email: lower } });
    if (exists) throw Errors.conflict("A user with that email already exists");

    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const created = await prisma.user.create({
      data: {
        agencyId: ctx.agencyId, name, email: lower, role: "FAMILY",
        familyPatientId: patient.id, passwordHash: await bcrypt.hash(tempPassword, 12),
      },
      select: SAFE,
    });
    await logAdmin(ctx, { action: "family.invite", target: created.id });
    // tempPassword returned once to share (email delivery wired when a mailer is configured).
    return json({ ...created, tempPassword }, 201);
  });
}
