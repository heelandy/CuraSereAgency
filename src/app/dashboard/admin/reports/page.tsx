import { requireCap } from "@/lib/authz";
import { PageHeader, SectionCard } from "@/components/ui";
import { FileIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

const reports: { title: string; desc: string; href: string }[] = [
  { title: "Caregiver Roster (CSV)", desc: "All caregivers with discipline, status and contact info.", href: "/api/reports/roster" },
  { title: "Compliance Report (CSV)", desc: "Licenses, certifications, training and AHCA items with expiry.", href: "/api/reports/compliance" },
  { title: "Payroll — QuickBooks (CSV)", desc: "Hours, overtime and gross pay formatted for QuickBooks.", href: "/api/payroll/export?format=quickbooks" },
  { title: "Payroll — ADP (CSV)", desc: "Payroll export formatted for ADP.", href: "/api/payroll/export?format=adp" },
  { title: "Payroll — Gusto (CSV)", desc: "Payroll export formatted for Gusto.", href: "/api/payroll/export?format=gusto" },
  { title: "Payroll — Paychex (CSV)", desc: "Payroll export formatted for Paychex.", href: "/api/payroll/export?format=paychex" },
];

export default async function ReportsPage() {
  await requireCap("admin:manage");
  return (
    <div>
      <PageHeader title="Reports" subtitle="Export agency data for finance, payroll and compliance" />
      <SectionCard title="Available reports">
        <ul className="divide-y divide-surface-100">
          {reports.map((r) => (
            <li key={r.href} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <span className="icon-chip bg-brand-50 text-brand-600"><FileIcon width={18} /></span>
                <div>
                  <p className="text-sm font-medium text-surface-800">{r.title}</p>
                  <p className="text-xs text-surface-500">{r.desc}</p>
                </div>
              </div>
              <a href={r.href} target="_blank" rel="noopener" className="btn-secondary btn-sm">Download</a>
            </li>
          ))}
        </ul>
        <p className="muted mt-3">Patient summary PDFs are available from each patient&apos;s profile page.</p>
      </SectionCard>
    </div>
  );
}
