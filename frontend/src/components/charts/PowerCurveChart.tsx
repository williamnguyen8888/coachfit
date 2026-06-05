"use client";
// src/components/charts/PowerCurveChart.tsx
// Mean Maximal Power (MMP) Curve — power vs duration on log-scale X axis.
// Shows an FTP reference line when available.

import React, { useMemo, useState } from "react";
import { clsx } from "clsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { Zap, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { PowerCurveResponse } from "@/lib/types/analytics";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PowerCurveDays = 30 | 90 | 365;

interface Props {
  data: PowerCurveResponse;
  days: PowerCurveDays;
  onDaysChange: (d: PowerCurveDays) => void;
  className?: string;
}

// ─── Duration Formatting ──────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s === 0 ? `${m}m` : `${m}m${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

// Convert seconds to a log-scale value for even visual spacing
function toLogX(seconds: number): number {
  return Math.log10(seconds);
}

// Fixed X-axis tick positions (log scale)
const TICK_DURATIONS = [5, 10, 30, 60, 300, 600, 1200, 3600];

// ─── Time Window Selector ────────────────────────────────────────────────────

const WINDOWS: { label: string; value: PowerCurveDays }[] = [
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1Y", value: 365 },
];

function TimeWindowPicker({
  value,
  onChange,
}: {
  value: PowerCurveDays;
  onChange: (d: PowerCurveDays) => void;
}) {
  return (
    <div
      className="flex items-center rounded-[var(--radius-sm)] overflow-hidden"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {WINDOWS.map((w) => (
        <button
          key={w.value}
          id={`pcurve-days-${w.value}`}
          onClick={() => onChange(w.value)}
          style={{
            padding: "4px 10px",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            background: value === w.value ? "var(--color-accent)" : "transparent",
            color: value === w.value ? "#fff" : "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            transition: "background 150ms ease-out, color 150ms ease-out",
          }}
        >
          {w.label}
        </button>
      ))}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function PowerTooltip({
  active,
  payload,
  ftp,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { duration: number; logX: number } }>;
  ftp: number | null;
}) {
  if (!active || !payload?.length) return null;
  const { duration } = payload[0].payload;
  const power = payload[0].value;
  const pctFtp = ftp && ftp > 0 ? Math.round((power / ftp) * 100) : null;

  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2.5 flex flex-col gap-1"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-md)",
        minWidth: 140,
      }}
    >
      <p style={{ fontSize: "10px", color: "var(--text-secondary)", fontWeight: 600, marginBottom: 2 }}>
        {formatDuration(duration)}
      </p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Power</span>
        </div>
        <span className="font-metric tabular-nums font-bold" style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
          {Math.round(power)}W
        </span>
      </div>
      {pctFtp !== null && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-warning)", display: "inline-block" }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>% FTP</span>
          </div>
          <span className="font-metric tabular-nums font-semibold" style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}>
            {pctFtp}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function PowerCurveChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card", className)}>
      <div className="flex items-center justify-between">
        <Skeleton width="160px" height="22px" />
        <Skeleton width="110px" height="28px" />
      </div>
      <Skeleton height="220px" className="rounded-[var(--radius-md)]" />
      <div className="flex items-center gap-4">
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
      <Zap size={32} style={{ color: "var(--text-muted)" }} />
      <div className="text-center">
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
          No power data available
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
          Upload cycling activities with a power meter to see your curve.
        </p>
      </div>
    </div>
  );
}

// ─── FTP Highlight ────────────────────────────────────────────────────────────

function FtpBadge({ ftp }: { ftp: number }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
    >
      <Zap size={13} style={{ color: "var(--color-warning)" }} />
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>
        FTP
      </span>
      <span className="font-metric tabular-nums font-bold" style={{ fontSize: "var(--text-sm)", color: "var(--color-warning)" }}>
        {ftp}W
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PowerCurveChart({ data, days, onDaysChange, className }: Props) {
  const [showInfo, setShowInfo] = useState(false);

  const chartData = useMemo(
    () =>
      (data.points ?? [])
        .filter((p) => p.power > 0 && p.duration > 0)
        .map((p) => ({
          duration: p.duration,
          logX: toLogX(p.duration),
          power: Math.round(p.power),
        })),
    [data.points]
  );

  const ftp = data.ftp ?? null;

  // Determine ticks that exist in our data range
  const durationRange = chartData.length > 0
    ? [chartData[0].duration, chartData[chartData.length - 1].duration]
    : [5, 3600];

  const visibleTicks = TICK_DURATIONS
    .filter((d) => d >= durationRange[0] && d <= durationRange[1])
    .map((d) => toLogX(d));

  const maxPower = chartData.length > 0 ? Math.max(...chartData.map((d) => d.power)) : 0;
  const yMax = Math.ceil((Math.max(maxPower, ftp ?? 0) + 50) / 50) * 50;

  // Find the 5s and 20min power for key metrics
  const p5s = chartData.find((d) => d.duration === 5);
  const p5m = chartData.find((d) => d.duration === 300);
  const p20m = chartData.find((d) => d.duration === 1200);
  const p60m = chartData.find((d) => d.duration === 3600);

  const keyMetrics = [
    { label: "5s (Peak)", value: p5s?.power },
    { label: "5m (VO2)", value: p5m?.power },
    { label: "20m (FTP est.)", value: p20m?.power ? Math.round(p20m.power * 0.95) : undefined },
    { label: "60m (Threshold)", value: p60m?.power },
  ].filter((m) => m.value !== undefined);

  return (
    <div className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h2
              className="font-bold tracking-tight"
              style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
            >
              Power Curve
            </h2>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
              Mean maximal power vs duration
            </p>
          </div>
          <button
            id="pcurve-info"
            onClick={() => setShowInfo((s) => !s)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--text-muted)", display: "flex" }}
          >
            <Info size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {ftp && <FtpBadge ftp={ftp} />}
          <TimeWindowPicker value={days} onChange={onDaysChange} />
        </div>
      </div>

      {/* Info tooltip */}
      {showInfo && (
        <div
          className="rounded-[var(--radius-sm)] px-3 py-2.5 text-sm"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.6 }}
        >
          The power curve shows your best average power for every duration in the selected window.
          The dashed line marks your FTP. X-axis is logarithmic for visual clarity.
        </div>
      )}

      {/* Key Metrics */}
      {keyMetrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {keyMetrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-center rounded-[var(--radius-sm)] py-2 px-3"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
                {m.label}
              </span>
              <span className="font-metric tabular-nums font-bold" style={{ fontSize: "var(--text-lg)", color: "var(--color-accent)" }}>
                {m.value}W
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 ? (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
              <CartesianGrid vertical={false} stroke="var(--border-subtle)" strokeDasharray="3 5" />
              <XAxis
                dataKey="logX"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={visibleTicks}
                tickFormatter={(v) => {
                  const seconds = Math.round(Math.pow(10, v));
                  return formatDuration(seconds);
                }}
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, yMax]}
                tickFormatter={(v) => `${v}W`}
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={(props) => (
                  <PowerTooltip
                    active={props.active}
                    payload={props.payload as unknown as Array<{ value: number; payload: { duration: number; logX: number } }>}
                    ftp={ftp}
                  />
                )}
              />
              {ftp && (
                <ReferenceLine
                  y={ftp}
                  stroke="var(--color-warning)"
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                  label={{
                    value: `FTP ${ftp}W`,
                    position: "right",
                    fontSize: 9,
                    fill: "var(--color-warning)",
                    fontWeight: 600,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="power"
                stroke="var(--color-accent)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: "var(--color-accent)" }}
              />
              {/* Highlight dots at key durations */}
              {[5, 300, 1200, 3600].map((dur) => {
                const point = chartData.find((d) => d.duration === dur);
                if (!point) return null;
                return (
                  <ReferenceDot
                    key={dur}
                    x={point.logX}
                    y={point.power}
                    r={4}
                    fill="var(--color-accent)"
                    stroke="var(--bg-primary)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState />
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 border-t border-[var(--border-subtle)] pt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <svg width="14" height="6" viewBox="0 0 14 6" className="overflow-visible">
              <line x1="0" y1="3" x2="14" y2="3" stroke="var(--color-accent)" strokeWidth="2.5" />
            </svg>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
              MMP Curve
            </span>
          </div>
          {ftp && (
            <div className="flex items-center gap-1.5">
              <svg width="14" height="6" viewBox="0 0 14 6" className="overflow-visible">
                <line x1="0" y1="3" x2="14" y2="3" stroke="var(--color-warning)" strokeWidth="2.5" strokeDasharray="4 2" />
              </svg>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
                FTP Reference
              </span>
            </div>
          )}
        </div>
        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
          X-axis: log scale
        </span>
      </div>
    </div>
  );
}
