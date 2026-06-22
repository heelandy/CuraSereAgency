import Link from "next/link";
import { Logo } from "@/components/ui";
import { SignupForm } from "@/components/SignupForm";
import { BrandStyle } from "@/components/BrandStyle";
import { getPublicBranding } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const branding = await getPublicBranding();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-surface-50 to-amber-50 px-4 py-10">
      <BrandStyle branding={branding} />
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Link href="/"><Logo name={branding.portalName} logoUrl={branding.logoUrl} /></Link></div>
        <div className="card card-pad">
          <h1 className="text-xl font-semibold text-surface-900">Start your agency</h1>
          <p className="muted mb-5 mt-1">Create your home care agency on Cura_Sera. You&apos;ll be the Agency Owner.</p>
          <SignupForm />
        </div>
        <p className="mt-4 text-center text-sm text-surface-500">
          <Link href="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
