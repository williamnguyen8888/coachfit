"use client";
// src/components/analytics/AnalyticsClient.tsx
// Client-side orchestrator for the /analytics page.
// Manages tab state, date range, sport filter, and data fetching
// for the three Phase 2 analytics charts: PMC, Power Curve, Zone Distribution.

import React, { useState, useMemo, useCallback } from "react";
import { Activity, Zap, BarChart3 } from "lucide-react";
import { useQuery } from "@/hooks/useQuery";
import { toLocalDateString } from "@/lib/utils";
import {
  PMCChart,
  PMCChartSkeleton,
  DateRangePicker,
  PowerCurveChart,
  PowerCurveChartSkeleton,
  ZoneDistributionChart,
  ZoneDistributionChartSkeleton,
} from "@/components/charts";
import type { DateRange } from "@/components/charts";
import type { PowerCurveDays } from "@/components/charts";
import type { PmcResponse, PowerCurveResponse, ZoneDistributionResponse } from "@/lib/types/analytics";

// ─── Date Range Helpers ────────────────────────────────────────────────────────

function getRangeDates(range: DateRange): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case "30d": from.setDate(from.getDate() - 30); break;
    case "90d": from.setDate(from.getDate() - 90); break;
    case "6m":  from.setMonth(from.getMonth() - 6); break;
    case "1y":  from.setFullYear(from.getFullYear() - 1); break;
  }
  return { from: toLocalDateString(from), to: toLocalDateString(to) };
}

// ─── Tab Types ─────────────────────────────────────────────────────────────────

type Tab = "pmc" | "power-curve" | "zones";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "pmc",         label: "PMC",         icon: <Activity size={14} /> },
  { id: "power-curve", label: "Power Curve", icon: <Zap size={14} /> },
  { id: "zones",       label: "Zone Dist.",  icon: <BarChart3 size={14} /> },
];

// ─── Error Banner ─────────────────────────────────────────────────────────────

function SectionError({ message }: { message: string }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: "3px solid var(--color-danger)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
      }}
    >
      <span style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}>
        {message}
      </span>
    </div>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            id={`analytics-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              fontSize: "var(--text-sm)",
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--text-primary)" : "var(--text-muted)",
              background: "none",
              border: "none",
              borderBottom: isActive
                ? "2px solid var(--color-accent)"
                : "2px solid transparent",
              cursor: "pointer",
              transition: "color 150ms ease-out, border-color 150ms ease-out",
              marginBottom: -1,
              whiteSpace: "nowrap",
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

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnalyticsClient() {
  const [activeTab, setActiveTab] = useState<Tab>("pmc");
  const [dateRange, setDateRange] = useState<DateRange>("90d");
  const [powerDays, setPowerDays] = useState<PowerCurveDays>(90);
  const [zoneSport, setZoneSport] = useState("all");

  // Compute date strings from selected range
  const { from, to } = useMemo(() => getRangeDates(dateRange), [dateRange]);
  const { from: zoneFrom, to: zoneTo } = useMemo(() => getRangeDates(dateRange), [dateRange]);

  // Build query paths — null when not on that tab (avoids unnecessary fetches)
  const pmcPath = `/training-load/pmc?from=${from}&to=${to}`;
  const powerPath = `/training-load/power-curve?days=${powerDays}`;
  const zonesPath = useMemo(() => {
    const params = new URLSearchParams({ from: zoneFrom, to: zoneTo });
    if (zoneSport !== "all") params.set("sport", zoneSport);
    return `/training-load/zones?${params.toString()}`;
  }, [zoneFrom, zoneTo, zoneSport]);

  const pmcQuery    = useQuery<PmcResponse>(activeTab === "pmc" ? pmcPath : null);
  const powerQuery  = useQuery<PowerCurveResponse>(activeTab === "power-curve" ? powerPath : null);
  const zonesQuery  = useQuery<ZoneDistributionResponse>(activeTab === "zones" ? zonesPath : null);

  const handleSportChange = useCallback((s: string) => setZoneSport(s), []);

  const showDatePicker = activeTab === "pmc" || activeTab === "zones";

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ paddingBottom: "calc(var(--tab-bar-height, 64px) + env(safe-area-inset-bottom, 0px))" }}
    >
      <div
        style={{
          maxWidth: 960,
          width: "100%",
          margin: "0 auto",
          padding: "0 12px 24px",
        }}
      >
        {/* Tab navigation */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Date range picker — stacks below tab bar on mobile */}
        {showDatePicker && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "12px 0 4px",
            }}
          >
            <DateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
        )}

        {/* Content area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: showDatePicker ? 4 : 16 }}>

          {/* ─── PMC Tab ──────────────────────────────────────────────────── */}
          {activeTab === "pmc" && (
            <>
              {pmcQuery.loading ? (
                <PMCChartSkeleton />
              ) : pmcQuery.error ? (
                <SectionError message="Could not load PMC data. Make sure you have a Pro subscription." />
              ) : pmcQuery.data ? (
                <PMCChart data={pmcQuery.data} />
              ) : null}

              {/* PMC Legend — flat text grid, no nested cards */}
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Understanding the PMC
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px 24px",
                  }}
                >
                  {[
                    { label: "CTL — Fitness",  color: "var(--color-fitness)", desc: "42-day weighted average of daily TSS. Represents your long-term aerobic fitness." },
                    { label: "ATL — Fatigue",  color: "var(--color-fatigue)", desc: "7-day weighted average of daily TSS. Reflects how fatigued you are right now." },
                    { label: "TSB — Form",     color: "var(--color-form)",    desc: "CTL minus ATL. Positive = fresh & ready to perform. Negative = fatigued." },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: item.color,
                          flexShrink: 0,
                          marginTop: 4,
                          display: "block",
                        }}
                      />
                      <div>
                        <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--text-primary)", display: "block" }}>
                          {item.label}
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── Power Curve Tab ────────────────────────────────────────────── */}
          {activeTab === "power-curve" && (
            <>
              {powerQuery.loading ? (
                <PowerCurveChartSkeleton />
              ) : powerQuery.error ? (
                <SectionError message="Could not load power curve. Make sure you have cycling activities with power meter data." />
              ) : powerQuery.data ? (
                <PowerCurveChart
                  data={powerQuery.data}
                  days={powerDays}
                  onDaysChange={setPowerDays}
                />
              ) : null}

              {/* Key benchmarks — inline list, no bg boxes */}
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Key Power Benchmarks
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "8px 0",
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  {[
                    { label: "5s",  title: "Neuromuscular",  desc: "Sprint / peak power" },
                    { label: "1m",  title: "Anaerobic",      desc: "Short burst capacity" },
                    { label: "5m",  title: "VO₂max",         desc: "Max aerobic output" },
                    { label: "20m", title: "FTP Proxy",      desc: "95% ≈ FTP estimate" },
                  ].map((b, i) => (
                    <div
                      key={b.label}
                      style={{
                        padding: "12px 16px 12px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                        borderRight: i < 3 ? "1px solid var(--border-subtle)" : "none",
                        paddingRight: i < 3 ? 16 : 0,
                        paddingLeft: i > 0 ? 16 : 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--text-lg)",
                          fontWeight: 700,
                          color: "var(--color-accent)",
                          fontFamily: "var(--font-mono)",
                          display: "block",
                          lineHeight: 1.1,
                        }}
                      >
                        {b.label}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-primary)", display: "block", marginTop: 2 }}>
                        {b.title}
                      </span>
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
                        {b.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─── Zone Distribution Tab ──────────────────────────────────────── */}
          {activeTab === "zones" && (
            <>
              {zonesQuery.loading ? (
                <ZoneDistributionChartSkeleton />
              ) : zonesQuery.error ? (
                <SectionError message="Could not load zone data. Sync activities with HR or power data to see your distribution." />
              ) : zonesQuery.data ? (
                <ZoneDistributionChart
                  data={zonesQuery.data}
                  sport={zoneSport}
                  onSportChange={handleSportChange}
                />
              ) : null}

              {/* Zone guide — clean table-style list */}
              <div>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Zone Guide
                </p>
                <div
                  style={{
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  {[
                    { zone: "Z1", name: "Recovery",  color: "var(--zone-1)", pct: "~20%", note: "Easy spinning, active recovery days" },
                    { zone: "Z2", name: "Endurance", color: "var(--zone-2)", pct: "~50%", note: "Base building — the majority of your volume" },
                    { zone: "Z3", name: "Tempo",     color: "var(--zone-3)", pct: "~10%", note: "Comfortably hard, sustainable 30–60 min" },
                    { zone: "Z4", name: "Threshold", color: "var(--zone-4)", pct: "~10%", note: "Race-pace effort, builds lactate tolerance" },
                    { zone: "Z5", name: "VO₂max",   color: "var(--zone-5)", pct: "~5%",  note: "Very hard intervals, max aerobic benefit" },
                  ].map((z) => (
                    <div
                      key={z.zone}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <span
                        style={{
                          width: 3,
                          height: 32,
                          borderRadius: 2,
                          background: z.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          width: 20,
                          flexShrink: 0,
                        }}
                      >
                        {z.zone}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                          {z.name}
                        </span>
                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 8 }}>
                          {z.note}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                          flexShrink: 0,
                        }}
                      >
                        {z.pct}
                      </span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5 }}>
                  Target distribution follows the polarized training model (80/20 rule). Your optimal split depends on training phase and coach plan.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
