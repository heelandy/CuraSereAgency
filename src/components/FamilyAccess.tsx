"use client";

import { useEffect, useState } from "react";
import { fmtDate } from "@/lib/format";

type Member = { id: string; name: string; email: string; createdAt: string };

// Reusable family-access panel. `basePath` is the staff or portal family endpoint.
export function FamilyAccess({ basePath, title = "Family Access" }: { basePath: string; title?: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<{ email: string; tempPassword: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(basePath);
    setMembers(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [basePath]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInvite(null);
    const res = await fetch(basePath, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(j.message || "Could not invite"); return; }
    setInvite({ email: j.email, tempPassword: j.tempPassword });
    setName(""); setEmail("");
    await load();
  }

  return (
    <div className="card">
      <div className="border-b border-surface-100 px-5 py-3.5"><h3 className="font-semibold">{title}</h3></div>
      <div className="card-pad space-y-4">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {invite && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
            Invited <strong>{invite.email}</strong>. Temporary password (share securely, shown once):
            <span className="ml-1 font-mono">{invite.tempPassword}</span>
          </div>
        )}
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn-primary" disabled={busy}>{busy ? "Inviting…" : "Invite family"}</button>
        </form>

        {members.length > 0 && (
          <ul className="divide-y divide-surface-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-surface-800">{m.name} <span className="text-surface-400">· {m.email}</span></span>
                <span className="text-xs text-surface-400">added {fmtDate(m.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
