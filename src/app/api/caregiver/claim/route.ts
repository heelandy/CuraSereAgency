import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { caregiverForUser, qualifiedFor } from "@/lib/portal";

export const dynamic = "force-dynamic";

const schema = z.object({ visitId: z.string().min(1) });

// Caregiver claims an open shift → creates a pending claim for scheduler approval.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    const cg = await caregiverForUser(ctx);
    if (!cg) throw Errors.forbidden("Only caregivers can claim shifts");
    mutationGuard(req, "claim", ctx.userId, RateLimits.write);

    const { visitId } = schema.parse(await req.json().catch(() => ({})));
    const visit = await prisma.visit.findFirst({ where: { id: visitId, agencyId: ctx.agencyId, status: "OPEN" } });
    if (!visit) throw Errors.notFound("Open shift not found");
    if (!qualifiedFor(cg.discipline, visit.serviceType)) {
      throw Errors.badRequest("You are not qualified for this shift type");
    }

    const dup = await prisma.scheduleRequest.findFirst({
      where: { agencyId: ctx.agencyId, type: "CLAIM", status: "PENDING", requestedById: ctx.userId, visitId },
      select: { id: true },
    });
    if (dup) throw Errors.conflict("You already claimed this shift");

    await prisma.scheduleRequest.create({
      data: {
        agencyId: ctx.agencyId, patientId: visit.patientId, visitId,
        type: "CLAIM", message: `Shift claim by ${cg.firstName} ${cg.lastName} (${cg.discipline})`,
        requestedById: ctx.userId, requestedByName: ctx.name,
      },
    });

    // Notify schedulers / owners / admins.
    const recipients = await prisma.user.findMany({
      where: { agencyId: ctx.agencyId, active: true, role: { in: ["SCHEDULER", "AGENCY_OWNER", "AGENCY_ADMIN"] } },
      select: { id: true },
    });
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          agencyId: ctx.agencyId, userId: r.id, kind: "SHIFT",
          title: "Open shift claimed", body: `${ctx.name} claimed a shift — approval needed`, href: "/dashboard/requests",
        })),
      });
    }
    return json({ ok: true }, 201);
  });
}
