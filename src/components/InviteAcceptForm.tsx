"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function InviteAcceptForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await fetch(`/api/invite/${token}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setLoading(false); setError(j.message || "Could not accept the invitation."); return; }

    const signin = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
    setLoading(false);
    if (signin?.error) { router.push("/login"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div>
        <label className="label">Email</label>
        <input className="input bg-surface-50" value={email} disabled readOnly />
      </div>
      <div>
        <label className="label" htmlFor="name">Your full name</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Create a password</label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-surface-400">At least 8 characters.</p>
      </div>
      <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
        {loading ? "Setting up your account…" : "Accept invitation"}
      </button>
    </form>
  );
}
