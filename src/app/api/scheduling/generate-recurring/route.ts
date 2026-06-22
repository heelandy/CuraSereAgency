import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";

export const dynamic = "force-dynamic";

const DAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const HORIZON_DAYS = 28;

// Scheduling depth (Phase 3): expand recurring templates ("WEEKLY:MO,WE,FR")
// into concrete visits over the next 4 weeks. Idempotent — skips occurrences
// that already exist for the patient at the same start time.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("scheduling:write");
    mutationGuard(req, "generateRecurring", ctx.userId, RateLimits.heavy);

    const templates = await prisma.visit.findMany({ where: { agencyId: ctx.agencyId, isRecurring: true } });
    let created = 0;

    for (const t of templates) {
      const m = /^WEEKLY:(.+)$/i.exec((t.recurrenceRule ?? "").trim());
      if (!m) continue;
      const days = m[1].split(",").map((s) => DAY[s.trim().toUpperCase()]).filter((d) => d !== undefined);
      if (!days.length) continue;

      const src = new Date(t.scheduledStart);
      const durationMs = new Date(t.scheduledEnd).getTime() - src.getTime();
      const hh = src.getHours();
      const mm = src.getMinutes();

      for (let i = 1; i <= HORIZON_DAYS; i++) {
        const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
        if (!days.includes(d.getDay())) continue;
        const occStart = new Date(d); occStart.setHours(hh, mm, 0, 0);
        if (occStart <= new Date()) continue;
        const occEnd = new Date(occStart.getTime() + durationMs);

        const exists = await prisma.visit.findFirst({
          where: { agencyId: ctx.agencyId, patientId: t.patientId, scheduledStart: occStart },
          select: { id: true },
        });
        if (exists) continue;

        await prisma.visit.create({
          data: {
            agencyId: ctx.agencyId, patientId: t.patientId, caregiverId: t.caregiverId,
            serviceType: t.serviceType, status: t.caregiverId ? "SCHEDULED" : "OPEN",
            scheduledStart: occStart, scheduledEnd: occEnd, isRecurring: false,
          },
        });
        created += 1;
      }
    }

    await logAdmin(ctx, { action: "scheduling.generateRecurring", newValue: String(created) });
    return json({ created });
  });
}
