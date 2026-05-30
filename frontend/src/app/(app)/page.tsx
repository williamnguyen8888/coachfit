import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Dashboard"
        subtitle="Good morning — here&apos;s your training overview"
      />
      <div className="px-4 lg:px-6 py-6">
        <div
          className="rounded-lg flex items-center justify-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            minHeight: 240,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          Dashboard coming in F12
        </div>
      </div>
    </div>
  );
}
