"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtDateTime } from "@/lib/format";

type Deleted = {
  id: string; resource: string; recordId: string; label: string | null; data: string;
  deletedById: string | null; deletedByName: string; agencyName: string; createdAt: string;
};

// Pretty-print a delegate key ("visitNote" → "Visit Note").
function resourceLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()).trim();
}

// Super-admin: archive of everything users have deleted, filterable per user.
export function DeletedRecordsLog() {
  const [rows, setRows] = useState<Deleted[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(""); // deletedById filter ("" = everyone)
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/platform/deleted");
      setRows(res.ok ? await res.json() : []);
      setLoading(false);
    })();
  }, []);

  // Distinct users (who deleted something) for the filter.
  const users = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) if (r.deletedById) map.set(r.deletedById, r.deletedByName);
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const filtered = user ? rows.filter((r) => r.deletedById === user) : rows;

  return (
    <div className="card mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 px-5 py-3.5">
        <div>
          <h3 className="font-semibold">Deleted items log</h3>
          <p className="muted mt-0.5 text-sm">Every deletion is archived here (soft delete) — recoverable, attributed to the user who deleted it.</p>
        </div>
        <select className="select max-w-xs" value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="">All users</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      {loading ? <p className="muted p-5">Loading…</p> : filtered.length === 0 ? (
        <p className="muted p-5">No deleted items{user ? " for this user" : ""}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Deleted by</th><th>Agency</th><th>Type</th><th>Item</th><th>When</th><th className="text-right">Snapshot</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium text-surface-900">{r.deletedByName}</td>
                  <td>{r.agencyName}</td>
                  <td><span className="badge-neutral">{resourceLabel(r.resource)}</span></td>
                  <td>{r.label ?? r.recordId}</td>
                  <td className="whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                  <td className="text-right">
                    <button className="btn-ghost btn-sm text-brand-600" onClick={() => setOpen(open === r.id ? null : r.id)}>
                      {open === r.id ? "Hide" : "View"}
                    </button>
                    {open === r.id && (
                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-surface-900 p-3 text-left text-xs text-surface-100">
                        {prettyJson(r.data)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function prettyJson(s: string): string {
  try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
}
