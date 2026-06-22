import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { portalPatientId } from "@/lib/portal";
import { PORTAL_ROLES } from "@/lib/enums";

export const dynamic = "force-dynamic";

// Portal: the caregivers this patient has worked with (for "request a specific
// caregiver"). Limited to caregivers tied to the patient's own visits — the
// portal never exposes the full agency roster.
export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    if (!PORTAL_ROLES.includes(ctx.role)) return json([]);
    const patientId = await portalPatientId(ctx);
    if (!patientId) return json([]);

    const visits = await prisma.visit.findMany({
      where: { agencyId: ctx.agencyId, patientId, caregiverId: { not: null } },
      select: { caregiver: { select: { id: true, firstName: true, lastName: true, discipline: true } } },
      distinct: ["caregiverId"],
      orderBy: { scheduledStart: "desc" },
      take: 50,
    });

    const seen = new Set<string>();
    const caregivers = [];
    for (const v of visits) {
      if (v.caregiver && !seen.has(v.caregiver.id)) {
        seen.add(v.caregiver.id);
        caregivers.push(v.caregiver);
      }
    }
    return json(caregivers);
  });
}
