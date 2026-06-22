import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/http";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Consume an email-verification token (clicked from the email link).
export function GET(req: Request) {
  return handle(async () => {
    const base = config.nextAuthUrl;
    const token = new URL(req.url).searchParams.get("token");
    if (token) {
      const user = await prisma.user.findFirst({ where: { emailVerifyToken: token }, select: { id: true } });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date(), emailVerifyToken: null } });
        return Response.redirect(`${base}/dashboard?verified=1`);
      }
    }
    return Response.redirect(`${base}/login?verified=0`);
  });
}
