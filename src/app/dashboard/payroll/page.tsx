import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const EXPORTS = [
  ["QuickBooks", "quickbooks"], ["ADP", "adp"], ["Gusto", "gusto"], ["Paychex", "paychex"],
];

export default function PayrollPage() {
  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Hours, overtime, mileage and provider exports"
        action={
          <div className="flex flex-wrap gap-2">
            {EXPORTS.map(([label, fmt]) => (
              <a key={fmt} href={`/api/payroll/export?format=${fmt}`} className="btn-secondary btn-sm" target="_blank" rel="noopener">
                Export {label}
              </a>
            ))}
          </div>
        }
      />
      <CrudResource {...resourceDefs.payroll} embedded />
    </div>
  );
}
