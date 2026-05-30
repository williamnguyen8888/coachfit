"use client";
// src/components/dashboard/FitnessStatusBadge.tsx
// Compact CTL/ATL/TSB row used in mobile when FitnessTrend is collapsed.
// Also shown as an inline badge in the morning briefing area.

import React from "react";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FitnessStatus, FitnessTrend } from "@/lib/types/dashboard";

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
  const props = { size: 12, strokeWidth: 2 };
  if (trend === "improving" || trend === "building")
    return <TrendingUp {...props} style={{ color: "var(--color-success)" }} />;
  if (trend === "declining")
    return <TrendingDown {...props} style={{ color: "var(--color-danger)" }} />;
  return <Minus {...props} style={{ color: "var(--text-muted)" }} />;
}

interface Props {
  data: FitnessStatus;
  className?: string;
}

export function FitnessStatusBadge({ data, className }: Props) {
  const formColor = tsbColor(data.tsb);

  return (
    <div
      className={clsx(
        "flex items-center gap-4 rounded-[var(--radius-lg)] px-4 py-3",
        className
      )}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* CTL */}
      <div className="flex flex-col items-center gap-0.5 flex-1">
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Fitness
        </span>
        <span
          className="font-metric tabular-nums font-bold"
          style={{ fontSize: "var(--text-xl)", color: "var(--color-fitness)" }}
        >
          {Math.round(data.ctl)}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          CTL
        </span>
      </div>

      <div style={{ width: 1, background: "var(--border-subtle)", height: 40 }} />

      {/* ATL */}
      <div className="flex flex-col items-center gap-0.5 flex-1">
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Fatigue
        </span>
        <span
          className="font-metric tabular-nums font-bold"
          style={{ fontSize: "var(--text-xl)", color: "var(--color-fatigue)" }}
        >
          {Math.round(data.atl)}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          ATL
        </span>
      </div>

      <div style={{ width: 1, background: "var(--border-subtle)", height: 40 }} />

      {/* TSB — Form */}
      <div className="flex flex-col items-center gap-0.5 flex-1">
        <div className="flex items-center gap-1">
          <TrendIcon trend={data.trend} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Form
          </span>
        </div>
        <span
          className="font-metric tabular-nums font-bold"
          style={{ fontSize: "var(--text-xl)", color: formColor }}
        >
          {data.tsb > 0 ? "+" : ""}
          {Math.round(data.tsb)}
        </span>
        <span style={{ fontSize: "var(--text-xs)", color: formColor, fontWeight: 500 }}>
          {tsbLabel(data.tsb)}
        </span>
      </div>
    </div>
  );
}
