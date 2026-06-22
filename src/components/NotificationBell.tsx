"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BellIcon } from "./icons";
import { fmtDateTime } from "@/lib/format";

type Note = { id: string; title: string; body: string | null; href: string | null; kind: string; readAt: string | null; createdAt: string };

export function NotificationBell() {
  const [items, setItems] = useState<Note[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) { const j = await res.json(); setItems(j.items); setUnread(j.unread); }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      setUnread(0);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative rounded-xl p-2 text-surface-600 hover:bg-surface-100" aria-label="Notifications">
        <BellIcon width={20} height={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card">
          <div className="border-b border-surface-100 px-4 py-2.5 text-sm font-semibold text-surface-800">Notifications</div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-surface-400">You're all caught up.</p>
            ) : items.map((n) => {
              const inner = (
                <div className={`px-4 py-3 ${n.readAt ? "" : "bg-brand-50/50"}`}>
                  <p className="text-sm font-medium text-surface-800">{n.title}</p>
                  {n.body && <p className="text-xs text-surface-500">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-surface-400">{fmtDateTime(n.createdAt)}</p>
                </div>
              );
              return n.href
                ? <Link key={n.id} href={n.href} className="block hover:bg-surface-50" onClick={() => setOpen(false)}>{inner}</Link>
                : <div key={n.id} className="border-b border-surface-100 last:border-0">{inner}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
