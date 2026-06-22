import crypto from "node:crypto";
import { requireUser } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Send / resend an email-verification link to the current user.
export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireUser();
    mutationGuard(req, "verify", ctx.userId, RateLimits.auth);

    const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { emailVerified: true } });
    if (user?.emailVerified) return json({ alreadyVerified: true });

    const token = crypto.randomBytes(24).toString("base64url");
    await prisma.user.update({ where: { id: ctx.userId }, data: { emailVerifyToken: token } });

    const url = `${config.nextAuthUrl}/api/auth/verify?token=${token}`;
    const { delivered } = await sendMail({
      to: ctx.email,
      subject: "Verify your Cura_Sera email",
      text: `Hi ${ctx.name},\n\nPlease verify your email by visiting:\n${url}\n\nIf you didn't request this, ignore this message.`,
    });
    // In dev (no mail provider), return the link so the UI can show it.
    return json({ delivered, devLink: delivered ? undefined : url });
  });
}
