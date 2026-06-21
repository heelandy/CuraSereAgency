import { CrudResource } from "@/components/CrudResource";
import { resourceDefs } from "@/components/resource-defs";
import { PageHeader } from "@/components/ui";
import { GenerateInsightsButton } from "@/components/GenerateInsightsButton";

export const dynamic = "force-dynamic";

export default function AiInsightsPage() {
  return (
    <div>
      <PageHeader
        title="AI Insights"
        subtitle="Compliance, fall-risk, staffing, burnout and revenue intelligence"
        action={<GenerateInsightsButton />}
      />
      <CrudResource {...resourceDefs["ai-insights"]} embedded />
    </div>
  );
}
