"use client";
// src/components/charts/ZoneDistributionChart.tsx
// Zone time distribution — stacked horizontal bars per zone with toggle
// between percentage and time-in-zone views. Includes sport + date filters.

import React, { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Clock, Percent, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ZoneDistributionResponse } from "@/lib/types/analytics";

// ─── Zone Config ──────────────────────────────────────────────────────────────

interface ZoneConfig {
  zone: number;
  name: string;
  color: string;
  description: string;
}

const ZONE_CONFIG: ZoneConfig[] = [
  { zone: 1, name: "Recovery",       color: "var(--zone-1)", description: "Active recovery, very easy" },
  { zone: 2, name: "Endurance",      color: "var(--zone-2)", description: "Aerobic base building" },
  { zone: 3, name: "Tempo",          color: "var(--zone-3)", description: "Sustained effort, comfortably hard" },
  { zone: 4, name: "Threshold",      color: "var(--zone-4)", description: "Lactate threshold, hard" },
  { zone: 5, name: "VO2max",         color: "var(--zone-5)", description: "Maximum aerobic capacity" },
  { zone: 6, name: "Anaerobic",      color: "var(--zone-6)", description: "Anaerobic capacity, very hard" },
  { zone: 7, name: "Neuromuscular",  color: "var(--zone-7)", description: "Sprint power, maximal" },
];

// ─── Sport Selector ────────────────────────────────────────────────────────────

const SPORTS = [
  { label: "All Sports", value: "all" },
  { label: "Cycling", value: "cycling" },
  { label: "Running", value: "running" },
  { label: "Swimming", value: "swimming" },
];

function SportSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div
      className="flex items-center rounded-[var(--radius-sm)] overflow-hidden"
      style={{ border: "1px solid var(--border-default)" }}
    >
      {SPORTS.map((s) => (
        <button
          key={s.value}
          id={`zone-sport-${s.value}`}
          onClick={() => onChange(s.value)}
          style={{
            padding: "4px 10px",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            background: value === s.value ? "var(--color-accent)" : "transparent",
            color: value === s.value ? "#fff" : "var(--text-secondary)",
            border: "none",
            cursor: "pointer",
            transition: "background 150ms ease-out, color 150ms ease-out",
            whiteSpace: "nowrap",
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── Time Formatting ──────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  if (seconds === 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

// ─── Stacked Bar ──────────────────────────────────────────────────────────────

function StackedBar({ zones, totalSeconds }: { zones: ZoneDistributionResponse["zones"]; totalSeconds: number }) {
  if (!totalSeconds) return null;
  return (
    <div
      className="flex h-5 rounded-[var(--radius-full)] overflow-hidden w-full"
      style={{ background: "var(--bg-elevated)" }}
      role="img"
      aria-label="Zone distribution stacked bar"
    >
      {zones.map((z) => {
        const pct = z.percentage;
        if (pct < 0.5) return null;
        const cfg = ZONE_CONFIG.find((c) => c.zone === z.zone);
        return (
          <div
            key={z.zone}
            title={`Z${z.zone} ${z.name}: ${pct.toFixed(1)}%`}
            style={{
              width: `${pct}%`,
              background: cfg?.color ?? "var(--text-muted)",
              transition: "width 400ms var(--ease-standard)",
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Zone Row ────────────────────────────────────────────────────────────────

function ZoneRow({
  entry,
  showPct,
  maxSeconds,
}: {
  entry: ZoneDistributionResponse["zones"][0];
  showPct: boolean;
  maxSeconds: number;
}) {
  const cfg = ZONE_CONFIG.find((c) => c.zone === entry.zone);
  const barWidth = maxSeconds > 0 ? (entry.seconds / maxSeconds) * 100 : 0;

  return (
    <div className="flex items-center gap-3 group">
      {/* Zone chip */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        style={{ width: 110 }}
      >
        <span
          className="inline-flex items-center justify-center rounded-[var(--radius-sm)] font-bold tabular-nums"
          style={{
            width: 24,
            height: 24,
            background: cfg?.color ?? "var(--text-muted)",
            fontSize: "var(--text-xs)",
            color: "#000",
            opacity: 0.9,
            flexShrink: 0,
          }}
        >
          Z{entry.zone}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cfg?.name ?? entry.name}
        </span>
      </div>

      {/* Bar */}
      <div className="flex-1 relative h-5 flex items-center">
        <div
          className="absolute inset-y-0 left-0 rounded-[var(--radius-sm)]"
          style={{
            background: "var(--bg-elevated)",
            width: "100%",
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-[var(--radius-sm)]"
          style={{
            background: cfg?.color ?? "var(--text-muted)",
            width: `${barWidth}%`,
            opacity: 0.85,
            transition: "width 400ms var(--ease-standard)",
            minWidth: entry.seconds > 0 ? 3 : 0,
          }}
        />
      </div>

      {/* Value */}
      <div className="shrink-0 text-right" style={{ width: 56 }}>
        <span
          className="font-metric tabular-nums font-semibold"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}
        >
          {showPct
            ? `${entry.percentage.toFixed(1)}%`
            : formatSeconds(entry.seconds)}
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function ZoneDistributionChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card", className)}>
      <div className="flex items-center justify-between">
        <Skeleton width="170px" height="22px" />
        <Skeleton width="90px" height="28px" />
      </div>
      <Skeleton height="20px" className="rounded-full" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton width="110px" height="24px" />
            <Skeleton height="20px" className="flex-1" />
            <Skeleton width="40px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[var(--radius-md)] gap-3 py-12"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
    >
      <BarChart3 size={32} style={{ color: "var(--text-muted)" }} />
      <div className="text-center">
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
          No zone data in this period
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
          Sync activities with HR or power data to see your zone distribution.
        </p>
      </div>
    </div>
  );
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

function SummaryStats({ data }: { data: ZoneDistributionResponse }) {
  const totalHours = data.totalSeconds / 3600;
  const topZone = [...(data.zones ?? [])].sort((a, b) => b.seconds - a.seconds)[0];
  const topZoneCfg = topZone ? ZONE_CONFIG.find((c) => c.zone === topZone.zone) : null;

  return (
    <div className="grid grid-cols-3 gap-2">
      <div
        className="flex flex-col items-center rounded-[var(--radius-sm)] py-2"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Total
        </span>
        <span className="font-metric tabular-nums font-bold" style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>
          {totalHours < 1 ? formatSeconds(data.totalSeconds) : `${totalHours.toFixed(1)}h`}
        </span>
        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>recorded</span>
      </div>
      <div
        className="flex flex-col items-center rounded-[var(--radius-sm)] py-2"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Zones
        </span>
        <span className="font-metric tabular-nums font-bold" style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}>
          {(data.zones ?? []).filter((z) => z.seconds > 0).length}
        </span>
        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>active</span>
      </div>
      <div
        className="flex flex-col items-center rounded-[var(--radius-sm)] py-2"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Top Zone
        </span>
        <span
          className="font-metric tabular-nums font-bold"
          style={{ fontSize: "var(--text-lg)", color: topZoneCfg?.color ?? "var(--text-primary)" }}
        >
          Z{topZone?.zone ?? "–"}
        </span>
        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
          {topZoneCfg?.name ?? "None"}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  data: ZoneDistributionResponse;
  sport: string;
  onSportChange: (s: string) => void;
  className?: string;
}

export function ZoneDistributionChart({ data, sport, onSportChange, className }: Props) {
  const [showPct, setShowPct] = useState(false);

  const sortedZones = useMemo(
    () => [...(data.zones ?? [])].sort((a, b) => a.zone - b.zone),
    [data.zones]
  );

  const maxSeconds = useMemo(
    () => Math.max(...sortedZones.map((z) => z.seconds), 1),
    [sortedZones]
  );

  const hasData = data.totalSeconds > 0;

  return (
    <div className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2
            className="font-bold tracking-tight"
            style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
          >
            Zone Distribution
          </h2>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
            Time in each training zone
          </p>
        </div>
        {/* Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="zone-view-toggle"
            onClick={() => setShowPct((p) => !p)}
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "border-color 150ms ease-out",
            }}
          >
            {showPct
              ? <><Clock size={12} /> Show Time</>
              : <><Percent size={12} /> Show %</>
            }
          </button>
        </div>
      </div>

      {/* Sport selector — scrollable on mobile */}
      <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
        <SportSelector value={sport} onChange={onSportChange} />
      </div>

      {hasData ? (
        <>
          {/* Summary stats */}
          <SummaryStats data={data} />

          {/* Stacked overview bar */}
          <StackedBar zones={sortedZones} totalSeconds={data.totalSeconds} />

          {/* Per-zone rows */}
          <div className="flex flex-col gap-2.5">
            {sortedZones.map((z) => (
              <ZoneRow
                key={z.zone}
                entry={z}
                showPct={showPct}
                maxSeconds={maxSeconds}
              />
            ))}
          </div>

          {/* Legend footer */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
            {ZONE_CONFIG.slice(0, 5).map((cfg) => (
              <div key={cfg.zone} className="flex items-center gap-1">
                <span
                  className="inline-block rounded-sm"
                  style={{ width: 8, height: 8, background: cfg.color, flexShrink: 0 }}
                />
                <span style={{ fontSize: "9px", color: "var(--text-muted)", fontWeight: 500 }}>
                  Z{cfg.zone} {cfg.name}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
