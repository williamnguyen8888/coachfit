"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth.store";
import { LogOut } from "lucide-react";

export default function SettingsPage() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="flex-1">
      <PageHeader
        title="Settings"
        subtitle="Profile, zones, connections, and API keys"
      />
      <div className="px-4 lg:px-6 py-6">
        <div
          className="rounded-lg flex flex-col items-center justify-center p-8 gap-4"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            minHeight: 300,
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          <div>Settings coming in F14</div>
          <Button
            variant="danger"
            size="md"
            leftIcon={<LogOut size={16} />}
            onClick={logout}
          >
            Log Out (Temporary)
          </Button>
        </div>
      </div>
    </div>
  );
}
