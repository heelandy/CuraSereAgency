"use client";

import { useEffect, useState } from "react";
import { fmtDateTime, fmtTime, fmtDate, fullName } from "@/lib/format";
import { SERVICE_TYPE, VISIT_STATUS } from "@/lib/enums";

type MyShift = {
  id: string; status: string; serviceType: string; scheduledStart: string; scheduledEnd: string;
  patient?: { firstName: string; lastName: string; addressLine: string | null; city: string | null; phone: string | null } | null;
  evv?: { checkInAt: string | null; checkOutAt: string | null; verification: string } | null;
};
type OpenShift = {
  id: string; scheduledStart: string; scheduledEnd: string; serviceType: string;
  area: string; requiredSkills: string; durationMins: number; claimed: boolean;
};

const TONE: Record<string, string> = { SCHEDULED: "badge-blue", IN_PROGRESS: "badge-violet", COMPLETED: "badge-green", MISSED: "badge-red", CANCELED: "badge-neutral", OPEN: "badge-amber" };

export function CaregiverShifts() {
  const [mine, setMine] = useState<MyShift[]>([]);
  const [open, setOpen] = useState<OpenShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notCaregiver, setNotCaregiver] = useState(false);

  async function load() {
    setLoading(true);
    const [mRes, oRes] = await Promise.all([fetch("/api/caregiver/shifts"), fetch("/api/caregiver/open-shifts")]);
    const m: MyShift[] = mRes.ok ? await mRes.json() : [];
    const o: OpenShift[] = oRes.ok ? await oRes.json() : [];
    setMine(m); setOpen(o);
    setNotCaregiver(m.length === 0 && o.length === 0);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function claim(visitId: string) {
    setBusy(visitId);
    const res = await fetch("/api/caregiver/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ visitId }) });
    setBusy(null);
    if (res.ok) { alert("Shift claimed — pending scheduler approval."); await load(); }
    else { const j = await res.json().catch(() => ({})); alert(j.message || "Could not claim shift."); }
  }

  function getCoords(): Promise<{ lat?: number; lng?: number; method: string }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({ method: "MANUAL" });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, method: "GPS" }),
        () => resolve({ method: "MANUAL" }),
        { timeout: 5000 },
      );
    });
  }

  // Caregiver checks in / out of their OWN assigned shift (EVV).
  async function evv(visitId: string, action: "check-in" | "check-out") {
    let signatureName: string | undefined;
    if (action === "check-out") {
      const sig = window.prompt("Type your full name to sign and complete this visit:");
      if (sig === null) return;
      signatureName = sig.trim() || undefined;
    }
    setBusy(visitId);
    const coords = await getCoords();
    const res = await fetch(`/api/visits/${visitId}/evv`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...coords, signatureName }),
    });
    setBusy(null);
    if (res.ok) await load();
    else { const j = await res.json().catch(() => ({})); alert(j.message || "Could not record visit verification."); }
  }

  if (loading) return <p className="muted">Loading your shifts…</p>;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-base font-semibold text-surface-800">My upcoming shifts</h2>
        {mine.length === 0 ? <p className="muted">No assigned shifts. Pick up an open shift below.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((v) => (
              <div key={v.id} className="card card-pad">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-900">{fmtDate(v.scheduledStart)} · {fmtTime(v.scheduledStart)}–{fmtTime(v.scheduledEnd)}</span>
                  <span className={TONE[v.status] ?? "badge-neutral"}>{VISIT_STATUS[v.status as keyof typeof VISIT_STATUS] ?? v.status}</span>
                </div>
                <p className="mt-2 font-medium text-surface-800">{fullName(v.patient)}</p>
                <p className="muted">{SERVICE_TYPE[v.serviceType as keyof typeof SERVICE_TYPE] ?? v.serviceType}</p>
                <p className="mt-1 text-xs text-surface-500">{[v.patient?.addressLine, v.patient?.city].filter(Boolean).join(", ") || "—"}</p>
                {v.patient?.phone && <p className="text-xs text-surface-500">{v.patient.phone}</p>}
                <div className="mt-3">
                  {v.status === "COMPLETED" ? (
                    <span className="badge-green">Visit verified</span>
                  ) : v.status === "IN_PROGRESS" ? (
                    <button className="btn-primary btn-sm w-full" disabled={busy === v.id} onClick={() => evv(v.id, "check-out")}>
                      {busy === v.id ? "Saving…" : "Check out"}
                    </button>
                  ) : (
                    <button className="btn-secondary btn-sm w-full" disabled={busy === v.id} onClick={() => evv(v.id, "check-in")}>
                      {busy === v.id ? "Saving…" : "Check in"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-base font-semibold text-surface-800">Open shifts you can pick up</h2>
        <p className="muted mb-3">Limited details shown until a scheduler approves your claim.</p>
        {open.length === 0 ? <p className="muted">No open shifts you qualify for right now.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((s) => (
              <div key={s.id} className="card card-pad">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-surface-900">{fmtDateTime(s.scheduledStart)}</span>
                  <span className="badge-amber">{Math.round(s.durationMins / 60 * 10) / 10}h</span>
                </div>
                <p className="mt-2 text-sm text-surface-700">{SERVICE_TYPE[s.serviceType as keyof typeof SERVICE_TYPE] ?? s.serviceType}</p>
                <p className="text-xs text-surface-500">Area: {s.area}</p>
                {s.requiredSkills && <p className="text-xs text-surface-500">Skills: {s.requiredSkills}</p>}
                <button
                  className="btn-primary btn-sm mt-3 w-full"
                  disabled={s.claimed || busy === s.id}
                  onClick={() => claim(s.id)}
                >
                  {s.claimed ? "Claim pending" : busy === s.id ? "Claiming…" : "Pick up shift"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
