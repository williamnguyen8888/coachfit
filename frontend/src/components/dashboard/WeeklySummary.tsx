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
import type { WeeklySummary as WeeklySummaryType } from "@/lib/types/dashboard";

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
          {data.weekLabel ?? ''}
        </span>
      </div>

      {/* Summary stats row */}
      <div
        className="flex rounded-[var(--radius-md)] overflow-hidden"
        style={{ border: "1px solid var(--border-subtle)" }}
      >
        <StatPill
          label="Done"
          value={`${(data.totalCompletedHours ?? 0).toFixed(1)}h`}
          color="var(--color-fitness)"
        />
        <StatPill
          label="Target"
          value={`${(data.totalPlannedHours ?? 0).toFixed(1)}h`}
          color="var(--text-secondary)"
        />
        <div className="flex flex-col items-center gap-0.5 flex-1">
          <span
            className="font-metric tabular-nums font-bold"
            style={{
              fontSize: "var(--text-xl)",
              color: complianceColor(data.compliance ?? 0),
            }}
          >
            {Math.round(data.compliance ?? 0)}%
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Compliance
          </span>
        </div>
      </div>

      {/* Bar chart — planned vs actual */}
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.days ?? []}
            margin={{ top: 4, right: 0, bottom: 0, left: -24 }}
            barCategoryGap="30%"
            barGap={2}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border-subtle)"
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              axisLine={false}
              tickLine={false}
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
            {/* Planned — subtle outline bars */}
            <Bar dataKey="planned" name="Planned" radius={[3, 3, 0, 0]} fill="var(--border-default)">
              {(data.days ?? []).map((_day, i) => (
                <Cell key={i} fill="var(--border-default)" />
              ))}
            </Bar>
            {/* Completed — colored bars */}
            <Bar dataKey="completed" name="Completed" radius={[3, 3, 0, 0]}>
              {(data.days ?? []).map((day, i) => (
                <Cell
                  key={i}
                  fill={
                    day.completed > 0
                      ? "var(--color-fitness)"
                      : "transparent"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-sm"
            style={{ width: 10, height: 10, background: "var(--border-default)" }}
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Planned
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block rounded-sm"
            style={{ width: 10, height: 10, background: "var(--color-fitness)" }}
          />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Completed
          </span>
        </div>
      </div>
    </div>
  );
}
