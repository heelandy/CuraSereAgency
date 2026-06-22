"use client";

import { useEffect, useState } from "react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { PTO_TYPE, PTO_STATUS } from "@/lib/enums";

type Summary = {
  name: string; hourlyRate: number;
  week: { regular: number; overtime: number };
  lifetime: { regular: number; overtime: number };
  miles: number; mileageRate: number; ptoAvailable: number; estGross: number;
  recentPto: { id: string; type: string; hours: number; status: string; startDate: string | null }[];
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card card-pad">
      <p className="text-sm font-medium text-surface-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-surface-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-surface-400">{hint}</p>}
    </div>
  );
}

export function MyTime() {
  const [s, setS] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/caregiver/summary").then((r) => r.json()).then((d) => { setS(d); setLoading(false); });
  }, []);

  if (loading) return <p className="muted">Loading…</p>;
  if (!s) return <p className="muted">Your account isn&apos;t linked to a caregiver record. Contact your agency.</p>;

  const ptoTone: Record<string, string> = { REQUESTED: "badge-amber", APPROVED: "badge-green", DENIED: "badge-red", USED: "badge-neutral", EXPIRED: "badge-neutral" };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="This week" value={`${s.week.regular + s.week.overtime}h`} hint={`${s.week.regular}h reg · ${s.week.overtime}h OT`} />
        <Stat label="PTO available" value={`${s.ptoAvailable}h`} />
        <Stat label="Mileage (paid)" value={`${s.miles} mi`} hint={`@ ${fmtMoney(s.mileageRate)}/mi`} />
        <Stat label="Est. gross pay" value={fmtMoney(s.estGross)} hint={`rate ${fmtMoney(s.hourlyRate)}/hr`} />
      </div>

      <div className="card">
        <div className="border-b border-surface-100 px-5 py-3.5"><h3 className="font-semibold">Recent PTO requests</h3></div>
        <div className="card-pad">
          {s.recentPto.length === 0 ? <p className="muted">No PTO requests.</p> : (
            <ul className="divide-y divide-surface-100">
              {s.recentPto.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-surface-800">{PTO_TYPE[p.type as keyof typeof PTO_TYPE] ?? p.type} · {p.hours}h{p.startDate ? ` · ${fmtDate(p.startDate)}` : ""}</span>
                  <span className={ptoTone[p.status] ?? "badge-neutral"}>{PTO_STATUS[p.status as keyof typeof PTO_STATUS] ?? p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
