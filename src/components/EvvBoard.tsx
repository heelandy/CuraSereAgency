"use client";

import { useEffect, useState } from "react";
import { fmtTime } from "@/lib/format";

type Visit = {
  id: string; status: string; scheduledStart: string; scheduledEnd: string;
  patient?: { firstName: string; lastName: string } | null;
  caregiver?: { firstName: string; lastName: string } | null;
  evv?: { verification: string; checkInAt: string | null; checkOutAt: string | null } | null;
};

// EVV exception flags (late in / early out / missing checkout / wrong duration).
function evvFlags(v: Visit): string[] {
  const out: string[] = [];
  const start = new Date(v.scheduledStart).getTime();
  const end = new Date(v.scheduledEnd).getTime();
  const tol = 15 * 60000;
  if (v.evv?.checkInAt && new Date(v.evv.checkInAt).getTime() > start + tol) out.push("Late in");
  if (v.evv?.checkOutAt && new Date(v.evv.checkOutAt).getTime() < end - tol) out.push("Early out");
  if (v.status === "IN_PROGRESS" && Date.now() > end + tol) out.push("Missing out");
  return out;
}

export function EvvBoard() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/r/visits");
    let data: Visit[] = res.ok ? await res.json() : [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    data = data.filter((v) => {
      const t = new Date(v.scheduledStart);
      return t >= today && t < tomorrow;
    });
    data.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
    setVisits(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function getCoords(): Promise<{ lat?: number; lng?: number; method: string }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ method: "MANUAL" });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, method: "GPS" }),
        () => resolve({ method: "MANUAL" }),
        { timeout: 5000 },
      );
    });
  }

  async function act(visitId: string, action: "check-in" | "check-out") {
    // Capture an e-signature on check-out (caregiver attestation).
    let signatureName: string | undefined;
    if (action === "check-out") {
      const sig = window.prompt("Type your full name to sign and complete this visit:");
      if (sig === null) return; // canceled
      signatureName = sig.trim() || undefined;
    }
    setBusy(visitId);
    const coords = await getCoords();
    await fetch(`/api/visits/${visitId}/evv`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...coords, signatureName }),
    });
    setBusy(null);
    await load();
  }

  if (loading) return <p className="muted">Loading today&apos;s visits…</p>;

  return (
    <div className="card">
      <div className="overflow-x-auto">
        <table className="table">
          <thead><tr><th>Time</th><th>Patient</th><th>Caregiver</th><th>EVV</th><th>Status</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {visits.length === 0 ? (
              <tr><td colSpan={6} className="py-10 text-center text-surface-400">No visits scheduled today.</td></tr>
            ) : visits.map((v) => (
              <tr key={v.id}>
                <td>{fmtTime(v.scheduledStart)}</td>
                <td>{v.patient ? `${v.patient.firstName} ${v.patient.lastName}` : "—"}</td>
                <td>{v.caregiver ? `${v.caregiver.firstName} ${v.caregiver.lastName}` : "—"}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-1">
                    {v.evv?.verification === "VERIFIED" ? <span className="badge-green">Verified</span>
                      : v.evv?.checkInAt ? <span className="badge-violet">Checked in</span>
                      : <span className="badge-neutral">Pending</span>}
                    {evvFlags(v).map((f) => <span key={f} className="badge-amber">{f}</span>)}
                  </div>
                </td>
                <td><span className="badge-neutral">{v.status}</span></td>
                <td className="text-right">
                  {v.status === "COMPLETED" ? <span className="muted">Done</span>
                    : v.status === "IN_PROGRESS"
                      ? <button className="btn-primary btn-sm" disabled={busy === v.id} onClick={() => act(v.id, "check-out")}>Check out</button>
                      : <button className="btn-secondary btn-sm" disabled={busy === v.id} onClick={() => act(v.id, "check-in")}>Check in</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
