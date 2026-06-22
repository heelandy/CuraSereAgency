import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { LoginForm } from "@/components/LoginForm";
import { BrandStyle } from "@/components/BrandStyle";
import { getPublicBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Branding is resolved from the host so each agency's domain shows its own
  // portal name / logo / colors on the login screen (white-label).
  const branding = await getPublicBranding();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-surface-50 to-amber-50 px-4">
      <BrandStyle branding={branding} />
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Link href="/"><Logo name={branding.portalName} logoUrl={branding.logoUrl} /></Link></div>
        <div className="card card-pad">
          <h1 className="text-xl font-semibold text-surface-900">Welcome back</h1>
          <p className="muted mb-5 mt-1">Sign in to the {branding.portalName} portal.</p>
          <Suspense fallback={<div className="muted">Loading…</div>}>
            <LoginForm />
          </Suspense>
          {branding.agencyId === null && (
            <p className="mt-5 border-t border-surface-100 pt-4 text-center text-sm text-surface-500">
              New agency? <Link href="/signup" className="text-brand-600 hover:underline">Create an account</Link>
            </p>
          )}
          {(branding.supportEmail || branding.supportPhone) && (
            <p className="mt-4 text-center text-xs text-surface-400">
              Need help? {[branding.supportEmail, branding.supportPhone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-surface-500">
          <Link href="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
