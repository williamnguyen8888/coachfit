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
      className="rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--color-danger)",
        borderLeftWidth: 3,
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
      className="flex items-center rounded-[var(--radius-md)] p-1 gap-0.5"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`analytics-tab-${tab.id}`}
          onClick={() => onChange(tab.id)}
          className="flex items-center gap-2 flex-1 justify-center rounded-[var(--radius-sm)]"
          style={{
            padding: "8px 12px",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            background: active === tab.id ? "var(--bg-elevated)" : "transparent",
            color: active === tab.id ? "var(--color-accent)" : "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            transition: "background 150ms ease-out, color 150ms ease-out",
            boxShadow: active === tab.id ? "var(--shadow-sm)" : "none",
          }}
        >
          {tab.icon}
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Pro Upsell Banner ────────────────────────────────────────────────────────

function ProBanner() {
  return (
    <div
      className="rounded-[var(--radius-md)] px-5 py-4 flex items-center justify-between gap-4"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(59,130,246,0.08) 100%)",
        border: "1px solid var(--color-accent)",
      }}
    >
      <div>
        <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
          Pro Analytics
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginTop: 2 }}>
          PMC, Power Curve, and Zone Distribution require a Pro subscription.
        </p>
      </div>
      <button
        style={{
          padding: "8px 16px",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--text-sm)",
          fontWeight: 700,
          background: "var(--color-accent)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Upgrade
      </button>
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

  return (
    <div className="mx-auto w-full max-w-[960px] px-3 sm:px-4 lg:px-6 py-4 lg:py-5 flex flex-col gap-5">

      {/* Pro banner — show in a real app when tier !== pro */}
      {/* <ProBanner /> */}

      {/* Tab navigation + date range (for PMC & Zones tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <TabBar active={activeTab} onChange={setActiveTab} />
        {(activeTab === "pmc" || activeTab === "zones") && (
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        )}
      </div>

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

          {/* Explanatory card */}
          <div
            className="rounded-[var(--radius-md)] p-4 flex flex-col gap-2"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)" }}>
              Understanding the PMC
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { label: "CTL (Fitness)", color: "var(--color-fitness)", desc: "Chronic Training Load — 42-day weighted average of daily TSS. Represents your long-term fitness." },
                { label: "ATL (Fatigue)", color: "var(--color-fatigue)", desc: "Acute Training Load — 7-day weighted average of daily TSS. Represents how tired you are right now." },
                { label: "TSB (Form)",    color: "var(--color-form)",    desc: "Training Stress Balance — CTL minus ATL. Positive = fresh & ready to perform. Negative = fatigued." },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0, display: "inline-block" }} />
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: item.color }}>{item.label}</span>
                  </div>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
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

          {/* Key zones explanation */}
          <div
            className="rounded-[var(--radius-md)] p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
              Key Power Benchmarks
            </h3>
            <div className="grid sm:grid-cols-4 gap-2">
              {[
                { label: "5s",  title: "Neuromuscular",  desc: "Sprint / peak power" },
                { label: "1m",  title: "Anaerobic",      desc: "Short burst capacity" },
                { label: "5m",  title: "VO2max",         desc: "Max aerobic output" },
                { label: "20m", title: "FTP Proxy",      desc: "95% ≈ FTP estimate" },
              ].map((b) => (
                <div
                  key={b.label}
                  className="flex flex-col rounded-[var(--radius-sm)] p-2.5"
                  style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
                >
                  <span style={{ fontSize: "var(--text-lg)", fontWeight: 700, color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>
                    {b.label}
                  </span>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-primary)" }}>{b.title}</span>
                  <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{b.desc}</span>
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

          {/* Zone guide */}
          <div
            className="rounded-[var(--radius-md)] p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
              Zone Guide
            </h3>
            <div className="flex flex-col gap-2">
              {[
                { zone: "Z1", name: "Recovery",      color: "var(--zone-1)", pct: "~20%",  note: "Easy spinning, active recovery days" },
                { zone: "Z2", name: "Endurance",     color: "var(--zone-2)", pct: "~50%",  note: "Base building — the majority of your volume" },
                { zone: "Z3", name: "Tempo",         color: "var(--zone-3)", pct: "~10%",  note: "Comfortably hard, sustainable for 30–60min" },
                { zone: "Z4", name: "Threshold",     color: "var(--zone-4)", pct: "~10%",  note: "Race-pace effort, builds lactate tolerance" },
                { zone: "Z5", name: "VO2max",        color: "var(--zone-5)", pct: "~5%",   note: "Very hard intervals, max aerobic benefit" },
              ].map((z) => (
                <div key={z.zone} className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center justify-center rounded-[var(--radius-sm)] font-bold tabular-nums shrink-0"
                    style={{ width: 28, height: 22, background: z.color, fontSize: "var(--text-xs)", color: "#000", opacity: 0.9 }}
                  >
                    {z.zone}
                  </span>
                  <div className="flex-1">
                    <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-primary)" }}>{z.name}</span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 6 }}>{z.note}</span>
                  </div>
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {z.pct}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: 10 }}>
              Target distribution is for a polarized training model (80/20 rule). Your optimal split depends on your training phase and coach plan.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
