"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/format";

type Agency = {
  id: string; name: string; legalName: string | null; npi: string | null; licenseNumber: string | null;
  npiVerified: boolean; npiLookupResult: string | null; verificationStatus: string; createdAt: string;
};

// Platform super-admin: review and approve/reject agencies awaiting verification.
// The auto NPI (NPPES) result is advisory — a human always decides.
export function AgencyVerificationQueue() {
  const [rows, setRows] = useState<Agency[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/platform/agencies");
    const all: Agency[] = res.ok ? await res.json() : [];
    setRows(all.filter((a) => a.verificationStatus === "PENDING"));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(a: Agency, verificationStatus: "VERIFIED" | "REJECTED") {
    let verificationNotes: string | undefined;
    if (verificationStatus === "REJECTED") {
      const note = prompt(`Reason for rejecting ${a.name}? (shown to the agency)`);
      if (note === null) return;
      verificationNotes = note;
    } else if (!confirm(`Approve ${a.name} (${a.legalName ?? "—"})? They'll get full access.`)) {
      return;
    }
    setBusy(a.id);
    await fetch(`/api/platform/agencies/${a.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationStatus, ...(verificationNotes !== undefined ? { verificationNotes } : {}) }),
    });
    setBusy(null);
    await load();
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3.5">
        <div>
          <h3 className="font-semibold">Agency verification {rows.length > 0 && <span className="badge-amber ml-1">{rows.length}</span>}</h3>
          <p className="muted mt-0.5 text-sm">Approve or reject new agencies. The NPI check is advisory — you decide.</p>
        </div>
      </div>
      {loading ? <p className="muted p-5">Loading…</p> : rows.length === 0 ? (
        <p className="muted p-5">No agencies awaiting verification. 🎉</p>
      ) : (
        <ul className="divide-y divide-surface-100">
          {rows.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-surface-900">{a.name}</p>
                  <span className={a.npiVerified ? "badge-green" : "badge-amber"}>{a.npiVerified ? "NPI matched" : "NPI needs review"}</span>
                </div>
                <p className="mt-0.5 text-sm text-surface-600">{a.legalName ?? "—"} · NPI {a.npi ?? "—"}{a.licenseNumber ? ` · License ${a.licenseNumber}` : ""}</p>
                {a.npiLookupResult && <p className="mt-1 rounded-lg bg-surface-50 px-2.5 py-1.5 text-xs text-surface-500">{a.npiLookupResult}</p>}
                <p className="mt-1 text-xs text-surface-400">Applied {fmtDate(a.createdAt)}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button className="btn-primary btn-sm" disabled={busy === a.id} onClick={() => decide(a, "VERIFIED")}>Approve</button>
                <button className="btn-ghost btn-sm text-red-600" disabled={busy === a.id} onClick={() => decide(a, "REJECTED")}>Reject</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
