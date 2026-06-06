"use client";

// src/components/coach/AthleteDetailPanel.tsx
// Right panel of the coach dashboard — athlete overview + tabbed content.

import { useState, useEffect, useCallback } from "react";
import { User, Dumbbell, ExternalLink, X } from "lucide-react";
import { athleteDataService } from "@/lib/services/coach";
import { useCoachStore, type AthleteDetailTab } from "@/stores/coach.store";
import type { AthleteDashboard } from "@/lib/types/coach";
import { getAthleteStatus } from "@/lib/types/coach";
import { AlertFeed } from "./AlertFeed";
import { AthleteCalendarTab } from "./tabs/AthleteCalendarTab";
import { AthleteActivitiesTab } from "./tabs/AthleteActivitiesTab";
import { AthletePmcTab } from "./tabs/AthletePmcTab";
import { AthleteHealthTab } from "./tabs/AthleteHealthTab";
import { AthleteNotesTab } from "./tabs/AthleteNotesTab";

const TABS: { id: AthleteDetailTab; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "activities", label: "Activities" },
  { id: "pmc", label: "PMC" },
  { id: "health", label: "Health" },
  { id: "notes", label: "Notes" },
];

const STATUS_CONFIG = {
  fresh: { label: "Fresh", color: "#22c55e" },
  optimal: { label: "Optimal", color: "#f59e0b" },
  fatigued: { label: "Fatigued", color: "#ef4444" },
  nodata: { label: "No data", color: "#5a5a6e" },
};

interface AthleteDetailPanelProps {
  athleteId: string;
  onClose?: () => void;
}

export function AthleteDetailPanel({ athleteId, onClose }: AthleteDetailPanelProps) {
  const { activeTab, setActiveTab, openAssignModal } = useCoachStore();
  const [dashboard, setDashboard] = useState<AthleteDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await athleteDataService.getDashboard(athleteId);
      setDashboard(data);
    } catch {
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  const athlete = dashboard?.athlete;
  const fitness = dashboard?.fitness;
  const status = getAthleteStatus(fitness?.tsb);
  const statusCfg = STATUS_CONFIG[status];

  const displayName = athlete?.nickname ?? athlete?.name ?? "Athlete";
  const initials = (athlete?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        overflow: "hidden",
      }}
    >
      {/* ── Athlete header ─────────────────────────────────────── */}
      <div
        style={{
          padding: "var(--space-5) var(--space-6)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          flexShrink: 0,
        }}
      >
        {loading ? (
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: "var(--radius-full)",
                background: "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)",
                backgroundSize: "400px 100%",
                animation: "skeleton-shimmer 1.6s ease-in-out infinite",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ height: 16, width: 140, borderRadius: 4, background: "var(--bg-elevated)", marginBottom: 8, animation: "skeleton-shimmer 1.6s ease-in-out infinite" }} />
              <div style={{ height: 12, width: 90, borderRadius: 4, background: "var(--bg-elevated)", animation: "skeleton-shimmer 1.6s ease-in-out infinite" }} />
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "var(--radius-full)",
                background: "var(--color-accent-20)",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "var(--text-base)",
                flexShrink: 0,
                border: "2px solid var(--color-accent-30)",
              }}
            >
              {initials}
            </div>

            {/* Name & fitness */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  style={{
                    fontSize: "var(--text-xl)",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {displayName}
                </h2>
                <span
                  style={{
                    width: 8, height: 8,
                    borderRadius: "50%",
                    background: statusCfg.color,
                    boxShadow: `0 0 6px ${statusCfg.color}88`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: statusCfg.color,
                    fontWeight: 600,
                  }}
                >
                  {statusCfg.label}
                </span>
              </div>

              {/* CTL / ATL / TSB */}
              {fitness && (
                <div className="flex items-center gap-4 mt-2">
                  {[
                    { label: "CTL", value: Math.round(fitness.ctl), color: "var(--color-fitness)" },
                    { label: "ATL", value: Math.round(fitness.atl), color: "var(--color-fatigue)" },
                    { label: "TSB", value: (fitness.tsb > 0 ? "+" : "") + Math.round(fitness.tsb), color: fitness.tsb > 0 ? "var(--color-form)" : "var(--color-fatigue)" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div
                        className="font-metric tabular-nums"
                        style={{ fontSize: "var(--text-lg)", fontWeight: 700, color }}
                      >
                        {value}
                      </div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        {label}
                      </div>
                    </div>
                  ))}

                  {/* Week compliance */}
                  {dashboard?.weekSummary && (
                    <div
                      style={{
                        marginLeft: "var(--space-2)",
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        Week:{" "}
                      </span>
                      <span
                        className="font-metric"
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: 700,
                          color:
                            dashboard.weekSummary.compliance >= 80
                              ? "var(--color-success)"
                              : "var(--color-warning)",
                        }}
                      >
                        {dashboard.weekSummary.compliance}%
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => openAssignModal([athleteId])}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  padding: "7px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "var(--color-accent)",
                  color: "white",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity var(--duration-micro)",
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <Dumbbell size={12} />
                <span>Assign Workout</span>
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  aria-label="Close athlete detail"
                  style={{
                    width: 32, height: 32,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    transition: "all var(--duration-micro)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-elevated)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Alerts (if any) ────────────────────────────────────── */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
            flexShrink: 0,
          }}
        >
          <AlertFeed
            alerts={dashboard.alerts}
            athleteName={athlete?.name}
          />
        </div>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
          padding: "0 var(--space-6)",
          flexShrink: 0,
          overflowX: "auto",
        }}
        className="scrollbar-none"
      >
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`athlete-tab-${id}`}
              onClick={() => setActiveTab(id)}
              style={{
                padding: "12px 16px",
                border: "none",
                borderBottom: isActive
                  ? "2px solid var(--color-accent)"
                  : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--color-accent)" : "var(--text-muted)",
                fontSize: "var(--text-sm)",
                fontWeight: isActive ? 600 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all var(--duration-micro)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ─────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-5) var(--space-6)",
        }}
      >
        {activeTab === "calendar" && <AthleteCalendarTab athleteId={athleteId} />}
        {activeTab === "activities" && <AthleteActivitiesTab athleteId={athleteId} />}
        {activeTab === "pmc" && <AthletePmcTab athleteId={athleteId} />}
        {activeTab === "health" && <AthleteHealthTab athleteId={athleteId} />}
        {activeTab === "notes" && (
          <AthleteNotesTab athleteId={athleteId} />
        )}
      </div>
    </div>
  );
}
