"use client";

/**
 * SettingsPageClient — settings page orchestrator.
 * Custom built for dual-layouts:
 * - Desktop: side-by-side sticky sidebar + glassmorphic configuration panel.
 * - Mobile: drill-down settings menu index to single panel detail screens, preventing layout shifts.
 */

import React, { useState, useCallback } from "react";
import {
  User,
  Zap,
  Link2,
  Key,
  Crown,
  LogOut,
  ChevronRight,
  ChevronLeft,
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
    description: "Manage your name, sport preferences, and weight",
  },
  {
    id: "zones",
    label: "Training Zones",
    icon: <Zap size={16} />,
    description: "Configure your FTP, LTHR, and pace ranges",
  },
  {
    id: "connections",
    label: "Connected Accounts",
    icon: <Link2 size={16} />,
    description: "Strava, Garmin, and platform data synchronization",
  },
  {
    id: "api-keys",
    label: "API Access Keys",
    icon: <Key size={16} />,
    description: "Manage programmatic access tokens",
  },
  {
    id: "subscription",
    label: "Subscription Plan",
    icon: <Crown size={16} />,
    description: "Manage billing details and subscription status",
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
  const [hovered, setHovered] = useState(false);

  return (
    <button
      id={`settings-tab-${tab.id}`}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-3 w-full px-4 py-3 rounded-[var(--radius-lg)] transition-all duration-300 text-left cursor-pointer border"
      style={{
        background: isActive
          ? "rgba(255, 255, 255, 0.03)"
          : hovered
          ? "rgba(255, 255, 255, 0.015)"
          : "transparent",
        borderColor: isActive
          ? "rgba(255, 255, 255, 0.06)"
          : "transparent",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {/* Accent left indicator bar */}
      <div 
        className="absolute left-0 top-1/4 bottom-1/4 w-[2px] rounded-r-full transition-all duration-300"
        style={{
          background: "var(--color-accent)",
          opacity: isActive ? 1 : 0,
          transform: isActive ? "scaleY(1.2)" : "scaleY(0.4)",
        }}
      />

      <span
        className="shrink-0"
        style={{ 
          color: isActive ? "var(--color-accent)" : "var(--text-muted)",
          transition: "color 0.3s",
        }}
      >
        {tab.icon}
      </span>
      <div className="flex flex-col min-w-0">
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
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}
        >
          {tab.description}
        </span>
      </div>
    </button>
  );
}

/* ─── Main client ─────────────────────────────────────────────────────────── */

export function SettingsPageClient() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;
  const ActiveSection = SECTION_MAP[activeTab];

  const handleMobileSelect = useCallback((id: TabId) => {
    setActiveTab(id);
    setShowMobileDetail(true);
    // Scroll mobile window back to top of settings details
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
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
            Manage your personal profile, training load zones, and synced services
          </p>
        </div>

        <Button
          id="settings-logout-btn"
          variant="ghost"
          size="sm"
          leftIcon={<LogOut size={14} />}
          onClick={logout}
          className="hover:bg-[rgba(255,255,255,0.04)]"
        >
          Log out
        </Button>
      </header>

      {/* Body */}
      <div className="px-4 lg:px-6 py-5 pb-safe flex-1 min-h-0">
        {/* Mobile Viewports: Switch between Category List and Detail Section Panel */}
        <div className="lg:hidden">
          {!showMobileDetail ? (
            /* Category index list */
            <div className="flex flex-col gap-3 animate-fadeInScale" style={{ animationDuration: "200ms" }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleMobileSelect(tab.id)}
                  className="flex items-center justify-between w-full p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.015)] transition-all duration-200 active:bg-[rgba(255,255,255,0.035)] active:scale-[0.99] text-left cursor-pointer"
                  style={{
                    background: "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="flex items-center justify-center rounded-[var(--radius-md)] shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {tab.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {tab.label}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {tab.description}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0 ml-2" />
                </button>
              ))}

              {/* Log out footer item */}
              <button
                type="button"
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full p-3.5 rounded-[var(--radius-lg)] border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.03)] text-[var(--color-danger)] font-medium cursor-pointer active:bg-[rgba(239,68,68,0.06)] active:scale-[0.99] mt-2 transition-all"
                style={{
                  fontSize: "var(--text-sm)",
                }}
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          ) : (
            /* Active category detailed view page */
            <div className="animate-fadeInScale" style={{ animationDuration: "200ms" }}>
              {/* Back navigation */}
              <button
                onClick={() => setShowMobileDetail(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.06)] bg-transparent text-[var(--text-secondary)] text-xs font-medium cursor-pointer hover:bg-[rgba(255,255,255,0.03)] active:scale-[0.98] transition-all mb-5"
              >
                <ChevronLeft size={14} /> Back to Settings
              </button>

              {/* Header */}
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-[var(--color-accent)]">{activeTabConfig.icon}</span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{activeTabConfig.label}</h2>
              </div>

              {/* Detail container */}
              <div
                className="rounded-[var(--radius-lg)] p-4 sm:p-5"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <ActiveSection />
              </div>
            </div>
          )}
        </div>

        {/* Desktop Viewports: Standard side-by-side sidebar + configuration card */}
        <div className="hidden lg:flex gap-6 items-start">
          {/* Sidebar */}
          <nav
            className="flex flex-col gap-1.5 shrink-0"
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

            {/* Logout button separator */}
            <div
              className="mt-4 pt-4"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <button
                id="settings-sidebar-logout"
                type="button"
                onClick={logout}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-[var(--radius-lg)] transition-all duration-150 cursor-pointer text-left font-medium hover:bg-[rgba(239,68,68,0.06)]"
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

          {/* Configuration Panel */}
          <div className="flex-1 min-w-0">
            {/* Panel Title & description header */}
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

            {/* Panel details container */}
            <div
              className="rounded-[var(--radius-lg)] p-6"
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
