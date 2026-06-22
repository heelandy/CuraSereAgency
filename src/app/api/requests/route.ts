import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

// Staff: list all portal schedule requests for the agency.
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("scheduling:read");
    const rows = await prisma.scheduleRequest.findMany({
      where: { agencyId: ctx.agencyId },
      include: { patient: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return json(rows);
  });
}
