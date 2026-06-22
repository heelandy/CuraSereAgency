import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validation";
import { sendMail } from "@/lib/mail";
import { config } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Self-serve SaaS signup: creates a brand-new agency and makes the registrant its
// Agency Owner. The role is fixed server-side (never trusted from the client);
// staff are invited/created later from Admin > Users. The owner can then enable a
// white-label name/logo/colors for their tenant in the Configuration Center.
export function POST(req: Request) {
  return handle(async () => {
    const data = signupSchema.parse(await req.json().catch(() => ({})));
    mutationGuard(req, "signup", data.email, RateLimits.auth);

    // Keep credential login deterministic: an email may exist in only one tenant.
    const existing = await prisma.user.findFirst({ where: { email: data.email }, select: { id: true } });
    if (existing) throw Errors.conflict("An account with that email already exists. Try signing in instead.");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const token = crypto.randomBytes(24).toString("base64url");

    const { user } = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: data.agencyName,
          portalName: data.agencyName,
          plan: "STARTER",
          subscriptionStatus: "trialing",
          trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
        },
      });
      const branch = await tx.branch.create({
        data: { agencyId: agency.id, name: "Main Office" },
      });
      const user = await tx.user.create({
        data: {
          agencyId: agency.id, branchId: branch.id,
          name: data.name, email: data.email, passwordHash,
          role: "AGENCY_OWNER", emailVerifyToken: token,
        },
      });
      return { agency, user };
    });

    const url = `${config.nextAuthUrl}/api/auth/verify?token=${token}`;
    const { delivered } = await sendMail({
      to: user.email,
      subject: "Welcome to Cura_Sera — verify your email",
      text: `Hi ${user.name},\n\nYour agency "${data.agencyName}" is ready. Please verify your email:\n${url}\n\nYou can sign in now and verify later.`,
    });

    // In dev (no mail provider) return the link so the UI can surface it.
    return json({ ok: true, email: user.email, delivered, devLink: delivered ? undefined : url }, 201);
  });
}
