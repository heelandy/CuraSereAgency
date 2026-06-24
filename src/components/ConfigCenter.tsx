"use client";

import { useState } from "react";
import { FEATURE_FLAGS, PAY_PERIOD, labelsToOptions } from "@/lib/enums";
import { DomainsManager } from "@/components/DomainsManager";

// Read an image file, downscale it (preserve aspect, longest side ≤ max px) and
// return a compact PNG data URL — so an uploaded logo/favicon is small enough to
// store inline, no file server needed.
async function fileToDataUrl(file: File, max: number): Promise<string> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
  try {
    const img = document.createElement("img");
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = raw; });
    const scale = Math.min(1, max / Math.max(img.width || max, img.height || max));
    const w = Math.max(1, Math.round((img.width || max) * scale));
    const h = Math.max(1, Math.round((img.height || max) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const cx = canvas.getContext("2d");
    if (!cx) return raw;
    cx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return raw; // e.g. an SVG that can't be rasterized — keep the original
  }
}

// Branding image field: paste a URL or upload a file (shown as a live preview).
function ImageField({
  label, hint, value, onUrl, onFile, onClear,
}: {
  label: string; hint: string; value: string;
  onUrl: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const isData = value.startsWith("data:");
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        {value && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-9 w-9 shrink-0 rounded border border-surface-200 bg-white object-contain" />
        )}
        {isData
          ? <span className="badge-green flex-1">Uploaded image</span>
          : <input className="input" value={value} onChange={onUrl} placeholder="https://…" />}
        <label className="btn-secondary btn-sm shrink-0 cursor-pointer">
          Upload<input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        {value && <button type="button" className="shrink-0 text-xs text-red-600 hover:underline" onClick={onClear}>Remove</button>}
      </div>
      <p className="mt-1 text-xs text-surface-400">{hint}</p>
    </div>
  );
}

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

  async function pickImage(field: "logoUrl" | "faviconUrl", max: number, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!f) return;
    setB((s) => ({ ...s, [field]: "" })); // brief reset for feedback
    const dataUrl = await fileToDataUrl(f, max);
    setB((s) => ({ ...s, [field]: dataUrl }));
  }

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
          <ImageField
            label="Logo" hint="Shown in the sidebar and on sign-in. PNG/JPG/SVG; auto-resized."
            value={b.logoUrl} onUrl={set("logoUrl")} onFile={(e) => pickImage("logoUrl", 256, e)}
            onClear={() => setB((s) => ({ ...s, logoUrl: "" }))}
          />
          <ImageField
            label="Tab icon (favicon)" hint="Shown in the browser tab. Auto-resized to 64px."
            value={b.faviconUrl} onUrl={set("faviconUrl")} onFile={(e) => pickImage("faviconUrl", 64, e)}
            onClear={() => setB((s) => ({ ...s, faviconUrl: "" }))}
          />
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
