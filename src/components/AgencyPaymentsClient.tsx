"use client";

import { useEffect, useState } from "react";
import { fmtMoney } from "@/lib/format";

type Invoice = {
  id: string; number: string | null; amount: number; amountPaid: number;
  status: string; patientName: string; hasEmail: boolean; payLink: string | null;
};
type Patient = { id: string; name: string };
type Status = { platformEnabled: boolean; connected: boolean; chargesEnabled: boolean; detailsSubmitted: boolean };
type Plan = {
  id: string; description: string; amount: number; interval: string; status: string;
  stripeCheckoutUrl: string | null; patient: { firstName: string | null; lastName: string | null };
};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <input className="input text-xs" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      <button
        className="btn-secondary btn-sm shrink-0"
        onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function AgencyPaymentsClient({
  invoices: initialInvoices, patients, canWrite, platformConfigured,
}: {
  invoices: Invoice[]; patients: Patient[]; canWrite: boolean; platformConfigured: boolean;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oneOff, setOneOff] = useState({ amount: "", description: "" });
  const [oneOffUrl, setOneOffUrl] = useState<string | null>(null);
  const [rec, setRec] = useState({ patientId: "", description: "", amount: "", interval: "month" });
  const [recUrl, setRecUrl] = useState<string | null>(null);

  async function loadStatus() {
    const res = await fetch("/api/agency-billing/connect");
    setStatus(res.ok ? await res.json() : null);
  }
  async function loadPlans() {
    const res = await fetch("/api/agency-billing/recurring");
    setPlans(res.ok ? await res.json() : []);
  }
  useEffect(() => { loadStatus(); loadPlans(); }, []);

  const ready = Boolean(status?.chargesEnabled);
  const actionsDisabled = !ready || !canWrite;

  async function connect() {
    setBusy("connect"); setError(null);
    const res = await fetch("/api/agency-billing/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && j.url) { window.location.href = j.url; return; }
    setError(j.message || "Could not start Stripe onboarding.");
  }

  async function invoiceLink(id: string, email: boolean) {
    setBusy(id); setError(null);
    const res = await fetch(`/api/agency-billing/invoices/${id}/pay-link`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(j.message || "Could not create payment link."); return; }
    setInvoices((rows) => rows.map((r) => (r.id === id ? { ...r, payLink: j.url } : r)));
    if (email) alert(j.emailed ? "Payment link emailed to the patient." : "Link created, but email isn't configured — copy it below instead.");
  }

  async function createOneOff(e: React.FormEvent) {
    e.preventDefault(); setBusy("oneoff"); setError(null); setOneOffUrl(null);
    const res = await fetch("/api/agency-billing/payment-links", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(oneOff.amount), description: oneOff.description }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(j.message || "Could not create payment link."); return; }
    setOneOffUrl(j.url); setOneOff({ amount: "", description: "" });
  }

  async function createRecurring(e: React.FormEvent) {
    e.preventDefault(); setBusy("recurring"); setError(null); setRecUrl(null);
    const res = await fetch("/api/agency-billing/recurring", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: rec.patientId, description: rec.description, amount: Number(rec.amount), interval: rec.interval }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { setError(j.message || "Could not create recurring plan."); return; }
    setRecUrl(j.url); setRec({ patientId: "", description: "", amount: "", interval: "month" });
    await loadPlans();
  }

  const unpaid = invoices.filter((i) => i.status !== "PAID" && i.status !== "VOID" && i.amount - i.amountPaid > 0);
  const planTone: Record<string, string> = { ACTIVE: "badge-green", PENDING: "badge-neutral", PAST_DUE: "badge-red", CANCELED: "badge-neutral" };

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* ── Connection status ─────────────────────────────────────────────── */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Your Stripe account</h3>
            <p className="muted mt-0.5 text-sm">
              {status == null ? "Checking…"
                : !status.platformEnabled ? (platformConfigured
                    ? "Online payments are currently turned off by the platform administrator."
                    : "Online payments aren't available yet on this platform.")
                : ready ? "Connected — you can accept patient payments. Funds go straight to your Stripe account."
                : status.connected ? "Setup started but not finished — complete onboarding to start accepting payments."
                : "Connect your Stripe account to start collecting payments from patients & clients."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {status && status.platformEnabled && (
              <span className={ready ? "badge-green" : status.connected ? "badge-amber" : "badge-neutral"}>
                {ready ? "Active" : status.connected ? "Pending" : "Not connected"}
              </span>
            )}
            {status?.platformEnabled && !ready && canWrite && (
              <button className="btn-primary btn-sm" disabled={busy === "connect"} onClick={connect}>
                {busy === "connect" ? "Redirecting…" : status.connected ? "Finish setup" : "Connect Stripe"}
              </button>
            )}
          </div>
        </div>
        {!canWrite && <p className="muted mt-2 text-xs">Only an owner or billing user can connect Stripe.</p>}
      </div>

      {/* ── Invoices ──────────────────────────────────────────────────────── */}
      <div className="card">
        <div className="border-b border-surface-100 px-5 py-3.5"><h3 className="font-semibold">Collect on invoices</h3></div>
        {unpaid.length === 0 ? <p className="muted p-5">No outstanding invoices.</p> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Invoice</th><th>Patient</th><th>Outstanding</th><th>Status</th><th className="text-right">Payment link</th></tr></thead>
              <tbody>
                {unpaid.map((i) => (
                  <tr key={i.id}>
                    <td>{i.number ?? i.id.slice(0, 8)}</td>
                    <td>{i.patientName}</td>
                    <td>{fmtMoney(i.amount - i.amountPaid)}</td>
                    <td><span className="badge-neutral">{i.status}</span></td>
                    <td>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex justify-end gap-1.5">
                          <button className="btn-secondary btn-sm" disabled={actionsDisabled || busy === i.id} onClick={() => invoiceLink(i.id, false)}>
                            {i.payLink ? "Regenerate" : "Create link"}
                          </button>
                          <button className="btn-ghost btn-sm" disabled={actionsDisabled || busy === i.id || !i.hasEmail} title={i.hasEmail ? "" : "No patient email on file"} onClick={() => invoiceLink(i.id, true)}>
                            Email patient
                          </button>
                        </div>
                        {i.payLink && <div className="w-72 max-w-full"><CopyLink url={i.payLink} /></div>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── One-off link ───────────────────────────────────────────────── */}
        <div className="card card-pad">
          <h3 className="font-semibold">One-off payment link</h3>
          <p className="muted mt-0.5 text-sm">Deposits, copays or any ad-hoc charge — not tied to an invoice.</p>
          <form onSubmit={createOneOff} className="mt-3 space-y-3">
            <div><label className="label">Amount (USD)</label><input className="input" type="number" min="1" step="0.01" value={oneOff.amount} onChange={(e) => setOneOff((s) => ({ ...s, amount: e.target.value }))} required /></div>
            <div><label className="label">Description</label><input className="input" value={oneOff.description} onChange={(e) => setOneOff((s) => ({ ...s, description: e.target.value }))} placeholder="e.g. Initial deposit" required /></div>
            <button className="btn-primary btn-sm" disabled={actionsDisabled || busy === "oneoff"}>Create link</button>
          </form>
          {oneOffUrl && <div className="mt-3"><CopyLink url={oneOffUrl} /></div>}
        </div>

        {/* ── Recurring ──────────────────────────────────────────────────── */}
        <div className="card card-pad">
          <h3 className="font-semibold">Recurring billing</h3>
          <p className="muted mt-0.5 text-sm">Auto-charge a patient&apos;s saved card on a schedule for ongoing private-pay care.</p>
          <form onSubmit={createRecurring} className="mt-3 space-y-3">
            <div><label className="label">Patient</label>
              <select className="input" value={rec.patientId} onChange={(e) => setRec((s) => ({ ...s, patientId: e.target.value }))} required>
                <option value="">Select…</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Amount (USD)</label><input className="input" type="number" min="1" step="0.01" value={rec.amount} onChange={(e) => setRec((s) => ({ ...s, amount: e.target.value }))} required /></div>
              <div><label className="label">Every</label>
                <select className="input" value={rec.interval} onChange={(e) => setRec((s) => ({ ...s, interval: e.target.value }))}>
                  <option value="week">Week</option><option value="month">Month</option>
                </select>
              </div>
            </div>
            <div><label className="label">Description</label><input className="input" value={rec.description} onChange={(e) => setRec((s) => ({ ...s, description: e.target.value }))} placeholder="e.g. Weekly companion care" required /></div>
            <button className="btn-primary btn-sm" disabled={actionsDisabled || busy === "recurring"}>Create plan</button>
          </form>
          {recUrl && (
            <div className="mt-3">
              <p className="muted text-xs">Send this checkout link to the patient to capture their card:</p>
              <div className="mt-1"><CopyLink url={recUrl} /></div>
            </div>
          )}
        </div>
      </div>

      {/* ── Existing recurring plans ──────────────────────────────────────── */}
      {plans.length > 0 && (
        <div className="card">
          <div className="border-b border-surface-100 px-5 py-3.5"><h3 className="font-semibold">Recurring plans</h3></div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>Patient</th><th>Description</th><th>Amount</th><th>Interval</th><th>Status</th><th className="text-right">Checkout</th></tr></thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id}>
                    <td>{`${p.patient.firstName ?? ""} ${p.patient.lastName ?? ""}`.trim() || "—"}</td>
                    <td>{p.description}</td>
                    <td>{fmtMoney(p.amount)}</td>
                    <td>{p.interval === "week" ? "Weekly" : "Monthly"}</td>
                    <td><span className={planTone[p.status] ?? "badge-neutral"}>{p.status}</span></td>
                    <td className="text-right">{p.status === "PENDING" && p.stripeCheckoutUrl ? <div className="w-56 max-w-full ml-auto"><CopyLink url={p.stripeCheckoutUrl} /></div> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
