import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";

export const dynamic = "force-dynamic";

// AI Automation layer (Phase 18/34). Rule-based insight engine over agency data
// — a deterministic stand-in for the ML models (no external LLM dependency).
// Regenerates the insight set on each run.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("ai:read");
    mutationGuard(req, "ai", ctx.userId, RateLimits.heavy);
    const agencyId = ctx.agencyId;
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);

    type New = { module: string; title: string; body: string; severity: string; entityType?: string; entityId?: string };
    const insights: New[] = [];

    // Compliance monitor
    const expiring = await prisma.complianceItem.findMany({
      where: { agencyId, expiresAt: { lte: in30, gte: now } },
      include: { caregiver: { select: { firstName: true, lastName: true } } },
    });
    if (expiring.length) {
      insights.push({
        module: "COMPLIANCE", severity: "WARNING",
        title: `${expiring.length} compliance item(s) expiring within 30 days`,
        body: expiring.slice(0, 8).map((e) => `${e.name}${e.caregiver ? ` — ${e.caregiver.firstName} ${e.caregiver.lastName}` : " (agency)"}`).join("; "),
      });
    }

    // Fall-risk engine
    const highFall = await prisma.assessment.findMany({
      where: { agencyId, fallRisk: "HIGH" },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { performedAt: "desc" }, take: 10,
    });
    for (const a of highFall) {
      insights.push({
        module: "FALL_RISK", severity: "CRITICAL",
        title: `Elevated fall risk: ${a.patient.firstName} ${a.patient.lastName}`,
        body: "Recent assessment indicates HIGH fall risk. Recommend home-safety evaluation and care-plan review.",
        entityType: "PATIENT", entityId: a.patient.id,
      });
    }

    // Staffing predictor — open shifts
    const openShifts = await prisma.visit.count({ where: { agencyId, status: "OPEN", scheduledStart: { gte: now } } });
    if (openShifts > 0) {
      insights.push({
        module: "STAFFING", severity: openShifts > 3 ? "WARNING" : "INFO",
        title: `${openShifts} open shift(s) need coverage`,
        body: "Use AI caregiver matching on the Scheduling board to fill open shifts and prevent missed visits.",
      });
    }

    // Revenue forecast — pipeline value
    const pipeline = await prisma.referral.aggregate({
      where: { agencyId, stage: { in: ["ACCEPTED", "ADMITTED", "ASSESSMENT_COMPLETED"] } },
      _sum: { estimatedRevenue: true },
    });
    const pipelineValue = pipeline._sum.estimatedRevenue ?? 0;
    if (pipelineValue > 0) {
      insights.push({
        module: "REVENUE_FORECAST", severity: "INFO",
        title: `Projected pipeline revenue: $${pipelineValue.toLocaleString()}`,
        body: "Based on referrals in late-stage pipeline. Prioritize assessments to accelerate admissions.",
      });
    }

    // Burnout — caregivers with overtime
    const otHeavy = await prisma.payrollEntry.findMany({
      where: { agencyId, overtimeHours: { gt: 4 } },
      include: { caregiver: { select: { firstName: true, lastName: true } } },
      take: 5,
    });
    for (const e of otHeavy) {
      insights.push({
        module: "RISK", severity: "WARNING",
        title: `Burnout risk: ${e.caregiver.firstName} ${e.caregiver.lastName}`,
        body: `Logged ${e.overtimeHours}h overtime last period. Consider redistributing visits.`,
      });
    }

    // Replace the AI insight set
    await prisma.aiInsight.deleteMany({ where: { agencyId } });
    if (insights.length) {
      await prisma.aiInsight.createMany({ data: insights.map((i) => ({ ...i, agencyId })) });
    }
    await logAdmin(ctx, { action: "ai.generate", newValue: String(insights.length) });

    return json({ generated: insights.length });
  });
}
