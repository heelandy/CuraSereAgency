"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SignupForm() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setDevLink(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agencyName, name, email, password }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setLoading(false); setError(j.message || "Could not create your agency."); return; }

    // Sign in immediately; verification can be completed later.
    const signin = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
    setLoading(false);
    if (signin?.error) {
      // Account created but auto sign-in failed — send them to login.
      router.push("/login");
      return;
    }
    if (j.devLink) { setDevLink(j.devLink); return; } // show dev verify link before leaving
    router.push("/dashboard");
    router.refresh();
  }

  if (devLink) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Agency created. In development, verify your email with this link:
        </div>
        <a href={devLink} className="block break-all text-sm text-brand-600 underline">{devLink}</a>
        <button className="btn-primary w-full py-2.5" onClick={() => { router.push("/dashboard"); router.refresh(); }}>
          Continue to dashboard
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div>
        <label className="label" htmlFor="agencyName">Agency name</label>
        <input id="agencyName" className="input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Acme Home Care" required />
      </div>
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-surface-400">At least 8 characters. You&apos;ll be the Agency Owner and can invite your team.</p>
      </div>
      <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
        {loading ? "Creating your agency…" : "Create agency account"}
      </button>
      <p className="text-center text-sm text-surface-500">
        Already have an account? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
