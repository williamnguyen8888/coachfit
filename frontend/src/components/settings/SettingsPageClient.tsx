"use client";
// src/components/settings/SettingsPageClient.tsx
// Settings page orchestrator.
// Renders a side-tab nav on desktop / tab strip on mobile, with lazy-mounted
// section panels for: Profile · Zones · Connections · API Keys · Subscription.

import React, { useState } from "react";
import {
  User,
  Zap,
  Link2,
  Key,
  Crown,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth.store";
import { ProfileSection } from "./ProfileSection";
import { ZonesSection } from "./ZonesSection";
import { ConnectionsSection } from "./ConnectionsSection";
import { ApiKeysSection } from "./ApiKeysSection";
import { SubscriptionSection } from "./SubscriptionSection";

/* ─── Tab config ─────────────────────────────────────────────────────────── */

type TabId = "profile" | "zones" | "connections" | "api-keys" | "subscription";

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  {
    id: "profile",
    label: "Athlete Profile",
    icon: <User size={16} />,
    description: "Name, sport preferences, and body stats",
  },
  {
    id: "zones",
    label: "Sport Zones",
    icon: <Zap size={16} />,
    description: "FTP, LTHR, and training zone configuration",
  },
  {
    id: "connections",
    label: "Connected Accounts",
    icon: <Link2 size={16} />,
    description: "Strava, Garmin, and platform integrations",
  },
  {
    id: "api-keys",
    label: "API Keys",
    icon: <Key size={16} />,
    description: "Manage programmatic access tokens",
  },
  {
    id: "subscription",
    label: "Subscription",
    icon: <Crown size={16} />,
    description: "Plan and billing management",
  },
];

/* ─── Section map ─────────────────────────────────────────────────────────── */

const SECTION_MAP: Record<TabId, React.ComponentType> = {
  profile: ProfileSection,
  zones: ZonesSection,
  connections: ConnectionsSection,
  "api-keys": ApiKeysSection,
  subscription: SubscriptionSection,
};

/* ─── Sidebar tab item ────────────────────────────────────────────────────── */

function SidebarTab({
  tab,
  isActive,
  onClick,
}: {
  tab: TabConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={`settings-tab-${tab.id}`}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-md)] transition-all duration-150 text-left cursor-pointer border"
      style={{
        background: isActive
          ? "color-mix(in srgb, var(--color-accent) 10%, var(--bg-elevated))"
          : "transparent",
        borderColor: isActive
          ? "color-mix(in srgb, var(--color-accent) 30%, transparent)"
          : "transparent",
        color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
      }}
    >
      <span
        className="shrink-0"
        style={{ color: isActive ? "var(--color-accent)" : "var(--text-muted)" }}
      >
        {tab.icon}
      </span>
      <div className="flex flex-col gap-0 min-w-0">
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: isActive ? 600 : 500,
            color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
            whiteSpace: "nowrap",
          }}
        >
          {tab.label}
        </span>
        <span
          className="hidden lg:block truncate"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          {tab.description}
        </span>
      </div>
    </button>
  );
}

/* ─── Mobile tab strip ─────────────────────────────────────────────────────── */

function MobileTabStrip({
  activeTab,
  onSelect,
}: {
  activeTab: TabId;
  onSelect: (id: TabId) => void;
}) {
  return (
    <div
      className="flex overflow-x-auto gap-1 pb-1 scrollbar-hide"
      role="tablist"
      aria-label="Settings sections"
      style={{ scrollbarWidth: "none" }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`settings-mobile-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-full)] whitespace-nowrap transition-all duration-150 border shrink-0 cursor-pointer"
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: isActive ? 600 : 500,
              background: isActive
                ? "color-mix(in srgb, var(--color-accent) 12%, var(--bg-surface))"
                : "var(--bg-input)",
              borderColor: isActive
                ? "color-mix(in srgb, var(--color-accent) 35%, transparent)"
                : "var(--border-subtle)",
              color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main client ─────────────────────────────────────────────────────────── */

export function SettingsPageClient() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const logout = useAuthStore((s) => s.logout);

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;
  const ActiveSection = SECTION_MAP[activeTab];

  return (
    <div className="flex-1">
      {/* Page header */}
      <header
        className="flex items-start justify-between px-4 lg:px-6 pt-6 pb-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div>
          <h1
            className="font-bold tracking-tight"
            style={{
              fontSize: "var(--text-2xl)",
              color: "var(--text-primary)",
            }}
          >
            Settings
          </h1>
          <p
            className="mt-1"
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-secondary)",
            }}
          >
            Profile, zones, connections, and API keys
          </p>
        </div>

        <Button
          id="settings-logout-btn"
          variant="ghost"
          size="sm"
          leftIcon={<LogOut size={14} />}
          onClick={logout}
        >
          Log out
        </Button>
      </header>

      {/* Body */}
      <div className="px-4 lg:px-6 py-5 pb-safe">
        {/* Mobile tab strip */}
        <div className="lg:hidden mb-5">
          <MobileTabStrip activeTab={activeTab} onSelect={setActiveTab} />
        </div>

        {/* Desktop: sidebar + panel */}
        <div className="flex gap-6 items-start">
          {/* Sidebar (desktop only) */}
          <nav
            className="hidden lg:flex flex-col gap-1 shrink-0"
            role="tablist"
            aria-label="Settings sections"
            style={{ width: 220 }}
          >
            {TABS.map((tab) => (
              <SidebarTab
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}

            {/* Spacer + Logout */}
            <div
              className="mt-4 pt-4"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <button
                id="settings-sidebar-logout"
                type="button"
                onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-[var(--radius-md)] transition-all duration-150 cursor-pointer"
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--color-danger)",
                  background: "transparent",
                  border: "none",
                }}
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          </nav>

          {/* Panel */}
          <div className="flex-1 min-w-0">
            {/* Panel header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ color: "var(--color-accent)" }}>
                  {activeTabConfig.icon}
                </span>
                <h2
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {activeTabConfig.label}
                </h2>
              </div>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-secondary)",
                }}
              >
                {activeTabConfig.description}
              </p>
            </div>

            {/* Section content */}
            <div
              className="rounded-[var(--radius-lg)] p-5"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <ActiveSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
