import { requireCap, patientAssignmentScoped } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["check-in", "check-out"]),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  method: z.enum(["GPS", "MOBILE", "QR", "MANUAL"]).optional(),
  signatureName: z.string().trim().max(120).optional(),
});

// EVV check-in / check-out (Phase 4). Stamps GPS + time, verifies the visit,
// and drives visit lifecycle (IN_PROGRESS → COMPLETED).
export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("evv:write");
    mutationGuard(req, "evv", ctx.userId, RateLimits.write);

    const { action, lat, lng, method, signatureName } = bodySchema.parse(await req.json().catch(() => ({})));
    const visit = await prisma.visit.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
    if (!visit) throw Errors.notFound("Visit not found");

    // Isolation: a field caregiver may only check in/out of a visit assigned to
    // them. Supervisors/owners (non-assignment-scoped) may act on any visit.
    if (patientAssignmentScoped(ctx.role)) {
      const cg = await prisma.caregiver.findFirst({ where: { userId: ctx.userId, agencyId: ctx.agencyId }, select: { id: true } });
      if (!cg || visit.caregiverId !== cg.id) throw Errors.forbidden("You can only verify your own assigned visits.");
    }

    const now = new Date();
    if (action === "check-in") {
      await prisma.evvRecord.upsert({
        where: { visitId: visit.id },
        create: { visitId: visit.id, checkInAt: now, checkInLat: lat, checkInLng: lng, checkInMethod: method ?? "GPS", verification: "PENDING" },
        update: { checkInAt: now, checkInLat: lat, checkInLng: lng, checkInMethod: method ?? "GPS", verification: "PENDING" },
      });
      await prisma.visit.update({ where: { id: visit.id }, data: { status: "IN_PROGRESS", actualStart: now } });
      await logAdmin(ctx, { action: "evv.checkin", target: visit.id });
    } else {
      const existing = await prisma.evvRecord.findUnique({ where: { visitId: visit.id } });
      const checkIn = existing?.checkInAt ?? visit.actualStart ?? now;
      const duration = Math.max(0, Math.round((now.getTime() - new Date(checkIn).getTime()) / 60000));
      await prisma.evvRecord.upsert({
        where: { visitId: visit.id },
        create: { visitId: visit.id, checkOutAt: now, checkOutLat: lat, checkOutLng: lng, durationMinutes: duration, verification: "VERIFIED", signatureName: signatureName ?? null },
        update: { checkOutAt: now, checkOutLat: lat, checkOutLng: lng, durationMinutes: duration, verification: "VERIFIED", signatureName: signatureName ?? undefined },
      });
      await prisma.visit.update({ where: { id: visit.id }, data: { status: "COMPLETED", actualEnd: now } });
      await logAdmin(ctx, { action: "evv.checkout", target: visit.id });
    }

    const updated = await prisma.visit.findUnique({ where: { id: visit.id }, include: { evv: true } });
    return json(updated);
  });
}
