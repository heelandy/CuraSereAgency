"use client";

import { useEffect, useState } from "react";
import { fmtTime } from "@/lib/format";
import { VISIT_STATUS, SERVICE_TYPE } from "@/lib/enums";

type Visit = {
  id: string; status: string; serviceType: string; scheduledStart: string; scheduledEnd: string;
  patient?: { firstName: string; lastName: string } | null;
  caregiver?: { firstName: string; lastName: string } | null;
};
type Suggestion = { id: string; name: string; discipline: string; weeklyHours: number; score: number; reasons: string[] };

const TONE: Record<string, string> = { SCHEDULED: "badge-blue", OPEN: "badge-amber", IN_PROGRESS: "badge-violet", COMPLETED: "badge-green", MISSED: "badge-red", CANCELED: "badge-neutral" };

export function SchedulingBoard() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestFor, setSuggestFor] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/r/visits");
    const data: Visit[] = res.ok ? await res.json() : [];
    data.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    setVisits(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function openSuggest(visitId: string) {
    setSuggestFor(visitId);
    setSuggestions([]);
    const res = await fetch(`/api/scheduling/suggest?visitId=${visitId}`);
    if (res.ok) { const j = await res.json(); setSuggestions(j.suggestions ?? []); }
  }

  async function assign(visitId: string, caregiverId: string) {
    setBusy(true);
    await fetch(`/api/r/visits/${visitId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caregiverId, status: "SCHEDULED" }),
    });
    setBusy(false);
    setSuggestFor(null);
    await load();
  }

  const byDay = visits.reduce<Record<string, Visit[]>>((acc, v) => {
    const day = new Date(v.scheduledStart).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    (acc[day] ??= []).push(v);
    return acc;
  }, {});

  if (loading) return <p className="muted">Loading schedule…</p>;

  return (
    <div className="space-y-6">
      {Object.keys(byDay).length === 0 && <p className="muted">No visits scheduled.</p>}
      {Object.entries(byDay).map(([day, list]) => (
        <div key={day}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-surface-500">{day}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((v) => (
              <div key={v.id} className="card card-pad">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-900">{fmtTime(v.scheduledStart)}–{fmtTime(v.scheduledEnd)}</span>
                  <span className={TONE[v.status] ?? "badge-neutral"}>{VISIT_STATUS[v.status as keyof typeof VISIT_STATUS] ?? v.status}</span>
                </div>
                <p className="mt-2 font-medium text-surface-800">
                  {v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : "—"}
                </p>
                <p className="muted">{SERVICE_TYPE[v.serviceType as keyof typeof SERVICE_TYPE] ?? v.serviceType}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-surface-600">
                    {v.caregiver ? `${v.caregiver.firstName} ${v.caregiver.lastName}` : <span className="text-amber-600">Unassigned</span>}
                  </span>
                  {!v.caregiver && (
                    <button className="btn-secondary btn-sm" onClick={() => openSuggest(v.id)}>Find caregiver</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {suggestFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4">
          <div className="card my-8 w-full max-w-lg">
            <div className="flex items-center justify-between border-b border-surface-100 px-5 py-3.5">
              <h3 className="font-semibold">Suggested caregivers</h3>
              <button className="btn-ghost btn-sm" onClick={() => setSuggestFor(null)}>Close</button>
            </div>
            <div className="card-pad space-y-3">
              {suggestions.length === 0 ? (
                <p className="muted">Scoring caregivers…</p>
              ) : suggestions.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-surface-200 p-3">
                  <div>
                    <p className="font-medium text-surface-900">{s.name} <span className="muted">· {s.discipline}</span></p>
                    <p className="text-xs text-surface-500">{s.reasons.join(" · ")}</p>
                  </div>
                  <div className="text-right">
                    <span className="badge-green">{s.score} pts</span>
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
