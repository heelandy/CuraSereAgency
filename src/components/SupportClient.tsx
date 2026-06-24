"use client";

import { useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";
import { SUPPORT_CATEGORY, SUPPORT_PRIORITY, SUPPORT_STATUS, labelsToOptions } from "@/lib/enums";

type Ticket = {
  id: string; subject: string; category: string; priority: string; status: string;
  createdByName: string | null; updatedAt: string; messageCount: number;
};
type Message = { id: string; authorName: string | null; fromPlatform: boolean; body: string; createdAt: string };
type Detail = Ticket & { messages: Message[]; createdAt: string };

export const STATUS_TONE: Record<string, string> = { OPEN: "blue", IN_PROGRESS: "violet", RESOLVED: "green", CLOSED: "neutral" };
export const PRIORITY_TONE: Record<string, string> = { LOW: "neutral", NORMAL: "blue", HIGH: "amber", URGENT: "red" };

export function SupportClient() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({ subject: "", category: "GENERAL", priority: "NORMAL", body: "" });

  async function load() {
    const res = await fetch("/api/support/tickets");
    setTickets(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function open(id: string) {
    setCreating(false);
    const res = await fetch(`/api/support/tickets/${id}`);
    setDetail(res.ok ? await res.json() : null);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const res = await fetch("/api/support/tickets", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      const { id } = await res.json();
      setForm({ subject: "", category: "GENERAL", priority: "NORMAL", body: "" });
      await load(); await open(id);
    }
  }

  async function sendReply() {
    if (!detail || !reply.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/support/tickets/${detail.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: reply }),
    });
    setBusy(false);
    if (res.ok) { setReply(""); await open(detail.id); await load(); }
  }

  async function setStatus(status: "OPEN" | "CLOSED") {
    if (!detail) return;
    setBusy(true);
    await fetch(`/api/support/tickets/${detail.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    setBusy(false);
    await open(detail.id); await load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      {/* List */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3">
          <h3 className="font-semibold">Your tickets</h3>
          <button className="btn-primary btn-sm" onClick={() => { setCreating(true); setDetail(null); }}>New</button>
        </div>
        <ul className="max-h-[32rem] divide-y divide-surface-100 overflow-y-auto">
          {tickets.length === 0 ? <li className="muted p-4 text-sm">No tickets yet.</li> : tickets.map((t) => (
            <li key={t.id}>
              <button
                className={`w-full px-4 py-3 text-left hover:bg-surface-50 ${detail?.id === t.id ? "bg-surface-50" : ""}`}
                onClick={() => open(t.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-surface-800">{t.subject}</span>
                  <span className={`badge-${STATUS_TONE[t.status]} shrink-0`}>{SUPPORT_STATUS[t.status as keyof typeof SUPPORT_STATUS] ?? t.status}</span>
                </div>
                <p className="mt-0.5 text-xs text-surface-400">{fmtDateTime(t.updatedAt)} · {t.messageCount} message{t.messageCount === 1 ? "" : "s"}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Detail / create */}
      <div className="card card-pad">
        {creating ? (
          <form onSubmit={create} className="space-y-3">
            <h3 className="font-semibold">New support ticket</h3>
            <div><label className="label">Subject</label><input className="input" value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Category</label>
                <select className="select" value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
                  {labelsToOptions(SUPPORT_CATEGORY).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div><label className="label">Priority</label>
                <select className="select" value={form.priority} onChange={(e) => setForm((s) => ({ ...s, priority: e.target.value }))}>
                  {labelsToOptions(SUPPORT_PRIORITY).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div><label className="label">How can we help?</label><textarea className="textarea" rows={5} value={form.body} onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))} required /></div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn-primary" disabled={busy}>Submit ticket</button>
            </div>
          </form>
        ) : detail ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-surface-100 pb-3">
              <div>
                <h3 className="font-semibold text-surface-900">{detail.subject}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className={`badge-${STATUS_TONE[detail.status]}`}>{SUPPORT_STATUS[detail.status as keyof typeof SUPPORT_STATUS] ?? detail.status}</span>
                  <span className={`badge-${PRIORITY_TONE[detail.priority]}`}>{SUPPORT_PRIORITY[detail.priority as keyof typeof SUPPORT_PRIORITY] ?? detail.priority}</span>
                  <span className="text-surface-400">{SUPPORT_CATEGORY[detail.category as keyof typeof SUPPORT_CATEGORY] ?? detail.category}</span>
                </div>
              </div>
              {detail.status === "CLOSED"
                ? <button className="btn-secondary btn-sm" disabled={busy} onClick={() => setStatus("OPEN")}>Reopen</button>
                : <button className="btn-ghost btn-sm" disabled={busy} onClick={() => setStatus("CLOSED")}>Close</button>}
            </div>

            <div className="my-3 max-h-80 flex-1 space-y-3 overflow-y-auto">
              {detail.messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.fromPlatform ? "ml-auto bg-brand-50 text-surface-800" : "bg-surface-100 text-surface-800"}`}>
                  <p className="mb-0.5 text-xs text-surface-400">{m.fromPlatform ? "Platform Support" : (m.authorName ?? "You")} · {fmtDateTime(m.createdAt)}</p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>

            <div className="flex items-end gap-2 border-t border-surface-100 pt-3">
              <textarea className="textarea flex-1" rows={2} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="btn-primary btn-sm" disabled={busy || !reply.trim()} onClick={sendReply}>Send</button>
            </div>
          </div>
        ) : (
          <p className="muted py-16 text-center">Select a ticket, or open a new one.</p>
        )}
      </div>
    </div>
  );
}
