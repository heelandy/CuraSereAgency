"use client";

import { useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { SUPPORT_CATEGORY, SUPPORT_PRIORITY, SUPPORT_STATUS, labelsToOptions } from "@/lib/enums";
import { STATUS_TONE, PRIORITY_TONE } from "@/components/SupportClient";

type Ticket = {
  id: string; subject: string; category: string; priority: string; status: string;
  createdByName: string | null; agencyName: string; messageCount: number; updatedAt: string;
};
type Message = { id: string; authorName: string | null; fromPlatform: boolean; body: string; createdAt: string };
type Detail = {
  id: string; subject: string; category: string; priority: string; status: string;
  createdByName: string | null; agency: { name: string }; messages: Message[];
};

// Platform super-admin help desk: triage and answer every agency's tickets.
export function SupportAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/platform/support${filter ? `?status=${filter}` : ""}`);
    setTickets(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function open(id: string) {
    const res = await fetch(`/api/platform/support/${id}`);
    setDetail(res.ok ? await res.json() : null);
  }

  async function sendReply() {
    if (!detail || !reply.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/platform/support/${detail.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }),
    });
    setBusy(false);
    if (res.ok) { setReply(""); await open(detail.id); await load(); }
  }

  async function update(patch: { status?: string; priority?: string }) {
    if (!detail) return;
    setBusy(true);
    await fetch(`/api/platform/support/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    setBusy(false);
    await open(detail.id); await load();
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-100 px-5 py-3.5">
        <div>
          <h3 className="font-semibold">Support tickets</h3>
          <p className="muted mt-0.5 text-sm">Every agency&apos;s tickets — reply and triage here.</p>
        </div>
        <select className="select max-w-[12rem]" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {labelsToOptions(SUPPORT_STATUS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="grid gap-0 lg:grid-cols-[22rem_1fr]">
        <ul className="max-h-[34rem] divide-y divide-surface-100 overflow-y-auto border-b border-surface-100 lg:border-b-0 lg:border-r">
          {tickets.length === 0 ? <li className="muted p-4 text-sm">No tickets.</li> : tickets.map((t) => (
            <li key={t.id}>
              <button className={`w-full px-4 py-3 text-left hover:bg-surface-50 ${detail?.id === t.id ? "bg-surface-50" : ""}`} onClick={() => open(t.id)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-surface-800">{t.subject}</span>
                  <span className={`badge-${STATUS_TONE[t.status]} shrink-0`}>{SUPPORT_STATUS[t.status as keyof typeof SUPPORT_STATUS] ?? t.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-surface-400">{t.agencyName} · {t.createdByName ?? "—"} · {fmtDateTime(t.updatedAt)}</p>
              </button>
            </li>
          ))}
        </ul>

        <div className="p-5">
          {!detail ? <p className="muted py-16 text-center">Select a ticket to view the conversation.</p> : (
            <div className="flex h-full flex-col">
              <div className="border-b border-surface-100 pb-3">
                <h3 className="font-semibold text-surface-900">{detail.subject}</h3>
                <p className="mt-0.5 text-xs text-surface-400">{detail.agency.name} · opened by {detail.createdByName ?? "—"} · {SUPPORT_CATEGORY[detail.category as keyof typeof SUPPORT_CATEGORY] ?? detail.category}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-surface-500">Status</label>
                  <select className="select max-w-[10rem]" value={detail.status} disabled={busy} onChange={(e) => update({ status: e.target.value })}>
                    {labelsToOptions(SUPPORT_STATUS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <label className="ml-2 text-xs text-surface-500">Priority</label>
                  <select className="select max-w-[10rem]" value={detail.priority} disabled={busy} onChange={(e) => update({ priority: e.target.value })}>
                    {labelsToOptions(SUPPORT_PRIORITY).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <span className={`badge-${PRIORITY_TONE[detail.priority]}`}>{SUPPORT_PRIORITY[detail.priority as keyof typeof SUPPORT_PRIORITY] ?? detail.priority}</span>
                </div>
              </div>

              <div className="my-3 max-h-80 flex-1 space-y-3 overflow-y-auto">
                {detail.messages.map((m) => (
                  <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.fromPlatform ? "ml-auto bg-brand-50 text-surface-800" : "bg-surface-100 text-surface-800"}`}>
                    <p className="mb-0.5 text-xs text-surface-400">{m.fromPlatform ? "You (Platform)" : (m.authorName ?? "Agency")} · {fmtDateTime(m.createdAt)}</p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-end gap-2 border-t border-surface-100 pt-3">
                <textarea className="textarea flex-1" rows={2} placeholder="Reply to this agency…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <button className="btn-primary btn-sm" disabled={busy || !reply.trim()} onClick={sendReply}>Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
