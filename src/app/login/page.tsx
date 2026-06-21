import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-surface-50 to-amber-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Link href="/"><Logo /></Link></div>
        <div className="card card-pad">
          <h1 className="text-xl font-semibold text-surface-900">Welcome back</h1>
          <p className="muted mb-5 mt-1">Sign in to the Cura_Sera operating system.</p>
          <Suspense fallback={<div className="muted">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-sm text-surface-500">
          <Link href="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
