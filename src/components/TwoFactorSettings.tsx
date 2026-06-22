"use client";

import { useState } from "react";

export function TwoFactorSettings({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauth, setOtpauth] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(j.message || "Something went wrong"); return null; }
    return j;
  }

  async function setup() {
    const j = await call("setup");
    if (j) { setSecret(j.secret); setOtpauth(j.otpauthUrl); setMsg("Add the secret to your authenticator app, then enter a code to enable."); }
  }
  async function enable() {
    const j = await call("enable", { token });
    if (j) { setEnabled(true); setSecret(null); setOtpauth(null); setToken(""); setMsg("Two-factor authentication is now enabled."); }
  }
  async function disable() {
    const j = await call("disable");
    if (j) { setEnabled(false); setMsg("Two-factor authentication disabled."); }
  }

  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-surface-900">Two-Factor Authentication</h3>
          <p className="muted mt-0.5">Require a TOTP code (Google Authenticator, Authy, 1Password) at sign-in.</p>
        </div>
        <span className={enabled ? "badge-green" : "badge-neutral"}>{enabled ? "Enabled" : "Disabled"}</span>
      </div>

      {msg && <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700">{msg}</div>}

      {!enabled && !secret && (
        <button className="btn-primary mt-4" onClick={setup} disabled={busy}>Set up 2FA</button>
      )}

      {secret && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-surface-50 p-3">
            <p className="text-xs uppercase tracking-wide text-surface-400">Secret key</p>
            <p className="font-mono text-sm text-surface-800 break-all">{secret}</p>
            <p className="mt-2 break-all text-xs text-surface-400">{otpauth}</p>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="label">Enter the 6-digit code</label>
              <input className="input" inputMode="numeric" value={token} onChange={(e) => setToken(e.target.value)} placeholder="123456" />
            </div>
            <button className="btn-primary" onClick={enable} disabled={busy}>Enable</button>
          </div>
        </div>
      )}

      {enabled && (
        <button className="btn-secondary mt-4" onClick={disable} disabled={busy}>Disable 2FA</button>
      )}
    </div>
  );
}
