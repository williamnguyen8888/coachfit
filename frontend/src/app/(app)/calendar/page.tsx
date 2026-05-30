import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Calendar"
        subtitle="Plan and review your training schedule"
      />
      <div className="px-4 lg:px-6 py-6">
        <div
          className="rounded-lg flex items-center justify-center"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            minHeight: 400,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          Calendar coming in F10
        </div>
      </div>
    </div>
  );
}
