"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  status: string; // PENDING | REJECTED
  legalName: string;
  npi: string;
  licenseNumber: string;
  npiVerified: boolean;
  lookupResult: string | null;
  notes: string | null;
  canEdit: boolean;
};

// Shown to an agency user whose agency hasn't been verified yet. They can browse
// only the minimum; owners/admins can review the auto NPI check and resubmit.
export function VerificationPending(p: Props) {
  const router = useRouter();
  const rejected = p.status === "REJECTED";
  const [form, setForm] = useState({ legalName: p.legalName, npi: p.npi, licenseNumber: p.licenseNumber });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  async function resubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    const res = await fetch("/api/agency/verification", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.message || "Could not submit. Check the NPI and try again."); return; }
    setEditing(false); router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className={`card card-pad border-l-4 ${rejected ? "border-l-red-500" : "border-l-amber-500"}`}>
        <span className={rejected ? "badge-red" : "badge-amber"}>{rejected ? "Verification rejected" : "Pending verification"}</span>
        <h1 className="mt-3 text-2xl font-semibold text-surface-900">
          {rejected ? "We couldn't verify your agency" : "Your agency is being verified"}
        </h1>
        <p className="muted mt-1">
          {rejected
            ? "Please review the note below, correct your details, and resubmit."
            : "Our team is reviewing your agency. Most reviews are quick. Until then, access is limited to the essentials."}
        </p>

        {rejected && p.notes && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Reviewer note:</strong> {p.notes}
          </div>
        )}

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Legal business name" value={p.legalName} />
          <Field label="NPI" value={p.npi} />
          <Field label="State license #" value={p.licenseNumber || "—"} />
          <div>
            <dt className="text-xs uppercase tracking-wide text-surface-400">Automated NPI check</dt>
            <dd className="mt-0.5 flex items-center gap-2 text-sm text-surface-800">
              <span className={p.npiVerified ? "badge-green" : "badge-amber"}>{p.npiVerified ? "Matched" : "Needs review"}</span>
            </dd>
          </div>
        </dl>
        {p.lookupResult && <p className="mt-2 rounded-lg bg-surface-50 px-3 py-2 text-xs text-surface-500">{p.lookupResult}</p>}

        {p.canEdit && (
          <div className="mt-5 border-t border-surface-100 pt-4">
            {!editing ? (
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                {rejected ? "Correct & resubmit" : "Update details"}
              </button>
            ) : (
              <form onSubmit={resubmit} className="space-y-3">
                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
                <div>
                  <label className="label">Legal business name</label>
                  <input className="input" value={form.legalName} onChange={(e) => setForm((s) => ({ ...s, legalName: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">NPI (10 digits)</label>
                    <input className="input" value={form.npi} inputMode="numeric" onChange={(e) => setForm((s) => ({ ...s, npi: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required />
                  </div>
                  <div>
                    <label className="label">State license #</label>
                    <input className="input" value={form.licenseNumber} onChange={(e) => setForm((s) => ({ ...s, licenseNumber: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        <p className="muted mt-5 text-xs">Need help? Open a ticket from <a className="text-brand-600 hover:underline" href="/dashboard/support">Support</a>.</p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-surface-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-surface-800">{value}</dd>
    </div>
  );
}
