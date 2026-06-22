import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/http";
import { toCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Caregiver roster export.
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("caregivers:read");
    const rows = await prisma.caregiver.findMany({ where: { agencyId: ctx.agencyId }, orderBy: { lastName: "asc" } });
    const csv = toCsv(rows.map((c) => ({
      Name: `${c.firstName} ${c.lastName}`, Discipline: c.discipline, Status: c.status,
      Email: c.email ?? "", Phone: c.phone ?? "", Languages: c.languages ?? "",
      Gender: c.gender ?? "", Experience: c.yearsExperience ?? "", Hired: fmtDate(c.hireDate),
    })));
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="roster-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  });
}
