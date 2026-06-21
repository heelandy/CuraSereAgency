import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/http";
import { toCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Payroll export (Phase 12) for QuickBooks / ADP / Gusto / Paychex.
// Column headers vary by target; values are formula-injection-neutralized.
const HEADERS: Record<string, Record<string, string>> = {
  quickbooks: { employee: "Employee", hours: "Reg Hours", ot: "OT Hours", rate: "Rate", gross: "Total Pay" },
  adp: { employee: "Employee Name", hours: "Regular", ot: "Overtime", rate: "Rate", gross: "Gross" },
  gusto: { employee: "Name", hours: "Regular hours", ot: "Overtime hours", rate: "Pay rate", gross: "Gross pay" },
  paychex: { employee: "Worker", hours: "RegHrs", ot: "OTHrs", rate: "PayRate", gross: "GrossPay" },
  generic: { employee: "Employee", hours: "Hours", ot: "Overtime", rate: "Rate", gross: "Gross Pay" },
};

export function GET(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("payroll:read");
    const format = (new URL(req.url).searchParams.get("format") ?? "generic").toLowerCase();
    const h = HEADERS[format] ?? HEADERS.generic;

    const entries = await prisma.payrollEntry.findMany({
      where: { agencyId: ctx.agencyId },
      include: { caregiver: { select: { firstName: true, lastName: true, hourlyRate: true } } },
      orderBy: { periodStart: "desc" },
    });

    const rows = entries.map((e) => ({
      [h.employee]: `${e.caregiver.firstName} ${e.caregiver.lastName}`,
      Period: `${fmtDate(e.periodStart)} - ${fmtDate(e.periodEnd)}`,
      [h.hours]: e.hoursWorked,
      [h.ot]: e.overtimeHours,
      Mileage: e.mileage,
      [h.rate]: e.caregiver.hourlyRate ?? 0,
      Bonus: e.bonus,
      [h.gross]: e.grossPay,
      Status: e.status,
    }));

    const csv = toCsv(rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payroll-${format}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
