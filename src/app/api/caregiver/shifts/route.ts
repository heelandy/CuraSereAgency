import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { caregiverForUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

// A caregiver's own assigned upcoming shifts (full patient detail — they're assigned).
export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    const cg = await caregiverForUser(ctx);
    if (!cg) return json([]);

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const shifts = await prisma.visit.findMany({
      where: { agencyId: ctx.agencyId, caregiverId: cg.id, scheduledStart: { gte: start } },
      include: {
        patient: { select: { firstName: true, lastName: true, addressLine: true, city: true, phone: true } },
        evv: { select: { checkInAt: true, checkOutAt: true, verification: true } },
      },
      orderBy: { scheduledStart: "asc" },
      take: 100,
    });
    return json(shifts);
  });
}
