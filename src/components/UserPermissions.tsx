"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/enums";

type Grantable = { cap: string; label: string };
type User = { id: string; name: string; email: string; role: string };

// Owner-only: enable extra permissions for individual users beyond their role.
export function UserPermissions({ grantable }: { grantable: Grantable[] }) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState("");
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/users");
      const all: User[] = res.ok ? await res.json() : [];
      // Owner has everything; portal users have no staff caps — skip both.
      setUsers(all.filter((u) => !["AGENCY_OWNER", "PLATFORM_OWNER", "PATIENT", "FAMILY"].includes(u.role)));
    })();
  }, []);

  async function pick(id: string) {
    setUserId(id); setSaved(false); setGranted(new Set());
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}/permissions`);
    const j = res.ok ? await res.json() : { granted: [] };
    setGranted(new Set<string>(j.granted ?? []));
    setLoading(false);
  }

  function toggle(cap: string) {
    setSaved(false);
    setGranted((s) => { const n = new Set(s); n.has(cap) ? n.delete(cap) : n.add(cap); return n; });
  }

  async function save() {
    if (!userId) return;
    setBusy(true); setSaved(false);
    const res = await fetch(`/api/admin/users/${userId}/permissions`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capabilities: [...granted] }),
    });
    setBusy(false);
    if (res.ok) setSaved(true);
  }

  return (
    <div className="card mb-6">
      <div className="border-b border-surface-100 px-5 py-3.5">
        <h3 className="font-semibold">Custom permissions</h3>
        <p className="muted mt-0.5">Owner-only — grant a user extra access beyond their role (e.g. let a coordinator do patient admissions). Read access for a granted area is included automatically.</p>
      </div>
      <div className="card-pad space-y-4">
        <div>
          <label className="label">User</label>
          <select className="select" value={userId} onChange={(e) => pick(e.target.value)}>
            <option value="">— Select a user —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {ROLE_LABELS[u.role as Role] ?? u.role}</option>)}
          </select>
        </div>

        {userId && (loading ? <p className="muted">Loading…</p> : (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              {grantable.map((g) => (
                <label key={g.cap} className="flex items-center justify-between rounded-xl border border-surface-200 px-3 py-2">
                  <span className="text-sm text-surface-800">{g.label}</span>
                  <input type="checkbox" checked={granted.has(g.cap)} onChange={() => toggle(g.cap)} />
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save permissions"}</button>
              {saved && <span className="text-sm text-brand-600">Saved — applies on the user&apos;s next request.</span>}
            </div>
          </>
        ))}
      </div>
    </div>
  );
}
