import { prisma } from "@/lib/prisma";
import { config, stripeEnabled } from "@/lib/config";
import { stripeBillingFlag } from "@/lib/platform";
import { mailConfigured } from "@/lib/mail";
import { StatCard, SectionCard, Badge } from "@/components/ui";
import { BuildingIcon, DollarIcon, ShieldIcon, ChartIcon, UsersIcon, SparkIcon, ChatIcon } from "@/components/icons";
import { fmtDateTime } from "@/lib/format";

// Platform-owner system health: live "tickers" + service status + a security
// feed across the WHOLE platform (every tenant). Server component — queries run
// once on render. This is the super-admin's home view.
export async function PlatformHealth() {
  const now = Date.now();
  const d1 = new Date(now - 86_400_000);
  const d7 = new Date(now - 7 * 86_400_000);

  const [
    agencyTotal, agencyActive, newAgencies7d,
    subGroups, usersTotal, visitsTotal,
    loginFailures24h, securityRecent, deletedCount, recurringActive,
    openTickets, pendingVerification, stripeOn,
  ] = await Promise.all([
    prisma.agency.count(),
    prisma.agency.count({ where: { active: true } }),
    prisma.agency.count({ where: { createdAt: { gte: d7 } } }),
    prisma.agency.groupBy({ by: ["subscriptionStatus"], _count: { _all: true } }),
    prisma.user.count({ where: { role: { not: "PLATFORM_OWNER" } } }),
    prisma.visit.count(),
    prisma.securityEvent.count({ where: { kind: "LOGIN_FAILURE", createdAt: { gte: d1 } } }),
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.deletedRecord.count(),
    prisma.recurringPlan.count({ where: { status: "ACTIVE" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.agency.count({ where: { verificationStatus: "PENDING" } }),
    stripeBillingFlag(),
  ]);

  const sub: Record<string, number> = {};
  for (const g of subGroups) sub[g.subscriptionStatus] = g._count._all;
  const suspended = agencyTotal - agencyActive;

  // Service status indicators.
  const stripeStatus = !stripeEnabled
    ? { tone: "neutral" as const, text: "Not configured" }
    : stripeOn ? { tone: "green" as const, text: "Enabled" } : { tone: "red" as const, text: "Disabled" };
  const statuses = [
    { label: "Database", tone: "green" as const, text: "Operational" },
    { label: "Billing (Stripe)", ...stripeStatus },
    { label: "Email", tone: mailConfigured ? ("green" as const) : ("amber" as const), text: mailConfigured ? "Live" : "Dev (logged)" },
    { label: "Environment", tone: config.isProd ? ("blue" as const) : ("amber" as const), text: config.isProd ? "Production" : "Development" },
  ];

  const subRows = [
    { key: "active", label: "Active", tone: "green" as const },
    { key: "trialing", label: "Trialing", tone: "blue" as const },
    { key: "past_due", label: "Past due", tone: "red" as const },
    { key: "canceled", label: "Canceled", tone: "neutral" as const },
  ];
  const subTotal = subRows.reduce((s, r) => s + (sub[r.key] ?? 0), 0) || 1;

  const sevTone: Record<string, string> = {
    LOGIN_FAILURE: "red", FORBIDDEN: "red", CSRF: "red", RATE_LIMIT: "amber", "2FA": "blue", LOGIN_SUCCESS: "green",
  };

  return (
    <div className="space-y-6">
      {/* Service status */}
      <div className="card card-pad">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-500" />
            </span>
            <span className="text-sm font-semibold text-surface-800">All systems operational</span>
          </div>
          {statuses.map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-sm text-surface-500">{s.label}</span>
              <Badge tone={s.tone}>{s.text}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Health tickers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Agencies" value={agencyTotal} hint={`${agencyActive} active · ${suspended} suspended`} icon={<BuildingIcon />} tone="blue" />
        <StatCard label="Awaiting verification" value={pendingVerification} hint="needs review" icon={<ShieldIcon />} tone={pendingVerification > 0 ? "amber" : "green"} />
        <StatCard label="New this week" value={newAgencies7d} hint="agencies signed up" icon={<SparkIcon />} tone="green" />
        <StatCard label="Open tickets" value={openTickets} hint="support" icon={<ChatIcon />} tone={openTickets > 0 ? "amber" : "green"} />
        <StatCard label="Past due" value={sub.past_due ?? 0} icon={<DollarIcon />} tone={(sub.past_due ?? 0) > 0 ? "red" : "green"} />
        <StatCard label="Login failures (24h)" value={loginFailures24h} icon={<ShieldIcon />} tone={loginFailures24h > 0 ? "amber" : "green"} />
        <StatCard label="Active recurring" value={recurringActive} hint="patient subscriptions" icon={<DollarIcon />} tone="violet" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription health */}
        <SectionCard title="Subscription health">
          <ul className="space-y-3">
            {subRows.map((r) => {
              const n = sub[r.key] ?? 0;
              return (
                <li key={r.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Badge tone={r.tone}>{r.label}</Badge></span>
                    <span className="font-medium text-surface-800">{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-100">
                    <div className={`h-full rounded-full ${r.tone === "red" ? "bg-red-400" : r.tone === "blue" ? "bg-sky-400" : r.tone === "green" ? "bg-brand-500" : "bg-surface-300"}`} style={{ width: `${Math.round((n / subTotal) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-surface-100 pt-3 text-sm">
            <span className="text-surface-500">Platform totals</span>
            <span className="flex items-center gap-3 text-surface-700">
              <span className="flex items-center gap-1"><UsersIcon width={14} /> {usersTotal} users</span>
              <span className="flex items-center gap-1"><ChartIcon width={14} /> {visitsTotal} visits</span>
            </span>
          </div>
        </SectionCard>

        {/* Security feed */}
        <SectionCard title="Recent security events">
          {securityRecent.length === 0 ? (
            <p className="muted">No security events recorded.</p>
          ) : (
            <ul className="divide-y divide-surface-100">
              {securityRecent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium text-surface-800">
                      <Badge tone={sevTone[e.kind] ?? "neutral"}>{e.kind.replace(/_/g, " ")}</Badge>
                      <span className="truncate text-surface-500">{e.detail ?? e.ip ?? ""}</span>
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-surface-400">{fmtDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
