import { requireUser, can } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { supportTicketSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A user sees tickets they opened; an agency admin (admin:manage) sees ALL of
// their agency's tickets. Always tenant-scoped.
function scope(ctx: Awaited<ReturnType<typeof requireUser>>) {
  return can(ctx, "admin:manage")
    ? { agencyId: ctx.agencyId }
    : { agencyId: ctx.agencyId, createdById: ctx.userId };
}

export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    const tickets = await prisma.supportTicket.findMany({
      where: scope(ctx),
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    return json(tickets.map((t) => ({
      id: t.id, subject: t.subject, category: t.category, priority: t.priority,
      status: t.status, createdByName: t.createdByName, updatedAt: t.updatedAt,
      messageCount: t._count.messages,
    })));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    mutationGuard(req, "supportTicket", ctx.userId, RateLimits.write);
    const data = supportTicketSchema.parse(await req.json().catch(() => ({})));

    const ticket = await prisma.supportTicket.create({
      data: {
        agencyId: ctx.agencyId, createdById: ctx.userId, createdByName: ctx.name,
        subject: data.subject, category: data.category, priority: data.priority, status: "OPEN",
        messages: { create: { authorId: ctx.userId, authorName: ctx.name, fromPlatform: false, body: data.body } },
      },
      select: { id: true },
    });
    return json({ id: ticket.id }, 201);
  });
}
