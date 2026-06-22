"use client";

import { useState } from "react";

// Shown to a platform owner who is "viewing as" another agency. Lets them exit
// back to their home tenant.
export function PlatformBanner({ agencyName }: { agencyName: string }) {
  const [busy, setBusy] = useState(false);
  async function exit() {
    setBusy(true);
    await fetch("/api/platform/act-as", { method: "DELETE" });
    window.location.href = "/dashboard/platform";
  }
  return (
    <div className="flex items-center justify-between gap-3 bg-violet-600 px-4 py-2 text-sm text-white">
      <span>
        Platform owner — viewing <strong>{agencyName}</strong> as a tenant. Changes affect this agency.
      </span>
      <button onClick={exit} disabled={busy} className="rounded-lg bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
        {busy ? "Exiting…" : "Exit to platform"}
      </button>
    </div>
  );
}
