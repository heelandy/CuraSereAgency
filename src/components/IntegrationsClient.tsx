"use client";

import { useEffect, useState } from "react";

type Integration = { provider: string; label: string; connected: boolean; hasSecret: boolean; disabledByPlatform?: boolean };

export function IntegrationsClient() {
  const [rows, setRows] = useState<Integration[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/admin/integrations");
    setRows(res.ok ? await res.json() : []);
  }
  useEffect(() => { load(); }, []);

  async function patch(provider: string, body: Record<string, unknown>) {
    setBusy(provider);
    await fetch("/api/admin/integrations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, ...body }) });
    setBusy(null);
    await load();
  }

  async function saveSecret(provider: string) {
    const secret = secrets[provider] ?? "";
    await patch(provider, { secret });
    setSecrets((s) => ({ ...s, [provider]: "" }));
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((i) => (
        <div key={i.provider} className="card card-pad space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-surface-900">{i.label}</p>
              <p className={`text-xs ${i.connected ? "text-brand-600" : "text-surface-400"}`}>{i.connected ? "Connected" : "Not connected"}</p>
            </div>
            <button
              className={i.connected ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
              disabled={busy === i.provider || (i.disabledByPlatform && !i.connected)}
              onClick={() => patch(i.provider, { connected: !i.connected })}
            >
              {i.connected ? "Disconnect" : "Connect"}
            </button>
          </div>

          {i.disabledByPlatform && (
            <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">Disabled by the platform administrator.</p>
          )}

          <div>
            <label className="label">API key / secret {i.hasSecret && <span className="badge-green ml-1">Saved (encrypted)</span>}</label>
            <div className="flex gap-2">
              <input
                type="password" className="input" placeholder={i.hasSecret ? "••••••• (stored)" : "Paste key…"}
                disabled={i.disabledByPlatform}
                value={secrets[i.provider] ?? ""} onChange={(e) => setSecrets((s) => ({ ...s, [i.provider]: e.target.value }))}
              />
              <button className="btn-secondary btn-sm" disabled={busy === i.provider || i.disabledByPlatform || !(secrets[i.provider] ?? "").trim()} onClick={() => saveSecret(i.provider)}>Save</button>
            </div>
            {i.hasSecret && (
              <button className="mt-1 text-xs text-red-600 hover:underline" onClick={() => patch(i.provider, { secret: "" })}>Clear key</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
