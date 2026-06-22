"use client";

import { useEffect, useState } from "react";

type Integration = { provider: string; label: string; connected: boolean };

export function IntegrationsClient() {
  const [rows, setRows] = useState<Integration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/integrations");
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function toggle(provider: string, connected: boolean) {
    setBusy(provider);
    await fetch("/api/admin/integrations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, connected }) });
    setBusy(null);
    await load();
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((i) => (
        <div key={i.provider} className="card card-pad flex items-center justify-between">
          <div>
            <p className="font-medium text-surface-900">{i.label}</p>
            <p className={`text-xs ${i.connected ? "text-brand-600" : "text-surface-400"}`}>{i.connected ? "Connected" : "Not connected"}</p>
          </div>
          <button
            className={i.connected ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
            disabled={busy === i.provider}
            onClick={() => toggle(i.provider, !i.connected)}
          >
            {i.connected ? "Disconnect" : "Connect"}
          </button>
        </div>
      ))}
    </div>
  );
}
