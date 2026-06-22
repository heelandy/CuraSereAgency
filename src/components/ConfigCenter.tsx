"use client";

import { useState } from "react";
import { FEATURE_FLAGS, PAY_PERIOD, labelsToOptions } from "@/lib/enums";
import { DomainsManager } from "@/components/DomainsManager";

type Branding = {
  portalName: string; slug: string;
  logoUrl: string; faviconUrl: string; loginBannerUrl: string;
  primaryColor: string; secondaryColor: string;
  supportEmail: string; supportPhone: string; pdfFooter: string;
  payPeriod: string; mileageRate: string;
};

export function ConfigCenter({
  initialBranding, initialFlags,
}: {
  initialBranding: Branding;
  initialFlags: Record<string, boolean>;
}) {
  const [b, setB] = useState<Branding>(initialBranding);
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);
  const [savedB, setSavedB] = useState(false);
  const [savedF, setSavedF] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setSavedB(false);
    await fetch("/api/admin/agency", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
    setBusy(false); setSavedB(true);
  }

  async function saveFlags() {
    setBusy(true); setSavedF(false);
    await fetch("/api/admin/feature-flags", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flags }) });
    setBusy(false); setSavedF(true);
  }

  const set = (k: keyof Branding) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setB((s) => ({ ...s, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <form onSubmit={saveBranding} className="card card-pad">
        <h3 className="font-semibold text-surface-900">Branding &amp; White Label</h3>
        <p className="muted mb-4 mt-0.5">One codebase, your brand. These settings load automatically for your domain — no code changes. Save and refresh to see the new theme.</p>
        {savedB && <div className="mb-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">Branding saved — refresh to apply the new theme.</div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Portal name</label><input className="input" value={b.portalName} onChange={set("portalName")} placeholder="Cura_Sera" /></div>
          <div>
            <label className="label">Platform subdomain</label>
            <div className="flex items-center gap-1">
              <input className="input" value={b.slug} onChange={set("slug")} placeholder="acme" />
              <span className="text-sm text-surface-400">.yourplatform.com</span>
            </div>
          </div>
          <div>
            <label className="label">Primary color</label>
            <div className="flex items-center gap-2">
              <input type="color" className="h-10 w-12 rounded-lg border border-surface-300" value={b.primaryColor || "#1f775c"} onChange={set("primaryColor")} />
              <input className="input" value={b.primaryColor} onChange={set("primaryColor")} placeholder="#1f775c" />
            </div>
          </div>
          <div>
            <label className="label">Secondary color</label>
            <div className="flex items-center gap-2">
              <input type="color" className="h-10 w-12 rounded-lg border border-surface-300" value={b.secondaryColor || "#e6b566"} onChange={set("secondaryColor")} />
              <input className="input" value={b.secondaryColor} onChange={set("secondaryColor")} placeholder="#e6b566" />
            </div>
          </div>
          <div><label className="label">Logo URL</label><input className="input" value={b.logoUrl} onChange={set("logoUrl")} placeholder="https://…/logo.png" /></div>
          <div><label className="label">Favicon URL</label><input className="input" value={b.faviconUrl} onChange={set("faviconUrl")} placeholder="https://…/favicon.ico" /></div>
          <div className="sm:col-span-2"><label className="label">Login banner URL</label><input className="input" value={b.loginBannerUrl} onChange={set("loginBannerUrl")} placeholder="https://…/banner.jpg" /></div>
          <div><label className="label">Support email</label><input className="input" value={b.supportEmail} onChange={set("supportEmail")} placeholder="support@youragency.com" /></div>
          <div><label className="label">Support phone</label><input className="input" value={b.supportPhone} onChange={set("supportPhone")} placeholder="(305) 555-0142" /></div>
          <div className="sm:col-span-2"><label className="label">PDF footer</label><input className="input" value={b.pdfFooter} onChange={set("pdfFooter")} placeholder="Your Agency Name — Confidential" /></div>
          <div>
            <label className="label">Pay period</label>
            <select className="select" value={b.payPeriod} onChange={set("payPeriod")}>
              {labelsToOptions(PAY_PERIOD).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div><label className="label">Mileage rate ($/mi)</label><input type="number" step="0.01" className="input" value={b.mileageRate} onChange={set("mileageRate")} /></div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-surface-400">Preview:</span>
          <span className="inline-flex h-6 w-10 rounded" style={{ backgroundColor: b.primaryColor || "#1f775c" }} />
          <span className="inline-flex h-6 w-10 rounded" style={{ backgroundColor: b.secondaryColor || "#e6b566" }} />
        </div>
        <div className="mt-5 flex justify-end"><button className="btn-primary" disabled={busy}>Save branding</button></div>
      </form>

      <DomainsManager />

      <div className="card card-pad">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-surface-900">Feature Flags</h3>
            <p className="muted mt-0.5">Enable or disable modules for your agency — same code, different feature set.</p>
          </div>
          <button className="btn-primary" onClick={saveFlags} disabled={busy}>Save flags</button>
        </div>
        {savedF && <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">Feature flags saved.</div>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(FEATURE_FLAGS).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between rounded-xl border border-surface-200 px-3 py-2">
              <span className="text-sm text-surface-800">{label}</span>
              <input type="checkbox" checked={flags[key] !== false} onChange={(e) => setFlags((s) => ({ ...s, [key]: e.target.checked }))} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
