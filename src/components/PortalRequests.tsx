"use client";

import { useEffect, useState } from "react";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { REQUEST_TYPE, REQUEST_STATUS, labelsToOptions } from "@/lib/enums";

type Req = { id: string; type: string; message: string; status: string; preferredDate: string | null; preferredCaregiver: string | null; reviewNote: string | null; createdAt: string };
type Caregiver = { id: string; firstName: string; lastName: string; discipline: string };
const TONE: Record<string, string> = { PENDING: "badge-amber", APPROVED: "badge-green", DECLINED: "badge-red" };

// Types where naming a preferred caregiver is meaningful.
const CAREGIVER_TYPES = new Set(["CAREGIVER_CHANGE", "NEW_VISIT", "RESCHEDULE"]);

export function PortalRequests() {
  const [rows, setRows] = useState<Req[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [type, setType] = useState("RESCHEDULE");
  const [message, setMessage] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredCaregiverId, setPreferredCaregiverId] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  async function load() {
    const [rRes, cRes] = await Promise.all([fetch("/api/portal/requests"), fetch("/api/portal/caregivers")]);
    setRows(rRes.ok ? await rRes.json() : []);
    setCaregivers(cRes.ok ? await cRes.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setBusy(true); setOk(false);
    const picked = caregivers.find((c) => c.id === preferredCaregiverId);
    const res = await fetch("/api/portal/requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type, message,
        preferredDate: preferredDate || undefined,
        preferredCaregiverId: preferredCaregiverId || undefined,
        preferredCaregiver: picked ? `${picked.firstName} ${picked.lastName}` : undefined,
      }),
    });
    setBusy(false);
    if (res.ok) { setMessage(""); setPreferredDate(""); setPreferredCaregiverId(""); setOk(true); await load(); }
  }

  return (
    <div className="card">
      <div className="border-b border-surface-100 px-5 py-3.5"><h3 className="font-semibold">Request a change</h3></div>
      <form onSubmit={submit} className="card-pad space-y-3">
        {ok && <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">Request submitted — your care team will review it.</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Type</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              {labelsToOptions(REQUEST_TYPE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{type === "NEW_VISIT" ? "Preferred visit date" : "Preferred date (optional)"}</label>
            <input type="date" className="input" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
          </div>
        </div>
        {CAREGIVER_TYPES.has(type) && caregivers.length > 0 && (
          <div>
            <label className="label">Preferred caregiver (optional)</label>
            <select className="select" value={preferredCaregiverId} onChange={(e) => setPreferredCaregiverId(e.target.value)}>
              <option value="">— No preference —</option>
              {caregivers.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.discipline})</option>)}
            </select>
            <p className="mt-1 text-xs text-surface-400">Choose from caregivers who have worked with you. Your care team will confirm availability.</p>
          </div>
        )}
        <div>
          <label className="label">Message</label>
          <textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what you'd like to change…" required />
        </div>
        <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy ? "Sending…" : "Submit request"}</button></div>
      </form>

      {rows.length > 0 && (
        <div className="border-t border-surface-100 px-5 py-4">
          <p className="mb-2 text-sm font-medium text-surface-600">Your requests</p>
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface-50 p-3">
                <div>
                  <p className="text-sm font-medium text-surface-800">{REQUEST_TYPE[r.type as keyof typeof REQUEST_TYPE] ?? r.type}</p>
                  <p className="text-xs text-surface-500">{r.message}{r.preferredCaregiver ? ` · ${r.preferredCaregiver}` : ""}{r.preferredDate ? ` · ${fmtDate(r.preferredDate)}` : ""} · {fmtDateTime(r.createdAt)}</p>
                  {r.reviewNote && <p className="text-xs text-surface-500">Reply: {r.reviewNote}</p>}
                </div>
                <span className={TONE[r.status] ?? "badge-neutral"}>{REQUEST_STATUS[r.status as keyof typeof REQUEST_STATUS] ?? r.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
