import { z } from "zod";
import { requireUser, can } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { supportMessageSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdParams = { params: { id: string } };

// Resolve a ticket the caller is allowed to see (own, or any in-agency for admins).
async function findTicket(ctx: Awaited<ReturnType<typeof requireUser>>, id: string) {
  const where = can(ctx, "admin:manage")
    ? { id, agencyId: ctx.agencyId }
    : { id, agencyId: ctx.agencyId, createdById: ctx.userId };
  const ticket = await prisma.supportTicket.findFirst({ where });
  if (!ticket) throw Errors.notFound();
  return ticket;
}

export function GET(_req: Request, { params }: IdParams) {
  return handle(async () => {
    const ctx = await requireUser();
    const ticket = await findTicket(ctx, params.id);
    const messages = await prisma.supportMessage.findMany({
      where: { ticketId: ticket.id }, orderBy: { createdAt: "asc" },
    });
    return json({ ...ticket, messages });
  });
}

// Agency side may close or reopen their own ticket.
const patchSchema = z.object({ status: z.enum(["OPEN", "CLOSED"]) });

export function PATCH(req: Request, { params }: IdParams) {
  return handle(async () => {
    const ctx = await requireUser();
    mutationGuard(req, "supportTicket", ctx.userId, RateLimits.write);
    await findTicket(ctx, params.id);
    const { status } = patchSchema.parse(await req.json().catch(() => ({})));
    const updated = await prisma.supportTicket.update({ where: { id: params.id }, data: { status }, select: { id: true, status: true } });
    return json(updated);
  });
}

// Post a reply (agency side). Replying reopens a resolved/closed ticket.
export function POST(req: Request, { params }: IdParams) {
  return handle(async () => {
    const ctx = await requireUser();
    mutationGuard(req, "supportMessage", ctx.userId, RateLimits.write);
    const ticket = await findTicket(ctx, params.id);
    const { body } = supportMessageSchema.parse(await req.json().catch(() => ({})));

    const message = await prisma.supportMessage.create({
      data: { ticketId: ticket.id, authorId: ctx.userId, authorName: ctx.name, fromPlatform: false, body },
    });
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "OPEN" : ticket.status, updatedAt: new Date() },
    });
    return json(message, 201);
  });
}
