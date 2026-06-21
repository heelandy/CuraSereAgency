"use client";

import { useState } from "react";

export function UpgradeButton({ plan, current }: { plan: string; current: boolean }) {
  const [loading, setLoading] = useState(false);

  async function upgrade() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.url) { window.location.href = j.url; return; }
      alert(j.message || "Billing is not configured in this environment.");
    } finally {
      setLoading(false);
    }
  }

  if (current) return <span className="badge-green">Current plan</span>;
  return (
    <button className="btn-primary btn-sm w-full" onClick={upgrade} disabled={loading}>
      {loading ? "Redirecting…" : "Choose plan"}
    </button>
  );
}
