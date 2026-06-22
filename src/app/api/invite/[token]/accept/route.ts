import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { handle, json, Errors } from "@/lib/http";
import { mutationGuard, RateLimits } from "@/lib/rate-limit";
import { inviteAcceptSchema } from "@/lib/validation";
import { findValidInvite, FIELD_ROLE_DISCIPLINE } from "@/lib/invite";
import type { Role } from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: an invited employee accepts the invite — creates their account in the
// inviting agency with the preset role (and a caregiver record for field roles).
export function POST(req: Request, { params }: { params: { token: string } }) {
  return handle(async () => {
    mutationGuard(req, "inviteAccept", params.token, RateLimits.auth);
    const invite = await findValidInvite(params.token);
    if (!invite) throw Errors.badRequest("This invitation is invalid or has expired.");

    const data = inviteAcceptSchema.parse(await req.json().catch(() => ({})));

    // Guard against the email being taken between invite and acceptance.
    const taken = await prisma.user.findFirst({ where: { email: invite.email }, select: { id: true } });
    if (taken) throw Errors.conflict("An account already exists for this email — try signing in.");

    const passwordHash = await bcrypt.hash(data.password, 12);
    const discipline = FIELD_ROLE_DISCIPLINE[invite.role as Role];

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          agencyId: invite.agencyId, branchId: invite.branchId ?? null,
          name: data.name, email: invite.email, passwordHash,
          role: invite.role, emailVerified: new Date(), // invite link proves the email
        },
      });
      // Auto-provision a caregiver profile for field roles so My Shifts works.
      if (discipline) {
        const [first, ...rest] = data.name.trim().split(/\s+/);
        await tx.caregiver.create({
          data: {
            agencyId: invite.agencyId, branchId: invite.branchId ?? null, userId: user.id,
            firstName: first || data.name, lastName: rest.join(" ") || "",
            discipline, status: "ONBOARDING", email: invite.email, maxHoursPerWeek: 40,
          },
        });
      }
      await tx.invitation.update({ where: { id: invite.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    });

    // Client then signs in with these credentials.
    return json({ ok: true, email: invite.email }, 201);
  });
}
