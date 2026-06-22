import { prisma } from "./prisma";
import type { Role } from "./enums";

// A PENDING, unexpired invitation for the given token (or null).
export async function findValidInvite(token: string) {
  const inv = await prisma.invitation.findUnique({ where: { token } });
  if (!inv || inv.status !== "PENDING") return null;
  if (new Date(inv.expiresAt).getTime() < Date.now()) return null;
  return inv;
}

// Field-staff roles get a caregiver record auto-provisioned on accept (so My
// Shifts works immediately). Maps the role to a caregiver discipline.
export const FIELD_ROLE_DISCIPLINE: Partial<Record<Role, string>> = {
  RN: "RN", LPN: "LPN", MED_TECH: "MED_TECH", HHA: "HHA", CAREGIVER: "COMPANION",
};
