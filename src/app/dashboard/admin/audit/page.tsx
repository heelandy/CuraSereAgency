import { requireCap } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { PageHeader, SectionCard, Badge } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const ctx = await requireCap("audit:read");
  const [logs, events] = await Promise.all([
    prisma.auditLog.findMany({
      where: { agencyId: ctx.agencyId },
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" }, take: 100,
    }),
    prisma.securityEvent.findMany({ where: { agencyId: ctx.agencyId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Append-only record of administrative and security activity" />

      <SectionCard title="Administrative Activity" className="mb-6">
        {logs.length === 0 ? <p className="muted">No activity recorded yet.</p> : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap">{fmtDateTime(l.createdAt)}</td>
                    <td>{l.actor?.name ?? "System"}</td>
                    <td><code className="rounded bg-surface-100 px-1.5 py-0.5 text-xs">{l.action}</code></td>
                    <td className="text-xs text-surface-500">{l.target ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Security Events">
        {events.length === 0 ? <p className="muted">No security events.</p> : (
          <table className="table">
            <thead><tr><th>When</th><th>Kind</th><th>Detail</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(e.createdAt)}</td>
                  <td><Badge tone={e.kind.includes("FAIL") || e.kind === "FORBIDDEN" ? "red" : "neutral"}>{e.kind}</Badge></td>
                  <td className="text-xs text-surface-500">{e.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}
