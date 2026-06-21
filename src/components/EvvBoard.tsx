"use client";

import { useEffect, useState } from "react";
import { fmtTime } from "@/lib/format";

type Visit = {
  id: string; status: string; scheduledStart: string; scheduledEnd: string;
  patient?: { firstName: string; lastName: string } | null;
  caregiver?: { firstName: string; lastName: string } | null;
  evv?: { verification: string; checkInAt: string | null; checkOutAt: string | null } | null;
};

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
    setBusy(visitId);
    const coords = await getCoords();
    await fetch(`/api/visits/${visitId}/evv`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...coords }),
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
                  {v.evv?.verification === "VERIFIED" ? <span className="badge-green">Verified</span>
                    : v.evv?.checkInAt ? <span className="badge-violet">Checked in</span>
                    : <span className="badge-neutral">Pending</span>}
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
