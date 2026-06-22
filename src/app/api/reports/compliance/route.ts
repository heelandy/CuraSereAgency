import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/http";
import { toCsv } from "@/lib/csv";
import { fmtDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Compliance status export (licenses, certs, training, AHCA items).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("compliance:read");
    const rows = await prisma.complianceItem.findMany({
      where: { agencyId: ctx.agencyId },
      include: { caregiver: { select: { firstName: true, lastName: true } } },
      orderBy: { expiresAt: "asc" },
    });
    const csv = toCsv(rows.map((c) => ({
      Item: c.name, Category: c.category, Scope: c.scope,
      Caregiver: c.caregiver ? `${c.caregiver.firstName} ${c.caregiver.lastName}` : "Agency",
      Status: c.status, Issued: fmtDate(c.issuedAt), Expires: fmtDate(c.expiresAt),
    })));
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="compliance-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  });
}
