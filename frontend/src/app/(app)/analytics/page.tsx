import { PageHeader } from "@/components/layout/PageHeader";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";

export const metadata = {
  title: "Analytics — CoachFit",
  description: "Performance Management Chart, power curve, and zone distribution analysis for your training.",
};

export default function AnalyticsPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <PageHeader
        title="Analytics"
        subtitle="Performance Management Chart · Power Curve · Zone Distribution"
      />
      <div className="flex-1 overflow-y-auto">
        <AnalyticsClient />
      </div>
    </div>
  );
}
