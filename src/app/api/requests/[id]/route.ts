import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { scheduleRequestReviewSchema } from "@/lib/validation";
import { qualifiedFor } from "@/lib/portal";

export const dynamic = "force-dynamic";

// Staff: review (approve/decline) a portal schedule request. Approving a request
// also performs the underlying scheduling action (assign / reassign / create).
export function PATCH(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("scheduling:write");
    mutationGuard(req, "request", ctx.userId, RateLimits.write);
    const existing = await prisma.scheduleRequest.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
    if (!existing) throw Errors.notFound();

    const data = scheduleRequestReviewSchema.parse(await req.json().catch(() => ({})));

    // ── Side-effects on APPROVE (run first so validation can block the approval) ──
    if (data.status === "APPROVED") {
      // Open-shift CLAIM → assign the claiming caregiver to the visit.
      if (existing.type === "CLAIM" && existing.visitId && existing.requestedById) {
        const cg = await prisma.caregiver.findFirst({ where: { userId: existing.requestedById, agencyId: ctx.agencyId }, select: { id: true } });
        const visit = await prisma.visit.findFirst({ where: { id: existing.visitId, agencyId: ctx.agencyId } });
        if (cg && visit && visit.status === "OPEN") {
          await prisma.visit.update({ where: { id: visit.id }, data: { caregiverId: cg.id, status: "SCHEDULED" } });
        }
      }

      // Patient requested a specific caregiver → reassign the target visit.
      if (existing.type === "CAREGIVER_CHANGE" && existing.preferredCaregiverId) {
        const cg = await prisma.caregiver.findFirst({
          where: { id: existing.preferredCaregiverId, agencyId: ctx.agencyId },
          select: { id: true, discipline: true },
        });
        if (!cg) throw Errors.badRequest("Requested caregiver no longer exists — choose another.");
        const visit = existing.visitId
          ? await prisma.visit.findFirst({ where: { id: existing.visitId, agencyId: ctx.agencyId } })
          : await prisma.visit.findFirst({
              where: { agencyId: ctx.agencyId, patientId: existing.patientId, scheduledStart: { gte: new Date() }, status: { notIn: ["CANCELED", "COMPLETED"] } },
              orderBy: { scheduledStart: "asc" },
            });
        if (!visit) throw Errors.badRequest("No upcoming visit to reassign for this patient.");
        if (!qualifiedFor(cg.discipline, visit.serviceType)) {
          throw Errors.badRequest(`${cg.discipline} is not qualified for this ${visit.serviceType.replace(/_/g, " ").toLowerCase()} visit.`);
        }
        await prisma.visit.update({ where: { id: visit.id }, data: { caregiverId: cg.id, status: "SCHEDULED" } });
      }

      // Patient requested an additional visit → create it (assigned if a qualified
      // caregiver was requested, otherwise an open shift for the marketplace).
      if (existing.type === "NEW_VISIT") {
        const start = existing.preferredDate ? new Date(existing.preferredDate) : new Date(Date.now() + 2 * 86_400_000);
        if (!existing.preferredDate) start.setHours(9, 0, 0, 0);
        const end = new Date(start.getTime() + 2 * 3_600_000);
        let caregiverId: string | null = null;
        if (existing.preferredCaregiverId) {
          const cg = await prisma.caregiver.findFirst({ where: { id: existing.preferredCaregiverId, agencyId: ctx.agencyId }, select: { id: true, discipline: true } });
          if (cg && qualifiedFor(cg.discipline, "PERSONAL_CARE")) caregiverId = cg.id;
        }
        await prisma.visit.create({
          data: {
            agencyId: ctx.agencyId, patientId: existing.patientId, caregiverId,
            serviceType: "PERSONAL_CARE", status: caregiverId ? "SCHEDULED" : "OPEN",
            scheduledStart: start, scheduledEnd: end,
          },
        });
      }
    }

    const updated = await prisma.scheduleRequest.update({
      where: { id: params.id },
      data: { status: data.status, reviewNote: data.reviewNote ?? null, reviewedById: ctx.userId },
    });

    // Notify the requester of the decision.
    if (existing.requestedById && data.status !== "PENDING") {
      await prisma.notification.create({
        data: {
          agencyId: ctx.agencyId, userId: existing.requestedById, kind: "REQUEST",
          title: `Your request was ${data.status.toLowerCase()}`,
          body: data.reviewNote ?? undefined, href: "/portal",
        },
      });
    }
    await logAdmin(ctx, { action: "request.review", target: params.id, newValue: data.status });
    return json(updated);
  });
}
