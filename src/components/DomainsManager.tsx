"use client";

import { useEffect, useState } from "react";

type Domain = { id: string; domain: string; isPrimary: boolean; verified: boolean };

export function DomainsManager() {
  const [rows, setRows] = useState<Domain[]>([]);
  const [domain, setDomain] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/domains");
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/admin/domains", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ domain, isPrimary }),
    });
    setBusy(false);
    if (res.ok) { setDomain(""); setIsPrimary(false); await load(); }
    else { const j = await res.json().catch(() => ({})); setError(j.message || "Could not add domain."); }
  }

  async function remove(id: string) {
    if (!confirm("Remove this domain?")) return;
    const res = await fetch(`/api/admin/domains?id=${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <div className="card card-pad">
      <h3 className="font-semibold text-surface-900">Custom Domains</h3>
      <p className="muted mb-4 mt-0.5">Point a domain (e.g. portal.youragency.com) here so your agency&apos;s branding loads automatically for visitors. A CNAME to the platform is required before a domain verifies.</p>
      {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[220px]">
          <label className="label">Domain</label>
          <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="portal.youragency.com" required />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-surface-700">
          <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} /> Primary
        </label>
        <button className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add domain"}</button>
      </form>

      {rows.length > 0 && (
        <ul className="mt-4 space-y-2">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border border-surface-200 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-surface-800">{d.domain}</span>
                {d.isPrimary && <span className="badge-blue">Primary</span>}
                <span className={d.verified ? "badge-green" : "badge-amber"}>{d.verified ? "Verified" : "Pending verification"}</span>
              </div>
              <button className="btn-ghost btn-sm text-red-600" onClick={() => remove(d.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
