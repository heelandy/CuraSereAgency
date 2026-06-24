import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { supportMessageSchema, supportUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdParams = { params: { id: string } };

// Full thread for one ticket (any agency).
export function GET(_req: Request, { params }: IdParams) {
  return handle(async () => {
    await requireCap("platform:manage");
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: params.id },
      include: { agency: { select: { name: true } }, messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket) throw Errors.notFound();
    return json(ticket);
  });
}

// Change status / priority.
export function PATCH(req: Request, { params }: IdParams) {
  return handle(async () => {
    const ctx = await requireCap("platform:manage");
    mutationGuard(req, "platformSupport", ctx.userId, RateLimits.write);
    const data = supportUpdateSchema.parse(await req.json().catch(() => ({})));
    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!ticket) throw Errors.notFound();
    const updated = await prisma.supportTicket.update({
      where: { id: params.id },
      data: { ...(data.status ? { status: data.status } : {}), ...(data.priority ? { priority: data.priority } : {}) },
      select: { id: true, status: true, priority: true },
    });
    await logAdmin(ctx, { action: "support.update", target: params.id, newValue: JSON.stringify(data) });
    return json(updated);
  });
}

// Reply as platform support. Acknowledging an OPEN ticket moves it to IN_PROGRESS.
export function POST(req: Request, { params }: IdParams) {
  return handle(async () => {
    const ctx = await requireCap("platform:manage");
    mutationGuard(req, "platformSupport", ctx.userId, RateLimits.write);
    const ticket = await prisma.supportTicket.findUnique({ where: { id: params.id }, select: { id: true, status: true } });
    if (!ticket) throw Errors.notFound();
    const { body } = supportMessageSchema.parse(await req.json().catch(() => ({})));

    const message = await prisma.supportMessage.create({
      data: { ticketId: ticket.id, authorId: ctx.userId, authorName: ctx.name, fromPlatform: true, body },
    });
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: ticket.status === "OPEN" ? "IN_PROGRESS" : ticket.status, updatedAt: new Date() },
    });
    await logAdmin(ctx, { action: "support.reply", target: ticket.id });
    return json(message, 201);
  });
}
