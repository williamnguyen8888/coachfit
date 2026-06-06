"use client";
// src/components/dashboard/FitnessStatusBadge.tsx
// Compact CTL/ATL/TSB row. Also shown inline in the morning briefing area. Includes ACWR.

import React from "react";
import { clsx } from "clsx";
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

function acwrLabel(acwr: number): { label: string; color: string; desc: string } {
  if (acwr === 0) return { label: "N/A", color: "var(--text-muted)", desc: "No training history." };
  if (acwr < 0.8) return { label: "Under-training", color: "var(--color-info)", desc: "Low load. Elevated detraining risk." };
  if (acwr <= 1.3) return { label: "Sweet Spot", color: "var(--color-success)", desc: "Optimal workload. Low injury risk." };
  if (acwr <= 1.5) return { label: "Overreaching", color: "var(--color-warning)", desc: "High fatigue. Manage recovery closely." };
  return { label: "Danger Zone", color: "var(--color-danger)", desc: "Overtraining risk. Rest is advised." };
}

/* ─── Stat column — clean, no icon ──────────────────────────────────────── */

function StatColumn({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 flex-1">
      <span className="section-label">{label}</span>
      <span
        className="font-metric tabular-nums"
        style={{ fontSize: "var(--text-2xl)", fontWeight: 700, color: color ?? "var(--text-primary)" }}
      >
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: "11px", color: color ?? "var(--text-muted)", fontWeight: 500 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

interface Props {
  data: FitnessStatus;
  className?: string;
}

export function FitnessStatusBadge({ data, className }: Props) {
  const formColor = tsbColor(data.tsb);
  const acwr = data.atl && data.ctl ? Number((data.atl / data.ctl).toFixed(2)) : 0;
  const acwrInfo = acwrLabel(acwr);

  return (
    <div
      className={clsx(
        "flex flex-col gap-4 rounded-[var(--radius-md)] px-4 py-4 glass-card",
        className
      )}
    >
      {/* Metrics Row — CTL / ATL / TSB */}
      <div className="flex items-center gap-2">
        <StatColumn
          label="Fitness"
          value={String(Math.round(data.ctl))}
          sub="CTL"
          color="var(--color-fitness)"
        />
        <div style={{ width: 1, background: "var(--border-subtle)", height: 40 }} />
        <StatColumn
          label="Fatigue"
          value={String(Math.round(data.atl))}
          sub="ATL"
          color="var(--color-fatigue)"
        />
        <div style={{ width: 1, background: "var(--border-subtle)", height: 40 }} />
        <StatColumn
          label="Form"
          value={`${data.tsb > 0 ? "+" : ""}${Math.round(data.tsb)}`}
          sub={tsbLabel(data.tsb)}
          color={formColor}
        />
      </div>

      {/* ACWR Section */}
      {acwr > 0 && (
        <div className="border-t border-[var(--border-subtle)] pt-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Workload Ratio (ACWR)
            </span>
            <span className="font-metric font-bold" style={{ fontSize: "var(--text-sm)", color: acwrInfo.color }}>
              {acwr}{" "}
              <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}>
                {acwrInfo.label}
              </span>
            </span>
          </div>

          {/* Gauge Bar */}
          <div
            className="w-full h-1.5 rounded-full relative"
            style={{ background: "var(--border-subtle)" }}
          >
            <div className="absolute inset-0 flex rounded-full overflow-hidden opacity-20">
              <div style={{ width: "40%", background: "var(--color-info)" }} />
              <div style={{ width: "25%", background: "var(--color-success)" }} />
              <div style={{ width: "10%", background: "var(--color-warning)" }} />
              <div style={{ width: "25%", background: "var(--color-danger)" }} />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-500"
              style={{
                left: `calc(${Math.min((acwr / 2.0) * 100, 97)}% - 6px)`,
                background: acwrInfo.color,
                border: "2px solid var(--bg-surface)",
              }}
            />
          </div>

          <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>
            {acwrInfo.desc}
          </p>
        </div>
      )}
    </div>
  );
}
