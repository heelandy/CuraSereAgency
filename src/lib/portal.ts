import { prisma } from "./prisma";
import type { Ctx } from "./authz";

// Resolve the patient a portal account (PATIENT / FAMILY) is attached to.
export async function portalPatientId(ctx: Ctx): Promise<string | null> {
  if (ctx.role === "PATIENT") {
    const p = await prisma.patient.findFirst({
      where: { agencyId: ctx.agencyId, userId: ctx.userId },
      select: { id: true },
    });
    return p?.id ?? null;
  }
  const u = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { familyPatientId: true } });
  return u?.familyPatientId ?? null;
}

// Resolve the caregiver record linked to a staff user (for the caregiver portal /
// open-shift marketplace). Returns null if the user isn't a caregiver.
export async function caregiverForUser(ctx: Ctx) {
  return prisma.caregiver.findFirst({
    where: { userId: ctx.userId, agencyId: ctx.agencyId },
  });
}

// Disciplines qualified to work a given service type (scope of practice).
export function qualifiedFor(discipline: string, serviceType: string): boolean {
  const required: Record<string, string[]> = {
    SKILLED_NURSING: ["RN", "LPN"],
    THERAPY: ["THERAPIST", "RN"],
  };
  const allowed = required[serviceType];
  return !allowed || allowed.includes(discipline);
}
