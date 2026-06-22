import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { caregiverForUser } from "@/lib/portal";
import { SELF_SERVICE_MIN_NOTICE_HOURS } from "@/lib/enums";

export const dynamic = "force-dynamic";

const schema = z.object({ visitId: z.string().min(1), message: z.string().trim().max(2000).optional() });

// Caregiver requests to drop/change one of their OWN assigned shifts. Allowed only
// when the visit is >=24h away; the scheduler approves (which re-opens the shift).
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    const cg = await caregiverForUser(ctx);
    if (!cg) throw Errors.forbidden("Only caregivers can request shift changes");
    mutationGuard(req, "shiftChange", ctx.userId, RateLimits.write);

    const { visitId, message } = schema.parse(await req.json().catch(() => ({})));
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, agencyId: ctx.agencyId, caregiverId: cg.id, status: { notIn: ["COMPLETED", "CANCELED"] } },
    });
    if (!visit) throw Errors.notFound("Assigned shift not found");

    const minMs = SELF_SERVICE_MIN_NOTICE_HOURS * 3_600_000;
    if (new Date(visit.scheduledStart).getTime() - Date.now() < minMs) {
      throw Errors.badRequest(`Shift changes must be requested at least ${SELF_SERVICE_MIN_NOTICE_HOURS} hours ahead. Please call your scheduler.`);
    }

    const dup = await prisma.scheduleRequest.findFirst({
      where: { agencyId: ctx.agencyId, type: "DECLINE", status: "PENDING", requestedById: ctx.userId, visitId },
      select: { id: true },
    });
    if (dup) throw Errors.conflict("You already requested a change for this shift");

    await prisma.scheduleRequest.create({
      data: {
        agencyId: ctx.agencyId, patientId: visit.patientId, visitId,
        type: "DECLINE", message: message || `${cg.firstName} ${cg.lastName} requested to drop this shift`,
        requestedById: ctx.userId, requestedByName: ctx.name,
      },
    });

    const recipients = await prisma.user.findMany({
      where: { agencyId: ctx.agencyId, active: true, role: { in: ["SCHEDULER", "NURSE_SUPERVISOR", "AGENCY_OWNER", "AGENCY_ADMIN"] } },
      select: { id: true },
    });
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          agencyId: ctx.agencyId, userId: r.id, kind: "SHIFT",
          title: "Shift change requested", body: `${ctx.name} asked to drop a shift — approval needed`, href: "/dashboard/requests",
        })),
      });
    }
    return json({ ok: true }, 201);
  });
}
