"use client";

import { useState } from "react";

type Agency = Record<string, string | null>;
const FIELDS: [string, string][] = [
  ["name", "Agency name"], ["legalName", "Legal name"], ["npi", "NPI"],
  ["email", "Email"], ["phone", "Phone"], ["addressLine", "Address"],
  ["city", "City"], ["state", "State"], ["zip", "ZIP"], ["timezone", "Timezone"],
];

export function AgencySettingsForm({ initial }: { initial: Agency }) {
  const [form, setForm] = useState<Agency>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false); setError(null);
    const res = await fetch("/api/admin/agency", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) setSaved(true);
    else { const j = await res.json().catch(() => ({})); setError(j.message || "Save failed"); }
  }

  return (
    <form onSubmit={submit} className="card card-pad">
      {error && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {saved && <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">Settings saved.</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(([name, label]) => (
          <div key={name}>
            <label className="label" htmlFor={name}>{label}</label>
            <input id={name} className="input" value={form[name] ?? ""}
              onChange={(e) => setForm((s) => ({ ...s, [name]: e.target.value }))} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  );
}
