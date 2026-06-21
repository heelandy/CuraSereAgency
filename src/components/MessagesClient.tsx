"use client";

import { useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";

type Convo = { id: string; subject: string | null; kind: string; updatedAt: string; messages: { body: string; sender?: { name: string } | null }[]; _count: { messages: number } };
type Msg = { id: string; body: string; createdAt: string; sender?: { id: string; name: string } | null };

export function MessagesClient({ currentUserId }: { currentUserId: string }) {
  const [convos, setConvos] = useState<Convo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [sending, setSending] = useState(false);

  async function loadConvos() {
    const res = await fetch("/api/messages");
    const data: Convo[] = res.ok ? await res.json() : [];
    setConvos(data);
    if (!selected && data.length) setSelected(data[0].id);
  }
  async function loadThread(id: string) {
    const res = await fetch(`/api/messages/${id}`);
    if (res.ok) { const j = await res.json(); setMessages(j.messages); }
  }
  useEffect(() => { loadConvos(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (selected) loadThread(selected); }, [selected]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !body.trim()) return;
    setSending(true);
    await fetch(`/api/messages/${selected}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }),
    });
    setBody(""); setSending(false);
    await loadThread(selected); await loadConvos();
  }

  async function createConvo() {
    if (!newSubject.trim()) return;
    const res = await fetch("/api/messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: newSubject, kind: "GROUP" }),
    });
    if (res.ok) { const c = await res.json(); setNewSubject(""); await loadConvos(); setSelected(c.id); }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[300px_1fr]">
      <div className="card flex max-h-[70vh] flex-col">
        <div className="border-b border-surface-100 p-3">
          <div className="flex gap-2">
            <input className="input" placeholder="New conversation…" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
            <button className="btn-primary btn-sm" onClick={createConvo}>Add</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convos.length === 0 ? <p className="muted p-4">No conversations.</p> : convos.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`block w-full border-b border-surface-100 px-4 py-3 text-left hover:bg-surface-50 ${selected === c.id ? "bg-brand-50" : ""}`}>
              <p className="truncate text-sm font-medium text-surface-800">{c.subject || "Conversation"}</p>
              <p className="truncate text-xs text-surface-500">{c.messages[0]?.body ?? "No messages yet"}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="card flex max-h-[70vh] flex-col">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center"><p className="muted">Select a conversation</p></div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? <p className="muted">No messages yet. Say hello.</p> : messages.map((m) => {
                const mine = m.sender?.id === currentUserId;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand-600 text-white" : "bg-surface-100 text-surface-800"}`}>
                      {!mine && <p className="mb-0.5 text-xs font-medium text-surface-500">{m.sender?.name ?? "Unknown"}</p>}
                      <p>{m.body}</p>
                      <p className={`mt-0.5 text-[10px] ${mine ? "text-brand-100" : "text-surface-400"}`}>{fmtDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-surface-100 p-3">
              <input className="input" placeholder="Type a message…" value={body} onChange={(e) => setBody(e.target.value)} />
              <button className="btn-primary" disabled={sending}>Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
