import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Workouts" };

export default function WorkoutsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Workouts"
        subtitle="Build, manage and schedule structured workouts"
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
          Workout library coming in F08
        </div>
      </div>
    </div>
  );
}
