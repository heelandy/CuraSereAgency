import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Messages within a conversation (Phase 10).
export function GET(_req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("messaging:read");
    const convo = await prisma.conversation.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
    if (!convo) throw Errors.notFound();
    const messages = await prisma.message.findMany({
      where: { conversationId: convo.id },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true } } },
    });
    return json({ conversation: convo, messages });
  });
}

export function POST(req: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const ctx = await requireCap("messaging:write");
    mutationGuard(req, "message", ctx.userId, RateLimits.write);
    const convo = await prisma.conversation.findFirst({ where: { id: params.id, agencyId: ctx.agencyId } });
    if (!convo) throw Errors.notFound();

    const body = await req.json().catch(() => ({}));
    const data = messageSchema.parse({ ...body, conversationId: convo.id });
    const created = await prisma.message.create({
      data: { agencyId: ctx.agencyId, conversationId: convo.id, senderId: ctx.userId, body: data.body, attachmentUrl: data.attachmentUrl },
      include: { sender: { select: { id: true, name: true } } },
    });
    await prisma.conversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } });
    return json(created, 201);
  });
}
