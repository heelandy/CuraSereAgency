import Link from "next/link";
import { Logo } from "@/components/ui";
import { BrandStyle } from "@/components/BrandStyle";
import { InviteAcceptForm } from "@/components/InviteAcceptForm";
import { getPublicBranding, getAgencyBranding } from "@/lib/branding";
import { findValidInvite } from "@/lib/invite";
import { ROLE_LABELS, type Role } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await findValidInvite(params.token);
  // Brand by the inviting agency when known, else by host.
  const branding = invite ? await getAgencyBranding(invite.agencyId) : await getPublicBranding();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-surface-50 to-amber-50 px-4 py-10">
      <BrandStyle branding={branding} />
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Link href="/"><Logo name={branding.portalName} logoUrl={branding.logoUrl} /></Link></div>
        <div className="card card-pad">
          {!invite ? (
            <>
              <h1 className="text-xl font-semibold text-surface-900">Invitation not valid</h1>
              <p className="muted mt-1">This invitation link is invalid, already used, or expired. Please ask your agency for a new one.</p>
              <Link href="/login" className="btn-secondary mt-4 inline-flex">Go to sign in</Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-surface-900">Join {branding.portalName}</h1>
              <p className="muted mb-5 mt-1">
                You&apos;ve been invited as <strong>{ROLE_LABELS[invite.role as Role] ?? invite.role}</strong>. Set your name and password to get started.
              </p>
              <InviteAcceptForm token={params.token} email={invite.email} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
