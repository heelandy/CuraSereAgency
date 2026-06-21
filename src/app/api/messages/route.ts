import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { conversationSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Conversations list + create (Phase 10).
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("messaging:read");
    const conversations = await prisma.conversation.findMany({
      where: { agencyId: ctx.agencyId },
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
    const created = await prisma.conversation.create({ data: { ...data, agencyId: ctx.agencyId } });
    return json(created, 201);
  });
}
