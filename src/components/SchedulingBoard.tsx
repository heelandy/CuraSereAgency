"use client";

import { useEffect, useState } from "react";
import { fmtTime, fmtDate } from "@/lib/format";
import { VISIT_STATUS, SERVICE_TYPE, labelsToOptions } from "@/lib/enums";

type Visit = {
  id: string; status: string; serviceType: string; scheduledStart: string; scheduledEnd: string; caregiverId: string | null;
  patient?: { firstName: string; lastName: string } | null;
  caregiver?: { firstName: string; lastName: string } | null;
};
type Caregiver = { id: string; firstName: string; lastName: string; discipline: string };
type Suggestion = { id: string; name: string; discipline: string; weeklyHours: number; score: number; matchPct: number; reasons: string[] };

const TONE: Record<string, string> = { SCHEDULED: "badge-blue", OPEN: "badge-amber", IN_PROGRESS: "badge-violet", COMPLETED: "badge-green", MISSED: "badge-red", CANCELED: "badge-neutral" };
const statusLabel = (s: string) => VISIT_STATUS[s as keyof typeof VISIT_STATUS] ?? s;
const cgName = (c?: { firstName: string; lastName: string } | null) => (c ? `${c.firstName} ${c.lastName}` : null);

function toDateTimeInput(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function SchedulingBoard() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // edit modal
  const [editing, setEditing] = useState<Visit | null>(null);
  const [form, setForm] = useState<{ caregiverId: string; scheduledStart: string; scheduledEnd: string; status: string }>({ caregiverId: "", scheduledStart: "", scheduledEnd: "", status: "SCHEDULED" });
  const [error, setError] = useState<string | null>(null);

  // suggest modal
  const [suggestFor, setSuggestFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // collapsible sections
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);

  async function load() {
    setLoading(true);
    const [vRes, cRes] = await Promise.all([fetch("/api/r/visits"), fetch("/api/r/caregivers")]);
    const v: Visit[] = vRes.ok ? await vRes.json() : [];
    const c: Caregiver[] = cRes.ok ? await cRes.json() : [];
    v.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    setVisits(v); setCaregivers(c); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // ── Buckets ────────────────────────────────────────────────────────────────
  const now = new Date();
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
  const isToday = (v: Visit) => { const t = new Date(v.scheduledStart); return t >= startOfDay && t <= endOfDay; };
  const isOpen = (v: Visit) => !v.caregiverId || v.status === "OPEN";
  const active = (v: Visit) => v.status !== "COMPLETED" && v.status !== "CANCELED";

  const today = visits.filter((v) => isToday(v) && v.status !== "COMPLETED");
  const unassigned = visits.filter((v) => isOpen(v) && active(v)).sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  const upcoming = visits.filter((v) => !isToday(v) && !isOpen(v) && active(v) && new Date(v.scheduledStart) > endOfDay);
  const completed = visits.filter((v) => v.status === "COMPLETED");

  // ── Actions ──────────────────────────────────────────────────────────────
  function openEdit(v: Visit) {
    setEditing(v);
    setError(null);
    setForm({
      caregiverId: v.caregiverId ?? "",
      scheduledStart: toDateTimeInput(v.scheduledStart),
      scheduledEnd: toDateTimeInput(v.scheduledEnd),
      status: v.status,
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true); setError(null);
    const body: Record<string, unknown> = {
      caregiverId: form.caregiverId || null,
      scheduledStart: form.scheduledStart,
      scheduledEnd: form.scheduledEnd,
      status: form.status,
    };
    // Assigning a caregiver to an open shift promotes it to SCHEDULED.
    if (form.caregiverId && editing.status === "OPEN") body.status = "SCHEDULED";
    const res = await fetch(`/api/r/visits/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (res.ok) { setEditing(null); await load(); }
    else { const j = await res.json().catch(() => ({})); setError(j.message || "Save failed"); }
  }

  async function remove(v: Visit) {
    if (!confirm("Delete this visit entirely? This cannot be undone.")) return;
    const res = await fetch(`/api/r/visits/${v.id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  async function openSuggest(visitId: string) {
    setSuggestFor(visitId); setSuggestions([]);
    const res = await fetch(`/api/scheduling/suggest?visitId=${visitId}`);
    if (res.ok) { const j = await res.json(); setSuggestions(j.suggestions ?? []); }
  }
  async function assign(visitId: string, caregiverId: string) {
    setBusy(true);
    await fetch(`/api/r/visits/${visitId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caregiverId, status: "SCHEDULED" }) });
    setBusy(false); setSuggestFor(null); await load();
  }

  function VisitCard({ v }: { v: Visit }) {
    const hoursUntil = (new Date(v.scheduledStart).getTime() - now.getTime()) / 3_600_000;
    const soon = hoursUntil > 0 && hoursUntil < 48;
    return (
      <div className="card card-pad">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-surface-900">{fmtDate(v.scheduledStart)} · {fmtTime(v.scheduledStart)}–{fmtTime(v.scheduledEnd)}</span>
          <span className={TONE[v.status] ?? "badge-neutral"}>{statusLabel(v.status)}</span>
        </div>
        <p className="mt-2 font-medium text-surface-800">{v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : "—"}</p>
        <p className="muted">{SERVICE_TYPE[v.serviceType as keyof typeof SERVICE_TYPE] ?? v.serviceType}</p>
        <p className="mt-1 text-sm">
          {cgName(v.caregiver) ? <span className="text-surface-700">{cgName(v.caregiver)}</span> : <span className="text-amber-600">Unassigned</span>}
          {soon && <span className="badge-amber ml-2">Starts in {Math.ceil(hoursUntil)}h</span>}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button className="btn-secondary btn-sm" onClick={() => openEdit(v)}>Edit</button>
          {isOpen(v) && <button className="btn-ghost btn-sm text-brand-600" onClick={() => openSuggest(v.id)}>Find caregiver</button>}
          <button className="btn-ghost btn-sm text-red-600" onClick={() => remove(v)}>Delete</button>
        </div>
      </div>
    );
  }

  function Section({ title, list, tone }: { title: string; list: Visit[]; tone?: string }) {
    return (
      <div>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-surface-500">
          {title} <span className={tone ?? "badge-neutral"}>{list.length}</span>
        </h3>
        {list.length === 0 ? <p className="muted mb-4">Nothing here.</p> : (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{list.map((v) => <VisitCard key={v.id} v={v} />)}</div>
        )}
      </div>
    );
  }

  if (loading) return <p className="muted">Loading schedule…</p>;

  return (
    <div className="space-y-4">
      {/* 1 — Current day on top */}
      <Section title="Today" list={today} tone="badge-violet" />

      {/* 2 — Unassigned (priority: soonest first), collapsible */}
      <div>
        <button className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-surface-500" onClick={() => setShowUnassigned((s) => !s)}>
          <span>{showUnassigned ? "▾" : "▸"}</span> Unassigned — needs a caregiver <span className="badge-amber">{unassigned.length}</span>
        </button>
        {showUnassigned && (unassigned.length === 0 ? <p className="muted mb-4">No open shifts.</p> : (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{unassigned.map((v) => <VisitCard key={v.id} v={v} />)}</div>
        ))}
      </div>

      {/* Upcoming assigned (so future assigned visits stay visible) */}
      <Section title="Upcoming (assigned)" list={upcoming} tone="badge-blue" />

      {/* 3 — Completed, collapsible (collapsed by default) */}
      <div>
        <button className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-surface-500" onClick={() => setShowCompleted((s) => !s)}>
          <span>{showCompleted ? "▾" : "▸"}</span> Completed <span className="badge-green">{completed.length}</span>
        </button>
        {showCompleted && (completed.length === 0 ? <p className="muted">No completed visits.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{completed.map((v) => <VisitCard key={v.id} v={v} />)}</div>
        ))}
      </div>

      {/* Edit modal — reassign caregiver / reschedule / change status without deleting */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
          <div className="card my-8 w-full max-w-lg">
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3.5">
              <h3 className="font-semibold">Edit visit</h3>
              <button className="btn-ghost btn-sm" onClick={() => setEditing(null)}>Close</button>
            </div>
            <form onSubmit={saveEdit} className="card-pad space-y-4">
              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
              <div>
                <label className="label">Caregiver</label>
                <select className="select" value={form.caregiverId} onChange={(e) => setForm((s) => ({ ...s, caregiverId: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {caregivers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.discipline})</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Start</label>
                  <input type="datetime-local" className="input" value={form.scheduledStart} onChange={(e) => setForm((s) => ({ ...s, scheduledStart: e.target.value }))} required />
                </div>
                <div>
                  <label className="label">End</label>
                  <input type="datetime-local" className="input" value={form.scheduledEnd} onChange={(e) => setForm((s) => ({ ...s, scheduledEnd: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="select" value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}>
                  {labelsToOptions(VISIT_STATUS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suggest modal */}
      {suggestFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
          <div className="card my-8 w-full max-w-lg">
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3.5">
              <h3 className="font-semibold">Suggested caregivers</h3>
              <button className="btn-ghost btn-sm" onClick={() => setSuggestFor(null)}>Close</button>
            </div>
            <div className="card-pad space-y-3">
              {suggestions.length === 0 ? <p className="muted">Scoring caregivers…</p> : suggestions.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-surface-200 p-3">
                  <div>
                    <p className="font-medium text-surface-900">{s.name} <span className="muted">· {s.discipline}</span></p>
                    <p className="text-xs text-surface-500">{s.reasons.join(" · ")}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge-green">{s.matchPct}% match</span>
                    <button className="btn-primary btn-sm mt-2 block" disabled={busy} onClick={() => assign(suggestFor, s.id)}>Assign</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
