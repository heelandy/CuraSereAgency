import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { caregiverForUser, qualifiedFor } from "@/lib/portal";

export const dynamic = "force-dynamic";

// Open Shift Marketplace: a caregiver sees OPEN shifts they qualify for, with
// LIMITED info only (no patient name/address) until a claim is approved.
export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    const cg = await caregiverForUser(ctx);
    if (!cg) return json([]);

    const open = await prisma.visit.findMany({
      where: { agencyId: ctx.agencyId, status: "OPEN", scheduledStart: { gte: new Date() } },
      include: { patient: { select: { city: true, requiredSkills: true } } },
      orderBy: { scheduledStart: "asc" },
      take: 100,
    });

    // Existing pending claims by this caregiver (to disable re-claim).
    const myClaims = await prisma.scheduleRequest.findMany({
      where: { agencyId: ctx.agencyId, type: "CLAIM", status: "PENDING", requestedById: ctx.userId },
      select: { visitId: true },
    });
    const claimed = new Set(myClaims.map((c) => c.visitId));

    const shifts = open
      .filter((v) => qualifiedFor(cg.discipline, v.serviceType))
      .map((v) => ({
        id: v.id,
        scheduledStart: v.scheduledStart,
        scheduledEnd: v.scheduledEnd,
        serviceType: v.serviceType,
        area: v.patient?.city ?? "—", // general location area only
        requiredSkills: v.patient?.requiredSkills ?? "",
        durationMins: Math.round((new Date(v.scheduledEnd).getTime() - new Date(v.scheduledStart).getTime()) / 60000),
        claimed: claimed.has(v.id),
      }));

    return json(shifts);
  });
}
