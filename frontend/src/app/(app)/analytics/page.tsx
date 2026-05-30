import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Analytics"
        subtitle="PMC, power curves, and zone distribution"
      />
      <div className="px-4 lg:px-6 py-6">
        <div
          className="rounded-lg flex items-center justify-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            minHeight: 300,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          Analytics coming in F17
        </div>
      </div>
    </div>
  );
}
