"use client";

import { useEffect, useState } from "react";

type Agency = {
  id: string; name: string; slug: string | null; plan: string; subscriptionStatus: string; active: boolean;
  createdAt: string; _count: { users: number; patients: number; caregivers: number; branches: number; visits: number };
};

export function PlatformConsole({ homeAgencyId }: { homeAgencyId: string }) {
  const [rows, setRows] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ agencyName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/platform/agencies");
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function viewAs(agencyId: string) {
    setBusy(agencyId);
    const res = await fetch("/api/platform/act-as", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agencyId }),
    });
    setBusy(null);
    if (res.ok) { window.location.href = "/dashboard"; }
  }

  async function toggleActive(a: Agency) {
    if (!confirm(`${a.active ? "Suspend" : "Reactivate"} ${a.name}?`)) return;
    setBusy(a.id);
    await fetch(`/api/platform/agencies/${a.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !a.active }),
    });
    setBusy(null);
    await load();
  }

  async function createAgency(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setBusy("new");
    const res = await fetch("/api/platform/agencies", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(null);
    if (res.ok) { setForm({ agencyName: "", name: "", email: "", password: "" }); setCreating(false); await load(); }
    else { const j = await res.json().catch(() => ({})); setError(j.message || "Could not create agency."); }
  }

  const totals = rows.reduce(
    (t, a) => ({
      users: t.users + a._count.users, patients: t.patients + a._count.patients,
      caregivers: t.caregivers + a._count.caregivers, visits: t.visits + a._count.visits,
      active: t.active + (a.active ? 1 : 0), suspended: t.suspended + (a.active ? 0 : 1),
      trialing: t.trialing + (a.subscriptionStatus === "trialing" ? 1 : 0),
    }),
    { users: 0, patients: 0, caregivers: 0, visits: 0, active: 0, suspended: 0, trialing: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <div className="card card-pad"><p className="muted">Agencies</p><p className="mt-1 text-2xl font-semibold">{rows.length}</p></div>
        <div className="card card-pad"><p className="muted">Active</p><p className="mt-1 text-2xl font-semibold text-brand-600">{totals.active}</p></div>
        <div className="card card-pad"><p className="muted">Suspended</p><p className={`mt-1 text-2xl font-semibold ${totals.suspended ? "text-red-600" : ""}`}>{totals.suspended}</p></div>
        <div className="card card-pad"><p className="muted">Trialing</p><p className="mt-1 text-2xl font-semibold">{totals.trialing}</p></div>
        <div className="card card-pad"><p className="muted">Users</p><p className="mt-1 text-2xl font-semibold">{totals.users}</p></div>
        <div className="card card-pad"><p className="muted">Patients</p><p className="mt-1 text-2xl font-semibold">{totals.patients}</p></div>
        <div className="card card-pad"><p className="muted">Visits</p><p className="mt-1 text-2xl font-semibold">{totals.visits}</p></div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3.5">
          <h3 className="font-semibold">Agencies</h3>
          <button className="btn-primary btn-sm" onClick={() => { setCreating((v) => !v); setError(null); }}>
            {creating ? "Cancel" : "New agency"}
          </button>
        </div>

        {creating && (
          <form onSubmit={createAgency} className="space-y-3 border-b border-surface-100 bg-surface-50 p-5">
            {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Agency name</label><input className="input" value={form.agencyName} onChange={(e) => setForm((s) => ({ ...s, agencyName: e.target.value }))} required /></div>
              <div><label className="label">Owner name</label><input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required /></div>
              <div><label className="label">Owner email</label><input type="email" className="input" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} required /></div>
              <div><label className="label">Temp password</label><input type="text" className="input" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} minLength={8} required /></div>
            </div>
            <div className="flex justify-end"><button className="btn-primary" disabled={busy === "new"}>Create agency + owner</button></div>
          </form>
        )}

        {loading ? <p className="muted p-5">Loading agencies…</p> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Agency</th><th>Plan</th><th>Status</th><th>Branches</th><th>Users</th><th>Patients</th><th>Caregivers</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className="font-medium text-surface-900">{a.name}{a.id === homeAgencyId && <span className="badge-neutral ml-2">Home</span>}</div>
                      {a.slug && <div className="text-xs text-surface-400">{a.slug}.yourplatform.com</div>}
                    </td>
                    <td>{a.plan}</td>
                    <td><span className={a.active ? "badge-green" : "badge-red"}>{a.active ? a.subscriptionStatus : "Suspended"}</span></td>
                    <td>{a._count.branches}</td>
                    <td>{a._count.users}</td>
                    <td>{a._count.patients}</td>
                    <td>{a._count.caregivers}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <button className="btn-secondary btn-sm" disabled={busy === a.id} onClick={() => viewAs(a.id)}>View as</button>
                        <button className="btn-ghost btn-sm text-red-600" disabled={busy === a.id} onClick={() => toggleActive(a)}>{a.active ? "Suspend" : "Activate"}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
