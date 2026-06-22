"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, totp, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  function quickFill(e: string) {
    setEmail(e);
    setPassword("password123");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" className="input" value={email}
          onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input" value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      <div>
        <label className="label" htmlFor="totp">Authenticator code <span className="text-surface-400">(if 2FA enabled)</span></label>
        <input id="totp" type="text" inputMode="numeric" className="input" value={totp}
          onChange={(e) => setTotp(e.target.value)} placeholder="123456" autoComplete="one-time-code" />
      </div>
      <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 text-xs text-surface-500">
        <p className="mb-2 font-medium text-surface-600">Demo accounts (password: password123)</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ["Owner", "owner@curasera.com"],
            ["Scheduler", "scheduler@curasera.com"],
            ["Nurse Sup.", "nurse@curasera.com"],
            ["RN", "rn@curasera.com"],
            ["LPN", "lpn@curasera.com"],
            ["HHA", "hha@curasera.com"],
            ["CNA", "cna@curasera.com"],
            ["Billing", "billing@curasera.com"],
            ["Family", "family@curasera.com"],
            ["Patient", "patient@curasera.com"],
          ].map(([label, e]) => (
            <button key={e} type="button" onClick={() => quickFill(e)}
              className="rounded-lg border border-surface-300 bg-white px-2 py-1 hover:bg-surface-100">
              {label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
