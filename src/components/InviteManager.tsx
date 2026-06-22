"use client";

import { useEffect, useState } from "react";
import { INVITABLE_ROLES, ROLE_LABELS, type Role } from "@/lib/enums";
import { fmtDate } from "@/lib/format";

type Invite = { id: string; email: string; role: string; status: string; expiresAt: string; link: string };
type Branch = { id: string; name: string };

export function InviteManager() {
  const [rows, setRows] = useState<Invite[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("HHA");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const [iRes, bRes] = await Promise.all([fetch("/api/admin/invitations"), fetch("/api/r/branches")]);
    setRows(iRes.ok ? await iRes.json() : []);
    setBranches(bRes.ok ? await bRes.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function copy(link: string) {
    try { await navigator.clipboard.writeText(link); setCopied(link); setTimeout(() => setCopied(null), 1500); } catch { /* noop */ }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setLastLink(null);
    const res = await fetch("/api/admin/invitations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role, branchId: branchId || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { setEmail(""); setBranchId(""); setLastLink(j.link); await load(); }
    else setError(j.message || "Could not create the invitation.");
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this invitation?")) return;
    const res = await fetch(`/api/admin/invitations?id=${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  return (
    <div className="card mb-6">
      <div className="border-b border-surface-100 px-5 py-3.5">
        <h3 className="font-semibold">Invite an employee</h3>
        <p className="muted mt-0.5">Generate a registration link with a preset role and send it to your staff member. They set their own password.</p>
      </div>
      <form onSubmit={create} className="card-pad">
        {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {lastLink && (
          <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
            Invite created. Send this link:
            <div className="mt-1 flex items-center gap-2">
              <input className="input text-xs" value={lastLink} readOnly onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className="btn-secondary btn-sm" onClick={() => copy(lastLink)}>{copied === lastLink ? "Copied" : "Copy"}</button>
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-1"><label className="label">Email</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div>
            <label className="label">Role</label>
            <select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {INVITABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Branch (optional)</label>
            <select className="select" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">— None —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end"><button className="btn-primary" disabled={busy}>{busy ? "Creating…" : "Create invite link"}</button></div>
      </form>

      {rows.length > 0 && (
        <div className="border-t border-surface-100 px-5 py-4">
          <p className="mb-2 text-sm font-medium text-surface-600">Pending invitations</p>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-surface-200 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-surface-800">{r.email} <span className="badge-neutral ml-1">{ROLE_LABELS[r.role as Role] ?? r.role}</span></p>
                  <p className="text-xs text-surface-400">Expires {fmtDate(r.expiresAt)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button className="btn-secondary btn-sm" onClick={() => copy(r.link)}>{copied === r.link ? "Copied" : "Copy link"}</button>
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => revoke(r.id)}>Revoke</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
