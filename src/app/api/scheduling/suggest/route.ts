import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";

export const dynamic = "force-dynamic";

// Scheduling intelligence (Phase 3): rank caregivers for a visit by certification
// suitability, availability, language and overtime prevention.
export function GET(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("scheduling:read");
    const visitId = new URL(req.url).searchParams.get("visitId");
    if (!visitId) throw Errors.badRequest("visitId required");

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, agencyId: ctx.agencyId },
      include: { patient: true },
    });
    if (!visit) throw Errors.notFound("Visit not found");

    const weekday = new Date(visit.scheduledStart).getDay();
    const weekStart = new Date(visit.scheduledStart); weekStart.setDate(weekStart.getDate() - weekday); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);

    const caregivers = await prisma.caregiver.findMany({
      where: { agencyId: ctx.agencyId, status: "ACTIVE" },
      include: { availabilities: true },
    });

    const needsSkilled = visit.serviceType === "SKILLED_NURSING";
    const skilledDisciplines = ["RN", "LPN"];

    const ranked = await Promise.all(
      caregivers.map(async (c) => {
        let score = 10;
        const reasons: string[] = [];

        // Certification / discipline suitability
        if (needsSkilled) {
          if (skilledDisciplines.includes(c.discipline)) { score += 40; reasons.push("Skilled discipline"); }
          else { score -= 20; reasons.push("Not skilled-qualified"); }
        } else {
          score += 20; reasons.push("Qualified for personal care");
        }

        // Availability on the visit weekday
        if (c.availabilities.some((a) => a.dayOfWeek === weekday)) { score += 25; reasons.push("Available this day"); }

        // Overtime prevention — hours already scheduled this week
        const weekVisits = await prisma.visit.findMany({
          where: { caregiverId: c.id, scheduledStart: { gte: weekStart, lt: weekEnd }, status: { notIn: ["CANCELED"] } },
          select: { scheduledStart: true, scheduledEnd: true },
        });
        const hours = weekVisits.reduce((sum, v) => sum + (new Date(v.scheduledEnd).getTime() - new Date(v.scheduledStart).getTime()) / 3600_000, 0);
        const cap = c.maxHoursPerWeek ?? 40;
        if (hours + 2 <= cap) { score += 20; reasons.push(`Under hours cap (${hours.toFixed(0)}/${cap}h)`); }
        else { score -= 15; reasons.push(`Near/over OT (${hours.toFixed(0)}/${cap}h)`); }

        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          discipline: c.discipline,
          languages: c.languages,
          weeklyHours: Math.round(hours),
          score,
          reasons,
        };
      }),
    );

    ranked.sort((a, b) => b.score - a.score);
    return json({ visitId, suggestions: ranked.slice(0, 5) });
  });
}
