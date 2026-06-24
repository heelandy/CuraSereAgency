import crypto from "node:crypto";
import { requireCap, requireVerified } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { logAdmin } from "@/lib/audit";
import { sendMail } from "@/lib/mail";
import { config } from "@/lib/config";
import { inviteCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVITE_TTL_DAYS = 14;

// Employee invitations: an owner/admin creates a link (with a preset role) and
// sends it; the invitee registers into THIS agency via /invite/<token>.
export function GET() {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    const rows = await prisma.invitation.findMany({
      where: { agencyId: ctx.agencyId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, branchId: true, status: true, expiresAt: true, createdAt: true, token: true },
    });
    const base = config.nextAuthUrl;
    return json(rows.map((r) => ({ ...r, link: `${base}/invite/${r.token}` })));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    requireVerified(ctx); // can't add staff until the agency is verified
    mutationGuard(req, "invite", ctx.userId, RateLimits.write);
    const data = inviteCreateSchema.parse(await req.json().catch(() => ({})));

    // Email must be free across the platform (login is by email) and not already invited.
    const existingUser = await prisma.user.findFirst({ where: { email: data.email }, select: { id: true } });
    if (existingUser) throw Errors.conflict("Someone with that email already has an account.");
    const pending = await prisma.invitation.findFirst({
      where: { agencyId: ctx.agencyId, email: data.email, status: "PENDING" }, select: { id: true },
    });
    if (pending) throw Errors.conflict("There's already a pending invite for that email.");

    const token = crypto.randomBytes(24).toString("base64url");
    const invite = await prisma.invitation.create({
      data: {
        agencyId: ctx.agencyId, email: data.email, role: data.role, branchId: data.branchId ?? null,
        token, invitedById: ctx.userId, invitedByName: ctx.name,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
      },
      select: { id: true, email: true, role: true, expiresAt: true },
    });

    const link = `${config.nextAuthUrl}/invite/${token}`;
    const agency = await prisma.agency.findUnique({ where: { id: ctx.agencyId }, select: { name: true, portalName: true, emailFromName: true } });
    const brand = agency?.emailFromName || agency?.portalName || agency?.name || "your care agency";
    const { delivered } = await sendMail({
      to: data.email,
      fromName: brand,
      subject: `You're invited to join ${brand}`,
      text: `Hello,\n\n${ctx.name} invited you to join ${brand} on Cura_Sera.\nAccept your invitation and set your password:\n${link}\n\nThis link expires in ${INVITE_TTL_DAYS} days.`,
    });

    await logAdmin(ctx, { action: "invite.create", target: invite.id, newValue: `${data.email} (${data.role})` });
    // Return the link so the agency can copy/share it even when email isn't configured.
    return json({ ...invite, link, delivered }, 201);
  });
}

export function DELETE(req: Request) {
  return handle(async () => {
    const ctx = await requireCap("admin:manage");
    mutationGuard(req, "invite", ctx.userId, RateLimits.write);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw Errors.badRequest("id required");
    const existing = await prisma.invitation.findFirst({ where: { id, agencyId: ctx.agencyId }, select: { id: true } });
    if (!existing) throw Errors.notFound();
    await prisma.invitation.update({ where: { id: existing.id }, data: { status: "REVOKED" } });
    await logAdmin(ctx, { action: "invite.revoke", target: existing.id });
    return json({ ok: true });
  });
}
