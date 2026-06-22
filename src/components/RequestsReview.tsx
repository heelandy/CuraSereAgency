"use client";

import { useEffect, useState } from "react";
import { fmtDate, fmtDateTime, fullName } from "@/lib/format";
import { ALL_REQUEST_LABELS, REQUEST_STATUS } from "@/lib/enums";

type Req = {
  id: string; type: string; message: string; status: string; requestedByName: string | null;
  preferredDate: string | null; preferredCaregiver: string | null; reviewNote: string | null; createdAt: string;
  patient?: { id: string; firstName: string; lastName: string } | null;
};

const TONE: Record<string, string> = { PENDING: "badge-amber", APPROVED: "badge-green", DECLINED: "badge-red" };

export function RequestsReview() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/requests");
    setRows(res.ok ? await res.json() : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function review(id: string, status: "APPROVED" | "DECLINED") {
    const reviewNote = window.prompt(`Optional note for this ${status.toLowerCase()} decision:`) ?? "";
    setBusy(id);
    await fetch(`/api/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reviewNote }) });
    setBusy(null);
    await load();
  }

  if (loading) return <p className="muted">Loading requests…</p>;
  if (rows.length === 0) return <p className="muted">No requests from patients or family yet.</p>;

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="card card-pad">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-surface-900">{ALL_REQUEST_LABELS[r.type as keyof typeof ALL_REQUEST_LABELS] ?? r.type}</span>
                <span className={TONE[r.status] ?? "badge-neutral"}>{REQUEST_STATUS[r.status as keyof typeof REQUEST_STATUS] ?? r.status}</span>
              </div>
              <p className="muted mt-0.5">
                {r.patient ? fullName(r.patient) : "—"} · from {r.requestedByName ?? "portal user"} · {fmtDateTime(r.createdAt)}
              </p>
              <p className="mt-2 text-sm text-surface-700">{r.message}</p>
              {r.preferredDate && <p className="mt-1 text-xs text-surface-500">Preferred date: {fmtDate(r.preferredDate)}</p>}
              {r.preferredCaregiver && <p className="text-xs text-surface-500">Preferred caregiver: {r.preferredCaregiver}</p>}
              {r.reviewNote && <p className="mt-1 text-xs text-surface-500">Note: {r.reviewNote}</p>}
            </div>
            {r.status === "PENDING" && (
              <div className="flex gap-2">
                <button className="btn-primary btn-sm" disabled={busy === r.id} onClick={() => review(r.id, "APPROVED")}>Approve</button>
                <button className="btn-secondary btn-sm" disabled={busy === r.id} onClick={() => review(r.id, "DECLINED")}>Decline</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
