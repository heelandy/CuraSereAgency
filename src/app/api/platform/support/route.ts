import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";

export const dynamic = "force-dynamic";

// Platform super-admin: EVERY agency's support tickets. Optional ?status= filter.
// This is one of the few intentionally cross-tenant endpoints (platform:manage).
export function GET(req: Request) {
  return handle(async () => {
    await requireCap("platform:manage");
    const status = new URL(req.url).searchParams.get("status")?.trim();
    const tickets = await prisma.supportTicket.findMany({
      where: status ? { status } : {},
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: { agency: { select: { name: true } }, _count: { select: { messages: true } } },
    });
    return json(tickets.map((t) => ({
      id: t.id, subject: t.subject, category: t.category, priority: t.priority, status: t.status,
      createdByName: t.createdByName, agencyName: t.agency?.name ?? "—",
      messageCount: t._count.messages, updatedAt: t.updatedAt, createdAt: t.createdAt,
    })));
  });
}
