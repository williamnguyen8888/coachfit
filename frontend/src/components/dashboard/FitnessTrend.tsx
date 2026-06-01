"use client";
// src/components/dashboard/FitnessTrend.tsx
// CTL/ATL/TSB area chart + current values + ACWR.
// Compact on mobile (metrics row + status); desktop shows full chart.

import React from "react";
import { clsx } from "clsx";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FitnessTrendResponse, FitnessTrend } from "@/lib/types/dashboard";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function tsbColor(tsb: number): string {
  if (tsb > 5) return "var(--color-success)";
  if (tsb >= -5) return "var(--color-warning)";
  return "var(--color-danger)";
}

function tsbLabel(tsb: number): string {
  if (tsb > 10) return "Fresh";
  if (tsb > 5) return "Ready";
  if (tsb >= -5) return "Optimal";
  if (tsb >= -20) return "Fatigued";
  return "Overtrained";
}

function TrendIcon({ trend }: { trend: FitnessTrend }) {
  const iconProps = { size: 14, strokeWidth: 2.5 };
  if (trend === "improving" || trend === "building")
    return <TrendingUp {...iconProps} style={{ color: "var(--color-success)" }} />;
  if (trend === "declining")
    return <TrendingDown {...iconProps} style={{ color: "var(--color-danger)" }} />;
  return <Minus {...iconProps} style={{ color: "var(--text-muted)" }} />;
}

function calculateAcwr(atl: number, ctl: number): number {
  if (!ctl || ctl <= 0) return 0;
  return Number((atl / ctl).toFixed(2));
}

function acwrLabel(acwr: number): { label: string; color: string } {
  if (acwr === 0) return { label: "N/A", color: "var(--text-muted)" };
  if (acwr < 0.8) return { label: "Under-training", color: "var(--color-info)" };
  if (acwr <= 1.3) return { label: "Sweet Spot", color: "var(--color-success)" };
  if (acwr <= 1.5) return { label: "Overreaching", color: "var(--color-warning)" };
  return { label: "Danger Zone", color: "var(--color-danger)" };
}

/* ─── Stat badge ─────────────────────────────────────────────────────── */

function StatBadge({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number;
  color: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1 py-1">
      <div className="flex items-center gap-1">
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: color, flexShrink: 0 }}
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <span
        className="font-metric tabular-nums font-extrabold"
        style={{ fontSize: "var(--text-xl)", color }}
      >
        {Math.round(value)}
      </span>
      {sub && (
        <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ─── Custom tooltip ─────────────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const tooltipData = [
    { key: "CTL", label: "CTL (Fitness)", color: "var(--color-fitness)" },
    { key: "ATL", label: "ATL (Fatigue)", color: "var(--color-fatigue)" },
    { key: "TSB", label: "TSB (Form)", color: "var(--color-form)" },
  ];
  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 flex flex-col gap-1 border border-[var(--border-default)]"
      style={{
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-md)",
        minWidth: 130,
      }}
    >
      <p style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
        {label}
      </p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: tooltipData[i]?.color ?? p.color }}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {tooltipData[i]?.label ?? p.name}
            </span>
          </div>
          <span
            className="font-metric tabular-nums font-semibold"
            style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}
          >
            {Math.round(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Loading skeleton ──────────────────────────────────────────────── */

export function FitnessTrendSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card"
    >
      <Skeleton width="130px" height="22px" />
      <div className="flex justify-around border border-[var(--border-subtle)] rounded-[var(--radius-md)] py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <Skeleton width="40px" height="24px" />
            <Skeleton width="30px" height="10px" />
          </div>
        ))}
      </div>
      <Skeleton height="140px" className="rounded-[var(--radius-md)]" />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────── */

interface Props {
  data: FitnessTrendResponse;
  trend?: FitnessTrend;
  className?: string;
}

export function FitnessTrend({ data, trend = "stable", className }: Props) {
  const chartData = (data.points ?? []).map((p) => {
    const d = new Date(p.date);
    return {
      date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      CTL: Math.round(p.ctl * 10) / 10,
      ATL: Math.round(p.atl * 10) / 10,
      TSB: Math.round(p.tsb * 10) / 10,
    };
  });

  const tickIndices = chartData
    .map((_, i) => i)
    .filter((i) => i % 10 === 0 || i === chartData.length - 1);
  const ticks = tickIndices.map((i) => chartData[i]?.date).filter(Boolean);

  const lastPoint = chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const tsb = lastPoint?.TSB ?? 0;
  const currentCtl = lastPoint?.CTL ?? 0;
  const currentAtl = lastPoint?.ATL ?? 0;
  const formColor = tsbColor(tsb);

  const acwr = calculateAcwr(currentAtl, currentCtl);
  const acwrInfo = acwrLabel(acwr);

  return (
    <div
      className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="font-bold tracking-tight"
          style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
        >
          Fitness Trend
        </h2>
        <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-0.5 border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <TrendIcon trend={trend} />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {trend} trend
          </span>
        </div>
      </div>

      {/* Current values row */}
      <div
        className="flex rounded-[var(--radius-md)] py-2.5 border border-[var(--border-subtle)] items-center"
        style={{ background: "rgba(0,0,0,0.1)" }}
      >
        <StatBadge
          label="Fitness"
          value={currentCtl}
          color="var(--color-fitness)"
          sub="CTL"
        />
        <div style={{ width: 1, background: "var(--border-subtle)", height: 28, flexShrink: 0 }} />
        <StatBadge
          label="Fatigue"
          value={currentAtl}
          color="var(--color-fatigue)"
          sub="ATL"
        />
        <div style={{ width: 1, background: "var(--border-subtle)", height: 28, flexShrink: 0 }} />
        <div className="flex flex-col items-center gap-0.5 flex-1 py-1">
          <div className="flex items-center gap-1">
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: formColor, flexShrink: 0 }}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
              Form
            </span>
          </div>
          <span
            className="font-metric tabular-nums font-extrabold"
            style={{ fontSize: "var(--text-xl)", color: formColor }}
          >
            {tsb > 0 ? "+" : ""}
            {Math.round(tsb)}
          </span>
          <span
            style={{
              fontSize: "9px",
              color: formColor,
              fontWeight: 600,
            }}
          >
            {tsbLabel(tsb)}
          </span>
        </div>

        {acwr > 0 && (
          <>
            <div style={{ width: 1, background: "var(--border-subtle)", height: 28, flexShrink: 0 }} />
            <div className="flex flex-col items-center gap-0.5 flex-1 py-1">
              <div className="flex items-center gap-1">
                <span
                  className="inline-block rounded-full"
                  style={{ width: 6, height: 6, background: acwrInfo.color, flexShrink: 0 }}
                />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
                  ACWR
                </span>
              </div>
              <span
                className="font-metric tabular-nums font-extrabold"
                style={{ fontSize: "var(--text-xl)", color: acwrInfo.color }}
              >
                {acwr}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                Workload
              </span>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <div style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 5, bottom: 0, left: -25 }}
            >
              <defs>
                <linearGradient id="ctlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fitness)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-fitness)" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="atlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fatigue)" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="var(--color-fatigue)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border-subtle)"
                strokeDasharray="2 4"
              />
              <XAxis
                dataKey="date"
                ticks={ticks}
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="CTL"
                stroke="var(--color-fitness)"
                strokeWidth={2}
                fill="url(#ctlGrad)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 1.5, fill: "var(--color-fitness)" }}
              />
              <Area
                type="monotone"
                dataKey="ATL"
                stroke="var(--color-fatigue)"
                strokeWidth={1.5}
                fill="url(#atlGrad)"
                dot={false}
                strokeDasharray="4 2"
                activeDot={{ r: 4, strokeWidth: 1.5, fill: "var(--color-fatigue)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
          style={{
            height: 120,
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
          }}
        >
          Insufficient logs to compute fitness curves. Keep training!
        </div>
      )}

      {/* Legend & Details */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-[var(--border-subtle)] pt-3">
        <div className="flex items-center gap-4">
          {[
            { label: "CTL (Fitness)", color: "var(--color-fitness)", dash: false },
            { label: "ATL (Fatigue)", color: "var(--color-fatigue)", dash: true },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="14" height="6" viewBox="0 0 14 6" className="overflow-visible">
                {l.dash ? (
                  <line
                    x1="0" y1="3" x2="14" y2="3"
                    stroke={l.color}
                    strokeWidth="2.5"
                    strokeDasharray="3 2"
                  />
                ) : (
                  <line x1="0" y1="3" x2="14" y2="3" stroke={l.color} strokeWidth="2.5" />
                )}
              </svg>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
                {l.label}
              </span>
            </div>
          ))}
        </div>
        {acwr > 0 && (
          <span className="text-[10px] text-muted font-medium flex items-center gap-1">
            Status: <span style={{ color: acwrInfo.color, fontWeight: 700 }}>{acwrInfo.label}</span>
          </span>
        )}
      </div>
    </div>
  );
}
