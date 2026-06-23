"use client";

import { useState } from "react";

// Patient/Family "Pay now" — opens the agency's hosted Stripe payment page.
export function PortalPayButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  async function pay() {
    setLoading(true);
    try {
      const res = await fetch(`/api/portal/invoices/${invoiceId}/pay`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.url) { window.location.href = j.url; return; }
      alert(j.message || "Payment is unavailable right now.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <button className="btn-primary btn-sm" onClick={pay} disabled={loading}>
      {loading ? "…" : "Pay now"}
    </button>
  );
}
