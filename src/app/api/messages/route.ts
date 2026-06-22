import { requireCap, hasCapability, canMessage } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { conversationSchema } from "@/lib/validation";
import type { Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

// Conversations list + create (Phase 10). Visibility is participant-scoped:
// office admins (admin:manage) oversee all threads; everyone else sees only the
// conversations they belong to.
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("messaging:read");
    const seesAll = hasCapability(ctx.role, "admin:manage");
    const conversations = await prisma.conversation.findMany({
      where: {
        agencyId: ctx.agencyId,
        ...(seesAll ? {} : { participants: { some: { userId: ctx.userId } } }),
      },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
        _count: { select: { messages: true } },
      },
    });
    return json(conversations);
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("messaging:write");
    mutationGuard(req, "conversation", ctx.userId, RateLimits.write);
    const data = conversationSchema.parse(await req.json().catch(() => ({})));

    // Resolve recipients in this agency, drop the sender, dedupe.
    const recipientIds = [...new Set(data.participantIds.filter((id) => id !== ctx.userId))];
    if (recipientIds.length === 0) throw Errors.badRequest("Pick at least one other recipient.");
    const recipients = await prisma.user.findMany({
      where: { id: { in: recipientIds }, agencyId: ctx.agencyId, active: true },
      select: { id: true, role: true },
    });
    if (recipients.length === 0) throw Errors.badRequest("No valid recipients found.");

    // Messaging rule: enforce who this sender is allowed to message.
    for (const r of recipients) {
      if (!canMessage(ctx.role, r.role as Role)) {
        throw Errors.forbidden("You can only message a supervisor or scheduler.");
      }
    }

    const created = await prisma.conversation.create({
      data: {
        agencyId: ctx.agencyId, subject: data.subject ?? null,
        kind: recipients.length > 1 ? "GROUP" : "DIRECT", createdById: ctx.userId,
        participants: {
          create: [
            { agencyId: ctx.agencyId, userId: ctx.userId, role: ctx.role },
            ...recipients.map((r) => ({ agencyId: ctx.agencyId, userId: r.id, role: r.role })),
          ],
        },
      },
    });
    return json(created, 201);
  });
}
