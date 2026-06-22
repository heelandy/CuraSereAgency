"use client";

import { useState } from "react";

export function EmailVerification({ initialVerified, email }: { initialVerified: boolean; email: string }) {
  const [verified] = useState(initialVerified);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function resend() {
    setBusy(true); setMsg(null); setDevLink(null);
    const res = await fetch("/api/auth/verify/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg("Could not send verification email."); return; }
    if (j.alreadyVerified) { setMsg("Your email is already verified."); return; }
    if (j.delivered) setMsg(`Verification email sent to ${email}.`);
    else { setMsg("Mail provider not configured (dev mode). Use this link to verify:"); setDevLink(j.devLink); }
  }

  return (
    <div className="card card-pad">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-surface-900">Email Verification</h3>
          <p className="muted mt-0.5">{email}</p>
        </div>
        <span className={verified ? "badge-green" : "badge-amber"}>{verified ? "Verified" : "Unverified"}</span>
      </div>
      {msg && <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-surface-700">{msg}</div>}
      {devLink && <a href={devLink} className="mt-2 block break-all text-sm text-brand-600 underline">{devLink}</a>}
      {!verified && <button className="btn-primary mt-4" onClick={resend} disabled={busy}>{busy ? "Sending…" : "Send verification email"}</button>}
    </div>
  );
}
