"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function SignupForm() {
  const router = useRouter();
  const [agencyName, setAgencyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Authenticity (verified against NPPES + manual review).
  const [legalName, setLegalName] = useState("");
  const [npi, setNpi] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Optional white-label branding captured at registration.
  const [showBranding, setShowBranding] = useState(false);
  const [brand, setBrand] = useState({
    portalName: "", slug: "", primaryColor: "#1f775c", secondaryColor: "#e6b566",
    logoUrl: "", supportEmail: "", supportPhone: "",
  });
  const setB = (k: keyof typeof brand) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setBrand((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setDevLink(null);
    const body = { agencyName, name, email, password, legalName, npi, licenseNumber, ...(showBranding ? brand : {}) };
    const res = await fetch("/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setLoading(false); setError(j.message || "Could not create your agency."); return; }

    // Sign in immediately; verification can be completed later.
    const signin = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/dashboard" });
    setLoading(false);
    if (signin?.error) {
      // Account created but auto sign-in failed — send them to login.
      router.push("/login");
      return;
    }
    if (j.devLink) { setDevLink(j.devLink); return; } // show dev verify link before leaving
    router.push("/dashboard");
    router.refresh();
  }

  if (devLink) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-700">
          Agency created. In development, verify your email with this link:
        </div>
        <a href={devLink} className="block break-all text-sm text-brand-600 underline">{devLink}</a>
        <button className="btn-primary w-full py-2.5" onClick={() => { router.push("/dashboard"); router.refresh(); }}>
          Continue to dashboard
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div>
        <label className="label" htmlFor="agencyName">Agency name</label>
        <input id="agencyName" className="input" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} placeholder="Acme Home Care" required />
      </div>
      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      </div>
      <div>
        <label className="label" htmlFor="email">Work email</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
        <p className="mt-1 text-xs text-surface-400">At least 8 characters. You&apos;ll be the Agency Owner and can invite your team.</p>
      </div>

      {/* Verification — required. We check the NPI against the national registry and
          a person reviews it; full access unlocks once your agency is approved. */}
      <div className="rounded-xl border border-surface-200 p-3">
        <p className="text-sm font-semibold text-surface-700">Verify your agency</p>
        <p className="mt-0.5 text-xs text-surface-400">We confirm every agency before it goes live. Access is limited until approved.</p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="label" htmlFor="legalName">Legal business name</label>
            <input id="legalName" className="input" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Acme Home Care LLC" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="npi">NPI (10 digits)</label>
              <input id="npi" className="input" value={npi} onChange={(e) => setNpi(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="1234567890" required />
            </div>
            <div>
              <label className="label" htmlFor="licenseNumber">State license # <span className="text-surface-400">(optional)</span></label>
              <input id="licenseNumber" className="input" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="HHA299991234" />
            </div>
          </div>
        </div>
      </div>

      {/* Optional white-label branding — applied to your portal from day one. */}
      <div className="rounded-xl border border-surface-200">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-surface-700"
          onClick={() => setShowBranding((v) => !v)}
        >
          <span>Customize your branding <span className="text-surface-400">(optional)</span></span>
          <span className="text-surface-400">{showBranding ? "–" : "+"}</span>
        </button>
        {showBranding && (
          <div className="space-y-3 border-t border-surface-100 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="portalName">Portal name</label>
                <input id="portalName" className="input" value={brand.portalName} onChange={setB("portalName")} placeholder={agencyName || "Acme Home Care"} />
              </div>
              <div>
                <label className="label" htmlFor="slug">Subdomain</label>
                <div className="flex items-center gap-1">
                  <input id="slug" className="input" value={brand.slug} onChange={setB("slug")} placeholder="acme" />
                  <span className="whitespace-nowrap text-xs text-surface-400">.platform</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="primaryColor">Primary color</label>
                <input id="primaryColor" type="color" className="input h-10 p-1" value={brand.primaryColor} onChange={setB("primaryColor")} />
              </div>
              <div>
                <label className="label" htmlFor="secondaryColor">Accent color</label>
                <input id="secondaryColor" type="color" className="input h-10 p-1" value={brand.secondaryColor} onChange={setB("secondaryColor")} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="logoUrl">Logo URL</label>
              <input id="logoUrl" className="input" value={brand.logoUrl} onChange={setB("logoUrl")} placeholder="https://…/logo.png" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="supportEmail">Support email</label>
                <input id="supportEmail" type="email" className="input" value={brand.supportEmail} onChange={setB("supportEmail")} placeholder="support@acme.com" />
              </div>
              <div>
                <label className="label" htmlFor="supportPhone">Support phone</label>
                <input id="supportPhone" className="input" value={brand.supportPhone} onChange={setB("supportPhone")} placeholder="(555) 555-0100" />
              </div>
            </div>
            <p className="text-xs text-surface-400">You can change any of this later in the Configuration Center.</p>
          </div>
        )}
      </div>

      <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
        {loading ? "Creating your agency…" : "Create agency account"}
      </button>
      <p className="text-center text-sm text-surface-500">
        Already have an account? <Link href="/login" className="text-brand-600 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
