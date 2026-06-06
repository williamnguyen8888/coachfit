"use client";
// src/components/charts/PMCChart.tsx
// Performance Management Chart — CTL (fitness), ATL (fatigue), TSB (form).
// Full-width composed chart with area fills for CTL/ATL and a TSB line.
// Includes: date range selector, stats bar, legend, custom tooltip, skeleton.

import React, { useMemo } from "react";
import { clsx } from "clsx";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PmcResponse } from "@/lib/types/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DateRange = "30d" | "90d" | "6m" | "1y";

interface Props {
  data: PmcResponse;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tsbColor(tsb: number): string {
  if (tsb > 5) return "var(--color-success)";
  if (tsb >= -5) return "var(--color-warning)";
  return "var(--color-danger)";
}

function tsbLabel(tsb: number): string {
  if (tsb > 20) return "Very Fresh";
  if (tsb > 5) return "Fresh";
  if (tsb >= -5) return "Optimal";
  if (tsb >= -20) return "Fatigued";
  return "Overtrained";
}

function acwrInfo(atl: number, ctl: number): { value: number; label: string; color: string } {
  if (!ctl || ctl <= 0) return { value: 0, label: "N/A", color: "var(--text-muted)" };
  const acwr = Number((atl / ctl).toFixed(2));
  let label = "Sweet Spot";
  let color = "var(--color-success)";
  if (acwr < 0.8) { label = "Under-training"; color = "var(--color-info)"; }
  else if (acwr <= 1.3) { label = "Sweet Spot"; color = "var(--color-success)"; }
  else if (acwr <= 1.5) { label = "Overreaching"; color = "var(--color-warning)"; }
  else { label = "Danger Zone"; color = "var(--color-danger)"; }
  return { value: acwr, label, color };
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

// ─── Date Range Selector ─────────────────────────────────────────────────────

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "30d", value: "30d" },
  { label: "90d", value: "90d" },
  { label: "6M", value: "6m" },
  { label: "1Y", value: "1y" },
];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  return (
    <div
      className="flex items-center rounded-[var(--radius-sm)] overflow-hidden"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {DATE_RANGES.map((r) => (
        <button
          key={r.value}
          id={`pmc-range-${r.value}`}
          onClick={() => onChange(r.value)}
          className="tabular-nums"
          style={{
            padding: "4px 10px",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            background: value === r.value ? "var(--color-accent)" : "transparent",
            color: value === r.value ? "#fff" : "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            transition: "background 150ms ease-out, color 150ms ease-out",
          }}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center flex-1 gap-0.5 py-2">
      <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
      <span
        className="font-metric tabular-nums"
        style={{ fontSize: "var(--text-xl)", fontWeight: 700, color }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function PmcTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const rows = [
    { key: "CTL", label: "CTL (Fitness)", color: "var(--color-fitness)" },
    { key: "ATL", label: "ATL (Fatigue)", color: "var(--color-fatigue)" },
    { key: "TSB", label: "TSB (Form)", color: "var(--color-form)" },
    { key: "TSS", label: "Day TSS", color: "var(--text-secondary)" },
  ];

  const map = Object.fromEntries(payload.map((p) => [p.name, p.value]));

  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2.5 flex flex-col gap-1.5"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-md)",
        minWidth: 150,
      }}
    >
      <p style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </p>
      {rows.map((r) =>
        map[r.key] !== undefined ? (
          <div key={r.key} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                style={{ width: 6, height: 6, borderRadius: "50%", background: r.color, display: "inline-block", flexShrink: 0 }}
              />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{r.label}</span>
            </div>
            <span
              className="font-metric tabular-nums font-semibold"
              style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}
            >
              {r.key === "TSB" && map[r.key] > 0 ? "+" : ""}
              {Math.round(map[r.key])}
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PMCChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card", className)}>
      <div className="flex items-center justify-between">
        <Skeleton width="180px" height="22px" />
        <Skeleton width="120px" height="28px" />
      </div>
      <div className="flex rounded-[var(--radius-md)] border border-[var(--border-subtle)] py-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 py-1">
            <Skeleton width="40px" height="10px" />
            <Skeleton width="32px" height="22px" />
          </div>
        ))}
      </div>
      <Skeleton height="220px" className="rounded-[var(--radius-md)]" />
      <div className="flex items-center gap-4">
        <Skeleton width="80px" height="10px" />
        <Skeleton width="80px" height="10px" />
        <Skeleton width="80px" height="10px" />
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[var(--radius-md)] gap-3"
      style={{ height: 220, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
    >
      <Activity size={32} style={{ color: "var(--text-muted)" }} />
      <div className="text-center">
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
          Not enough data yet
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
          Keep training — your PMC will appear after a few sessions.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PMCChart({ data, className }: Props) {
  const chartData = useMemo(
    () =>
      (data.points ?? []).map((p) => ({
        date: formatDateLabel(p.date),
        rawDate: p.date,
        CTL: Math.round(p.ctl * 10) / 10,
        ATL: Math.round(p.atl * 10) / 10,
        TSB: Math.round(p.tsb * 10) / 10,
        TSS: Math.round(p.tss),
      })),
    [data.points]
  );

  // Tick marks: every ~10 points or so, never more than ~8 ticks
  const step = Math.max(1, Math.floor(chartData.length / 7));
  const ticks = chartData
    .filter((_, i) => i % step === 0 || i === chartData.length - 1)
    .map((d) => d.date);

  const last = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const ctl = last?.CTL ?? 0;
  const atl = last?.ATL ?? 0;
  const tsb = last?.TSB ?? 0;
  const formColor = tsbColor(tsb);
  const acwr = acwrInfo(atl, ctl);

  // Determine Y-axis domain (include negative TSB)
  const allValues = chartData.flatMap((d) => [d.CTL, d.ATL, d.TSB]);
  const yMin = Math.min(0, ...allValues);
  const yMax = Math.max(10, ...allValues);
  const yPadded = [Math.floor(yMin - 5), Math.ceil(yMax + 5)];

  // Trend icon
  const trendDelta = chartData.length >= 7
    ? (last?.CTL ?? 0) - (chartData[chartData.length - 7]?.CTL ?? 0)
    : 0;
  const TrendIcon = trendDelta > 1
    ? <TrendingUp size={14} strokeWidth={2.5} style={{ color: "var(--color-success)" }} />
    : trendDelta < -1
    ? <TrendingDown size={14} strokeWidth={2.5} style={{ color: "var(--color-danger)" }} />
    : <Minus size={14} strokeWidth={2.5} style={{ color: "var(--text-muted)" }} />;

  return (
    <div className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2
            className="font-bold tracking-tight"
            style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
          >
            Performance Management Chart
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
            CTL · ATL · TSB over time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-[var(--radius-sm)] px-2.5 py-1 border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
            {TrendIcon}
            <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {trendDelta > 1 ? "Building" : trendDelta < -1 ? "Declining" : "Stable"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        className="flex rounded-[var(--radius-md)] border border-[var(--border-subtle)] items-stretch"
        style={{ background: "rgba(0,0,0,0.08)" }}
      >
        <StatPill label="Fitness" value={String(Math.round(ctl))} sub="CTL" color="var(--color-fitness)" />
        <div style={{ width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
        <StatPill label="Fatigue" value={String(Math.round(atl))} sub="ATL" color="var(--color-fatigue)" />
        <div style={{ width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
        <div className="flex flex-col items-center flex-1 gap-0.5 py-2">
          <div className="flex items-center gap-1">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: formColor, flexShrink: 0, display: "inline-block" }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Form</span>
          </div>
          <span
            className="font-metric tabular-nums font-extrabold"
            style={{ fontSize: "var(--text-xl)", color: formColor }}
          >
            {tsb > 0 ? "+" : ""}{Math.round(tsb)}
          </span>
          <span style={{ fontSize: "9px", color: formColor, fontWeight: 600 }}>{tsbLabel(tsb)}</span>
        </div>
        {acwr.value > 0 && (
          <>
            <div style={{ width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
            <div className="flex flex-col items-center flex-1 gap-0.5 py-2">
              <div className="flex items-center gap-1">
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: acwr.color, flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>ACWR</span>
              </div>
              <span className="font-metric tabular-nums font-extrabold" style={{ fontSize: "var(--text-xl)", color: acwr.color }}>
                {acwr.value}
              </span>
              <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600 }}>{acwr.label}</span>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="pmcCtlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fitness)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-fitness)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="pmcAtlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fatigue)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-fatigue)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border-subtle)"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="date"
                ticks={ticks}
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={yPadded}
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<PmcTooltip />} />
              <ReferenceLine
                y={0}
                stroke="var(--border-default)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
              <Area
                type="monotone"
                dataKey="CTL"
                stroke="var(--color-fitness)"
                strokeWidth={2.5}
                fill="url(#pmcCtlGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-fitness)" }}
              />
              <Area
                type="monotone"
                dataKey="ATL"
                stroke="var(--color-fatigue)"
                strokeWidth={1.5}
                fill="url(#pmcAtlGrad)"
                dot={false}
                strokeDasharray="5 2"
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-fatigue)" }}
              />
              <Line
                type="monotone"
                dataKey="TSB"
                stroke="var(--color-form)"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-form)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-[var(--border-subtle)] pt-3">
        <div className="flex flex-wrap items-center gap-4">
          {[
            { label: "CTL (Fitness)", color: "var(--color-fitness)", dash: false },
            { label: "ATL (Fatigue)", color: "var(--color-fatigue)", dash: true },
            { label: "TSB (Form)", color: "var(--color-form)", dash: false },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="14" height="6" viewBox="0 0 14 6" className="overflow-visible">
                <line
                  x1="0" y1="3" x2="14" y2="3"
                  stroke={l.color}
                  strokeWidth="2.5"
                  strokeDasharray={l.dash ? "3 2" : undefined}
                />
              </svg>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
          TSB zero line = baseline
        </span>
      </div>
    </div>
  );
}
