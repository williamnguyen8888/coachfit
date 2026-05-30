"use client";
// src/components/dashboard/FitnessTrend.tsx
// CTL/ATL/TSB sparkline + current values.
// Compact on mobile (sparkline only); desktop shows full chart.

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
  const iconProps = { size: 14, strokeWidth: 2 };
  if (trend === "improving" || trend === "building")
    return <TrendingUp {...iconProps} style={{ color: "var(--color-success)" }} />;
  if (trend === "declining")
    return <TrendingDown {...iconProps} style={{ color: "var(--color-danger)" }} />;
  return <Minus {...iconProps} style={{ color: "var(--text-muted)" }} />;
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
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <div className="flex items-center gap-1">
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: color, flexShrink: 0 }}
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <span
        className="font-metric tabular-nums font-bold"
        style={{ fontSize: "var(--text-2xl)", color }}
      >
        {Math.round(value)}
      </span>
      {sub && (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
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
    { key: "CTL", color: "var(--color-fitness)" },
    { key: "ATL", color: "var(--color-fatigue)" },
    { key: "TSB", color: "var(--color-form)" },
  ];
  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 flex flex-col gap-1"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-md)",
        minWidth: 120,
      }}
    >
      <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginBottom: 4 }}>
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
              {p.name}
            </span>
          </div>
          <span
            className="font-metric tabular-nums"
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
      className="rounded-[var(--radius-xl)] p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      <Skeleton width="130px" height="20px" />
      <div className="flex justify-around">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton width="50px" height="28px" />
            <Skeleton width="30px" height="12px" />
          </div>
        ))}
      </div>
      <Skeleton height="140px" />
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
  // Format date labels to abbreviated form
  const chartData = data.points.map((p) => {
    const d = new Date(p.date);
    return {
      date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      CTL: Math.round(p.ctl * 10) / 10,
      ATL: Math.round(p.atl * 10) / 10,
      TSB: Math.round(p.tsb * 10) / 10,
    };
  });

  // Sample ticks for X axis — every 7 days
  const tickIndices = chartData
    .map((_, i) => i)
    .filter((i) => i % 7 === 0 || i === chartData.length - 1);
  const ticks = tickIndices.map((i) => chartData[i]?.date).filter(Boolean);

  const tsb = data.currentTsb;
  const formColor = tsbColor(tsb);

  return (
    <div
      className={clsx("rounded-[var(--radius-xl)] p-5 flex flex-col gap-4", className)}
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="font-semibold"
          style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
        >
          Fitness Trend
        </h2>
        <div className="flex items-center gap-1.5">
          <TrendIcon trend={trend} />
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              textTransform: "capitalize",
            }}
          >
            {trend}
          </span>
        </div>
      </div>

      {/* Current values row */}
      <div
        className="flex rounded-[var(--radius-md)] py-3"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        <StatBadge
          label="Fitness"
          value={data.currentCtl}
          color="var(--color-fitness)"
          sub="CTL"
        />
        <div style={{ width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
        <StatBadge
          label="Fatigue"
          value={data.currentAtl}
          color="var(--color-fatigue)"
          sub="ATL"
        />
        <div style={{ width: 1, background: "var(--border-subtle)", flexShrink: 0 }} />
        <div className="flex flex-col items-center gap-0.5 flex-1">
          <div className="flex items-center gap-1">
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: formColor, flexShrink: 0 }}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Form
            </span>
          </div>
          <span
            className="font-metric tabular-nums font-bold"
            style={{ fontSize: "var(--text-2xl)", color: formColor }}
          >
            {tsb > 0 ? "+" : ""}
            {Math.round(tsb)}
          </span>
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: formColor,
              fontWeight: 500,
            }}
          >
            {tsbLabel(tsb)}
          </span>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 ? (
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 0, bottom: 0, left: -28 }}
            >
              <defs>
                <linearGradient id="ctlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fitness)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-fitness)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="atlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-fatigue)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-fatigue)" stopOpacity={0} />
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
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
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
                activeDot={{ r: 4, fill: "var(--color-fitness)" }}
              />
              <Area
                type="monotone"
                dataKey="ATL"
                stroke="var(--color-fatigue)"
                strokeWidth={1.5}
                fill="url(#atlGrad)"
                dot={false}
                strokeDasharray="4 2"
                activeDot={{ r: 4, fill: "var(--color-fatigue)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-[var(--radius-md)]"
          style={{
            height: 100,
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
          }}
        >
          Not enough data yet — keep logging workouts!
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4">
        {[
          { label: "CTL (Fitness)", color: "var(--color-fitness)", dash: false },
          { label: "ATL (Fatigue)", color: "var(--color-fatigue)", dash: true },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <svg width="16" height="8" viewBox="0 0 16 8">
              {l.dash ? (
                <line
                  x1="0" y1="4" x2="16" y2="4"
                  stroke={l.color}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              ) : (
                <line x1="0" y1="4" x2="16" y2="4" stroke={l.color} strokeWidth="2" />
              )}
            </svg>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
