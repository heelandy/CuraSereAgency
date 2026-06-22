import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { portalPatientId } from "@/lib/portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ name: z.string().trim().min(1).max(120), email: z.string().email() });
const SAFE = { id: true, name: true, email: true, createdAt: true };

// A PATIENT invites their own family members (Phase 8). Family register only under a patient.
export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    if (ctx.role !== "PATIENT") throw Errors.forbidden();
    const patientId = await portalPatientId(ctx);
    if (!patientId) return json([]);
    const family = await prisma.user.findMany({
      where: { agencyId: ctx.agencyId, role: "FAMILY", familyPatientId: patientId }, select: SAFE, orderBy: { name: "asc" },
    });
    return json(family);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    if (ctx.role !== "PATIENT") throw Errors.forbidden("Only the patient can invite family");
    mutationGuard(req, "family", ctx.userId, RateLimits.write);
    const patientId = await portalPatientId(ctx);
    if (!patientId) throw Errors.badRequest("No linked patient record");

    const { name, email } = schema.parse(await req.json().catch(() => ({})));
    const lower = email.toLowerCase().trim();
    const exists = await prisma.user.findFirst({ where: { agencyId: ctx.agencyId, email: lower } });
    if (exists) throw Errors.conflict("A user with that email already exists");

    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const created = await prisma.user.create({
      data: {
        agencyId: ctx.agencyId, name, email: lower, role: "FAMILY",
        familyPatientId: patientId, passwordHash: await bcrypt.hash(tempPassword, 12),
      },
      select: SAFE,
    });
    return json({ ...created, tempPassword }, 201);
  });
}
