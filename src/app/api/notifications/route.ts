import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// In-app notifications for the current user.
export function GET() {
  return handle(async () => {
    const ctx = await requireUser();
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: ctx.userId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.notification.count({ where: { userId: ctx.userId, readAt: null } }),
    ]);
    return json({ items, unread });
  });
}

// Mark all as read.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    mutationGuard(req, "notif", ctx.userId, RateLimits.write);
    await prisma.notification.updateMany({ where: { userId: ctx.userId, readAt: null }, data: { readAt: new Date() } });
    return json({ ok: true });
  });
}
