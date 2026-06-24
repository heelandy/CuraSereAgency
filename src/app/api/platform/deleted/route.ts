import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

// Platform super-admin: the deleted-items archive across ALL agencies. Every
// CRUD delete snapshots its row here, attributed to the user who deleted it, so
// the platform owner can review (and recover) what each user removed.
// Optional ?userId= / ?agencyId= filters narrow the log.
export function GET(req: Request) {
  return handle(async () => {
    await requireCap("platform:manage");
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId")?.trim();
    const agencyId = url.searchParams.get("agencyId")?.trim();

    const rows = await prisma.deletedRecord.findMany({
      where: {
        ...(userId ? { deletedById: userId } : {}),
        ...(agencyId ? { agencyId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { agency: { select: { name: true } } },
    });

    return json(
      rows.map((r) => ({
        id: r.id,
        resource: r.resource,
        recordId: r.recordId,
        label: r.label,
        data: r.data,
        deletedById: r.deletedById,
        deletedByName: r.deletedByName ?? "—",
        agencyName: r.agency?.name ?? "—",
        createdAt: r.createdAt,
      })),
    );
  });
}
