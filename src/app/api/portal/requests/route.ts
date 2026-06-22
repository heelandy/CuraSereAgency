import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { portalRequestSchema } from "@/lib/validation";
import { portalPatientId } from "@/lib/portal";
import { PORTAL_ROLES, SELF_SERVICE_MIN_NOTICE_HOURS } from "@/lib/enums";

// Change types that target a dated visit (subject to the advance-notice rule).
const DATED_TYPES = new Set(["RESCHEDULE", "CANCEL", "NEW_VISIT", "CAREGIVER_CHANGE"]);

export const dynamic = "force-dynamic";

// Portal: patients/family submit schedule/availability change requests, and
// list their own (Phase 7 — request → staff approve).
export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    if (!PORTAL_ROLES.includes(ctx.role)) throw Errors.forbidden();
    const patientId = await portalPatientId(ctx);
    if (!patientId) return json([]);
    const rows = await prisma.scheduleRequest.findMany({
      where: { agencyId: ctx.agencyId, patientId }, orderBy: { createdAt: "desc" },
    });
    return json(rows);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    if (!PORTAL_ROLES.includes(ctx.role)) throw Errors.forbidden();
    mutationGuard(req, "portalRequest", ctx.userId, RateLimits.write);
    const patientId = await portalPatientId(ctx);
    if (!patientId) throw Errors.badRequest("No linked patient record");

    const data = portalRequestSchema.parse(await req.json().catch(() => ({})));

    // Advance-notice rule: change requests must be made at least 24h before the
    // visit (inside 48h they still require senior staff to apply on approval).
    if (DATED_TYPES.has(data.type)) {
      const minMs = SELF_SERVICE_MIN_NOTICE_HOURS * 3_600_000;
      if (data.visitId) {
        const v = await prisma.visit.findFirst({
          where: { id: data.visitId, agencyId: ctx.agencyId, patientId }, select: { scheduledStart: true },
        });
        if (v && new Date(v.scheduledStart).getTime() - Date.now() < minMs) {
          throw Errors.badRequest(`Changes must be requested at least ${SELF_SERVICE_MIN_NOTICE_HOURS} hours before the visit. Please call the office.`);
        }
      }
      if (data.preferredDate && new Date(data.preferredDate).getTime() - Date.now() < minMs) {
        throw Errors.badRequest(`Please choose a date at least ${SELF_SERVICE_MIN_NOTICE_HOURS} hours from now.`);
      }
    }

    const created = await prisma.scheduleRequest.create({
      data: { ...data, agencyId: ctx.agencyId, patientId, requestedById: ctx.userId, requestedByName: ctx.name },
    });

    // Notify schedulers / owners / admins in-app.
    const recipients = await prisma.user.findMany({
      where: { agencyId: ctx.agencyId, active: true, role: { in: ["SCHEDULER", "AGENCY_OWNER", "AGENCY_ADMIN"] } },
      select: { id: true },
    });
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          agencyId: ctx.agencyId, userId: r.id, kind: "REQUEST",
          title: "New schedule request", body: `${ctx.name}: ${data.type.replace(/_/g, " ").toLowerCase()}`,
          href: "/dashboard/requests",
        })),
      });
    }
    return json(created, 201);
  });
}
