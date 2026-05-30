"use client";
// src/components/dashboard/WeeklySummary.tsx
// Bar chart: planned vs actual hours per day. CTL/TSS totals.
// Uses Recharts (already in package.json).

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
import type { WeeklySummary as WeeklySummaryType, SportVolume } from "@/lib/types/dashboard";

/* ─── helpers ──────────────────────────────────────────────────────────── */

function complianceColor(pct: number): string {
  if (pct >= 90) return "var(--color-success)";
  if (pct >= 70) return "var(--color-accent)";
  if (pct >= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

/* ─── custom tooltip ───────────────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-[var(--radius-md)] px-3 py-2 flex flex-col gap-1"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p
        style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", marginBottom: 4 }}
      >
        {label}
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: p.color, flexShrink: 0 }}
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {p.name}:
          </span>
          <span
            className="font-metric tabular-nums"
            style={{ fontSize: "var(--text-xs)", color: "var(--text-primary)" }}
          >
            {p.value.toFixed(1)}h
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── stat pill ─────────────────────────────────────────────────────────── */

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 flex-1"
      style={{
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      <span
        className="font-metric tabular-nums font-bold"
        style={{ fontSize: "var(--text-xl)", color: color ?? "var(--text-primary)" }}
      >
        {value}
      </span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────── */

export function WeeklySummarySkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <Skeleton width="120px" height="20px" />
        <Skeleton width="80px" height="14px" />
      </div>
      <div className="flex gap-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 px-2">
            <Skeleton width="80%" height="20px" />
            <Skeleton width="50%" height="12px" />
          </div>
        ))}
      </div>
      <Skeleton height="160px" />
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

interface Props {
  data: WeeklySummaryType;
  className?: string;
}

export function WeeklySummary({ data, className }: Props) {
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
          This Week
        </h2>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
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


      {/* Summary stats row */}
      <div
        className="flex rounded-[var(--radius-md)] overflow-hidden"
        style={{ border: "1px solid var(--border-subtle)" }}
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
        <div className="flex flex-col items-center gap-0.5 flex-1">
          <span
            className="font-metric tabular-nums font-bold"
            style={{
              fontSize: "var(--text-xl)",
              color: complianceColor(data.percentage ?? 0),
            }}
          >
            {Math.round(data.percentage ?? 0)}%
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Compliance
          </span>
        </div>
      </div>

      {/* Bar chart — hours by sport */}
      {(data.bySport?.length ?? 0) > 0 ? (
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={(data.bySport ?? []).map((s) => ({ sport: s.sport, hours: s.hours }))}
              margin={{ top: 4, right: 0, bottom: 0, left: -24 }}
              barCategoryGap="35%"
            >
              <CartesianGrid
                vertical={false}
                stroke="var(--border-subtle)"
                strokeDasharray="2 4"
              />
              <XAxis
                dataKey="sport"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  const s = String(v ?? "");
                  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
                }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}h`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "var(--bg-elevated)", radius: 4 }}
              />
              <Bar dataKey="hours" name="Hours" radius={[3, 3, 0, 0]}>
                {(data.bySport ?? []).map((_s, i) => (
                  <Cell key={i} fill="var(--color-fitness)" />
                ))}
              </Bar>
            </BarChart>
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
          No sessions logged this week yet
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-sm"
            style={{ width: 10, height: 10, background: "var(--color-fitness)" }}
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Hours completed
          </span>
        </div>
        {data.completedSessions > 0 && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {data.completedSessions} session{data.completedSessions !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}
