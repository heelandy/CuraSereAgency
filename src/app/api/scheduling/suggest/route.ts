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
      include: { availabilities: true, skills: { include: { skill: true } } },
    });

    const needsSkilled = visit.serviceType === "SKILLED_NURSING";
    const skilledDisciplines = ["RN", "LPN"];
    const requiredSkills = (visit.patient.requiredSkills ?? "")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const genderPref = visit.patient.genderPreference?.toLowerCase();
    const patientCity = visit.patient.city?.toLowerCase();

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

        // Skills-matrix matching
        if (requiredSkills.length) {
          const cgSkills = c.skills.map((s) => s.skill.name.toLowerCase());
          const matched = requiredSkills.filter((r) => cgSkills.includes(r));
          if (matched.length) { score += 10 * matched.length; reasons.push(`Skills ${matched.length}/${requiredSkills.length}`); }
          else { score -= 5; reasons.push("Missing required skills"); }
        }
        // Gender preference
        if (genderPref && c.gender && genderPref === c.gender.toLowerCase()) { score += 10; reasons.push("Gender preference met"); }
        // Experience
        if (c.yearsExperience) { score += Math.min(10, c.yearsExperience); reasons.push(`${c.yearsExperience}y exp`); }
        // Proximity proxy (same city)
        if (patientCity && c.city && patientCity === c.city.toLowerCase()) { score += 10; reasons.push("Same city"); }

        return {
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          discipline: c.discipline,
          languages: c.languages,
          weeklyHours: Math.round(hours),
          score,
          matchPct: Math.max(0, Math.min(100, Math.round(score))),
          reasons,
        };
      }),
    );

    ranked.sort((a, b) => b.score - a.score);
    return json({ visitId, suggestions: ranked.slice(0, 5) });
  });
}
