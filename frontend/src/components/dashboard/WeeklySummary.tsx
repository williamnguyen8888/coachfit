"use client";
// src/components/dashboard/WeeklySummary.tsx
// Bar chart: planned vs actual hours per day. CTL/TSS totals.
// Uses Recharts for the weekly training-load breakdown.

import React from "react";
import { clsx } from "clsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Skeleton } from "@/components/ui/Skeleton";
import { Activity, Flame, Navigation, Trophy } from "lucide-react";
import type { WeeklySummary as WeeklySummaryType } from "@/lib/types/dashboard";

/* ─── helpers ──────────────────────────────────────────────────────────── */

function complianceColor(pct: number): string {
  if (pct >= 90) return "var(--color-success)";
  if (pct >= 70) return "var(--color-accent)";
  if (pct >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

function sportColor(sport: string): string {
  const map: Record<string, string> = {
    cycling: "var(--sport-cycling)",
    running: "var(--sport-running)",
    swimming: "var(--sport-swimming)",
    strength: "var(--sport-strength)",
  };
  return map[sport] ?? "var(--sport-other)";
}

function formatDistance(meters: number | null, sport: string): string {
  if (meters === null || meters === 0) return "";
  if (sport === "swimming") {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/* ─── custom tooltip ───────────────────────────────────────────────────── */

function CustomTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { sport: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  if (!p) return null;
  const color = sportColor(p.payload.sport);

  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 flex flex-col gap-1 border border-[var(--border-default)]"
      style={{
        background: "var(--bg-elevated)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <span
        style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}
      >
        {p.payload.sport}
      </span>
      <div className="flex items-center gap-2 mt-0.5">
        <span
          className="inline-block rounded-full"
          style={{ width: 8, height: 8, background: color }}
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)", fontWeight: 700 }}>
          {p.value.toFixed(1)}h completed
        </span>
      </div>
    </div>
  );
}

/* ─── stat pill ─────────────────────────────────────────────────────────── */

function StatPill({ label, value, color, icon }: { label: string; value: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
      style={{
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-1">
        {icon && <span style={{ color: color ?? "inherit" }} className="flex-shrink-0">{icon}</span>}
        <span
          className="font-metric tabular-nums font-bold"
          style={{ fontSize: "var(--text-base)", color: color ?? "var(--text-primary)" }}
        >
          {value}
        </span>
      </div>
      <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────── */

export function WeeklySummarySkeleton() {
  return (
    <div
      className="rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card"
    >
      <div className="flex items-center justify-between">
        <Skeleton width="120px" height="22px" />
        <Skeleton width="80px" height="14px" />
      </div>
      <div className="flex border border-[var(--border-subtle)] rounded-[var(--radius-md)]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2">
            <Skeleton width="70%" height="18px" />
            <Skeleton width="40%" height="10px" />
          </div>
        ))}
      </div>
      <Skeleton height="140px" className="rounded-[var(--radius-md)]" />
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

interface Props {
  data: WeeklySummaryType;
  className?: string;
}

export function WeeklySummary({ data, className }: Props) {
  const chartData = (data.bySport ?? []).map((s) => ({
    sport: s.sport.charAt(0).toUpperCase() + s.sport.slice(1),
    hours: s.hours,
    rawSport: s.sport,
  }));

  // Total calculated statistics for multi-sport athletes
  const totalSessions = data.completedSessions ?? 0;
  const weekTss = data.totalTss ?? 0;
  const compliancePct = data.percentage ?? 0;

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
          Weekly Training Load
        </h2>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
          {(() => {
            try {
              const s = new Date(data.weekStart + "T00:00:00");
              const e = new Date(data.weekEnd + "T00:00:00");
              const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              return `${fmt(s)} – ${fmt(e)}`;
            } catch {
              return data.weekStart ?? "";
            }
          })()}
        </span>
      </div>

      {/* Summary stats row (Done, Target, TSS, Compliance) */}
      <div
        className="flex rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-subtle)]"
        style={{ background: "rgba(0,0,0,0.1)" }}
      >
        <StatPill
          label="Done"
          value={`${(data.completedHours ?? 0).toFixed(1)}h`}
          color="var(--color-fitness)"
        />
        <StatPill
          label="Target"
          value={`${(data.plannedHours ?? 0).toFixed(1)}h`}
          color="var(--text-secondary)"
        />
        <StatPill
          label="TSS Logged"
          value={weekTss > 0 ? String(Math.round(weekTss)) : "—"}
          color="var(--color-fatigue)"
          icon={<Flame size={12} />}
        />
        <div className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2">
          <span
            className="font-metric tabular-nums font-bold"
            style={{
              fontSize: "var(--text-base)",
              color: complianceColor(compliancePct),
            }}
          >
            {Math.round(compliancePct)}%
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>
            Compliance
          </span>
        </div>
      </div>

      {/* Bar chart — hours by sport */}
      {chartData.length > 0 ? (
        <div style={{ height: 130 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 0, bottom: 0, left: -25 }}
              barCategoryGap="40%"
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border-subtle)"
                strokeDasharray="2 4"
              />
              <XAxis
                dataKey="sport"
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255, 255, 255, 0.04)", radius: 6 }}
              />
              <Bar dataKey="hours" name="Hours" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={sportColor(entry.rawSport)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className="flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
          style={{
            height: 100,
            background: "var(--bg-elevated)",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
          }}
        >
          No training logs recorded for this week.
        </div>
      )}

      {/* Sports detailed breakdown list */}
      {(data.bySport?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3.5">
          <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.02em" }}>
            Sport Volume Metrics
          </span>
          <div className="flex flex-col gap-2">
            {(data.bySport ?? []).map((s) => {
              const color = sportColor(s.sport);
              const distance = formatDistance(s.distanceMeters, s.sport);
              return (
                <div 
                  key={s.sport} 
                  className="flex items-center justify-between text-xs p-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] transition-transform hover:scale-[1.01]"
                  style={{ background: `color-mix(in srgb, ${color} 4%, var(--bg-elevated))` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
                    <span className="font-semibold text-secondary capitalize" style={{ color: "var(--text-secondary)" }}>
                      {s.sport}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-secondary font-medium">
                    {s.sessions > 0 && (
                      <span className="flex items-center gap-1" title="Sessions count">
                        <Trophy size={11} className="text-muted" />
                        {s.sessions}x
                      </span>
                    )}
                    {distance && (
                      <span className="flex items-center gap-1" title="Completed distance">
                        <Navigation size={11} className="text-muted" />
                        {distance}
                      </span>
                    )}
                    {s.tss !== null && s.tss > 0 && (
                      <span className="flex items-center gap-1" title="Completed TSS" style={{ color: "var(--color-fatigue)" }}>
                        <Flame size={11} />
                        {Math.round(s.tss)}
                      </span>
                    )}
                    <span className="font-bold font-metric text-primary" style={{ color: "var(--text-primary)" }}>
                      {s.hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend & Summary details */}
      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-3 text-[10px] text-muted font-medium">
        <span>Logged total: {totalSessions} session{totalSessions !== 1 ? "s" : ""}</span>
        <span className="flex items-center gap-1" style={{ color: complianceColor(compliancePct) }}>
          <Activity size={10} />
          Compliance score: {Math.round(compliancePct)}%
        </span>
      </div>
    </div>
  );
}
