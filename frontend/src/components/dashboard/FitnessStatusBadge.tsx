"use client";
// src/components/dashboard/FitnessStatusBadge.tsx
// Compact CTL/ATL/TSB row used in mobile when FitnessTrend is collapsed.
// Also shown as an inline badge in the morning briefing area. Includes ACWR.

import React from "react";
import { clsx } from "clsx";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
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
  const props = { size: 12, strokeWidth: 2.5 };
  if (trend === "improving" || trend === "building")
    return <TrendingUp {...props} style={{ color: "var(--color-success)" }} />;
  if (trend === "declining")
    return <TrendingDown {...props} style={{ color: "var(--color-danger)" }} />;
  return <Minus {...props} style={{ color: "var(--text-muted)" }} />;
}

/* ─── ACWR Helpers ────────────────────────────────────────────────────────── */

function calculateAcwr(atl: number, ctl: number): number {
  if (!ctl || ctl <= 0) return 0;
  return Number((atl / ctl).toFixed(2));
}

function acwrLabel(acwr: number): { label: string; color: string; desc: string } {
  if (acwr === 0) return { label: "N/A", color: "var(--text-muted)", desc: "No training history." };
  if (acwr < 0.8) return { label: "Under-training", color: "var(--color-info)", desc: "Low training load. Elevated injury risk due to detraining." };
  if (acwr <= 1.3) return { label: "Sweet Spot", color: "var(--color-success)", desc: "Optimal workload. Fitness building, low injury risk." };
  if (acwr <= 1.5) return { label: "Overreaching", color: "var(--color-warning)", desc: "Increased fatigue. High workload, manage recovery closely." };
  return { label: "Danger Zone", color: "var(--color-danger)", desc: "Overtraining. Extremely high injury risk. Rest is advised." };
}

interface Props {
  data: FitnessStatus;
  className?: string;
}

export function FitnessStatusBadge({ data, className }: Props) {
  const formColor = tsbColor(data.tsb);
  const acwr = calculateAcwr(data.atl, data.ctl);
  const acwrInfo = acwrLabel(acwr);

  return (
    <div
      className={clsx(
        "flex flex-col gap-4 rounded-[var(--radius-md)] px-4 py-4 glass-card",
        className
      )}
    >
      {/* Metrics Row */}
      <div className="flex items-center justify-between gap-2">
        {/* CTL */}
        <div className="flex flex-col items-center gap-0.5 flex-1">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
            Fitness
          </span>
          <span
            className="font-metric tabular-nums font-extrabold"
            style={{ fontSize: "var(--text-2xl)", color: "var(--color-fitness)" }}
          >
            {Math.round(data.ctl)}
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>
            CTL (Chronic)
          </span>
        </div>

        <div style={{ width: 1, background: "var(--border-subtle)", height: 32 }} />

        {/* ATL */}
        <div className="flex flex-col items-center gap-0.5 flex-1">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
            Fatigue
          </span>
          <span
            className="font-metric tabular-nums font-extrabold"
            style={{ fontSize: "var(--text-2xl)", color: "var(--color-fatigue)" }}
          >
            {Math.round(data.atl)}
          </span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>
            ATL (Acute)
          </span>
        </div>

        <div style={{ width: 1, background: "var(--border-subtle)", height: 32 }} />

        {/* TSB — Form */}
        <div className="flex flex-col items-center gap-0.5 flex-1">
          <div className="flex items-center gap-1">
            <TrendIcon trend={data.trend} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
              Form
            </span>
          </div>
          <span
            className="font-metric tabular-nums font-extrabold"
            style={{ fontSize: "var(--text-2xl)", color: formColor }}
          >
            {data.tsb > 0 ? "+" : ""}
            {Math.round(data.tsb)}
          </span>
          <span style={{ fontSize: "10px", color: formColor, fontWeight: 600 }}>
            {tsbLabel(data.tsb)}
          </span>
        </div>
      </div>

      {/* ACWR Section */}
      {acwr > 0 && (
        <div 
          className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-2"
        >
          <div className="flex justify-between items-center text-xs">
            <span className="flex items-center gap-1" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
              AC Workload Ratio (ACWR)
              <span title="Acute-to-Chronic Workload Ratio (Fatigue / Fitness). Elite standard for injury prevention.">
                <Info size={11} className="text-muted cursor-help" />
              </span>
            </span>
            <span className="font-bold font-metric" style={{ color: acwrInfo.color }}>
              {acwr} <span style={{ fontSize: "9px", fontWeight: 500, color: "var(--text-muted)" }}>({acwrInfo.label})</span>
            </span>
          </div>

          {/* Graphical Gauge Bar */}
          <div 
            className="w-full h-2 rounded-full relative" 
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {/* Color Zone Ranges (0.0 to 2.0 scaled to 100%) */}
            {/* 0.0 - 0.8: Under (40% width) */}
            {/* 0.8 - 1.3: Sweet Spot (25% width) */}
            {/* 1.3 - 1.5: Warning (10% width) */}
            {/* 1.5+: Danger (25% width) */}
            <div className="absolute inset-0 flex rounded-full overflow-hidden opacity-30">
              <div style={{ width: "40%", background: "var(--color-info)" }} />
              <div style={{ width: "25%", background: "var(--color-success)" }} />
              <div style={{ width: "10%", background: "var(--color-warning)" }} />
              <div style={{ width: "25%", background: "var(--color-danger)" }} />
            </div>

            {/* Indicator Dot */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-black transition-all duration-500 shadow-md"
              style={{
                left: `${Math.min((acwr / 2.0) * 100, 98)}%`,
                background: acwrInfo.color,
                boxShadow: "none"
              }}
            />
          </div>

          <p className="text-[10px]" style={{ color: "var(--text-muted)", lineHeight: 1.3 }}>
            {acwrInfo.desc}
          </p>
        </div>
      )}
    </div>
  );
}
