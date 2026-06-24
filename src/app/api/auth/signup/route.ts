import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validation";
import { sendMail } from "@/lib/mail";
import { config } from "@/lib/config";
import { lookupNpi } from "@/lib/npi";

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

    // Auto-check the NPI against the national NPPES registry. This INFORMS the
    // platform owner's review — it never auto-approves. New agencies stay PENDING.
    const npi = await lookupNpi(data.npi, data.legalName);

    // Normalize the requested subdomain; only use it if it's free (else leave it
    // unset — the owner can pick one later in the Configuration Center).
    let slug: string | undefined;
    if (data.slug) {
      const normalized = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 40);
      if (normalized) {
        const taken = await prisma.agency.findUnique({ where: { slug: normalized }, select: { id: true } });
        if (!taken) slug = normalized;
      }
    }

    const { user } = await prisma.$transaction(async (tx) => {
      const agency = await tx.agency.create({
        data: {
          name: data.agencyName,
          portalName: data.portalName || data.agencyName,
          slug,
          legalName: data.legalName,
          npi: data.npi,
          licenseNumber: data.licenseNumber || undefined,
          // Pending until the platform owner approves (auto NPI check is advisory).
          verificationStatus: "PENDING",
          npiVerified: npi.matched,
          npiLookupResult: npi.summary,
          primaryColor: data.primaryColor || undefined,
          secondaryColor: data.secondaryColor || undefined,
          logoUrl: data.logoUrl || undefined,
          supportEmail: data.supportEmail || undefined,
          supportPhone: data.supportPhone || undefined,
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
