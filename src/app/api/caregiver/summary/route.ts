import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { caregiverForUser } from "@/lib/portal";

export const dynamic = "force-dynamic";

// Employee self-service summary: own hours, PTO, mileage, estimated gross pay.
export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    const cg = await caregiverForUser(ctx);
    if (!cg) return json(null);

    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay()); weekStart.setHours(0, 0, 0, 0);

    const [entries, weekEntries, pto, balance, mileage, agency] = await Promise.all([
      prisma.timeEntry.findMany({ where: { caregiverId: cg.id, status: { in: ["APPROVED", "EXPORTED", "LOCKED"] } }, select: { regularHours: true, overtimeHours: true } }),
      prisma.timeEntry.findMany({ where: { caregiverId: cg.id, clockIn: { gte: weekStart } }, select: { regularHours: true, overtimeHours: true } }),
      prisma.ptoRequest.findMany({ where: { caregiverId: cg.id }, orderBy: { createdAt: "desc" }, take: 5 }),
      prisma.ptoBalance.findUnique({ where: { caregiverId: cg.id } }),
      prisma.mileageEntry.aggregate({ where: { caregiverId: cg.id, status: { in: ["APPROVED", "PAID"] } }, _sum: { miles: true } }),
      prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: { mileageRate: true } }),
    ]);

    const totalReg = entries.reduce((s, e) => s + e.regularHours, 0);
    const totalOt = entries.reduce((s, e) => s + e.overtimeHours, 0);
    const weekReg = weekEntries.reduce((s, e) => s + e.regularHours, 0);
    const weekOt = weekEntries.reduce((s, e) => s + e.overtimeHours, 0);
    const rate = cg.hourlyRate ?? 0;
    const miles = mileage._sum.miles ?? 0;
    const mileageRate = agency?.mileageRate ?? 0.67;
    const estGross = totalReg * rate + totalOt * rate * 1.5 + miles * mileageRate;
    const ptoAvailable = balance
      ? balance.vacationHours + balance.sickHours + balance.holidayHours + balance.floatingHours - balance.usedHours
      : 0;

    return json({
      name: `${cg.firstName} ${cg.lastName}`,
      hourlyRate: rate,
      week: { regular: weekReg, overtime: weekOt },
      lifetime: { regular: totalReg, overtime: totalOt },
      miles, mileageRate,
      ptoAvailable,
      ptoBalance: balance,
      estGross,
      recentPto: pto,
    });
  });
}
