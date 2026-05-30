import { PageHeader } from "@/components/layout/PageHeader";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex-1">
      <PageHeader
        title="Settings"
        subtitle="Profile, zones, connections, and API keys"
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
          Settings coming in F14
        </div>
      </div>
    </div>
  );
}
