/**
 * ActivityQuickStats.tsx
 * Sidebar widget showing training load metrics: TSS, NP, IF, Training Effect.
 * Only renders when at least one metric is present.
 */
"use client";

import * as React from "react";
import { BarChart3, Zap, Heart, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail } from "@/lib/types/activity";

interface Props {
  activity: ActivityDetail;
}

interface StatRow {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  tooltip?: string;
}

function buildStats(a: ActivityDetail): StatRow[] {
  const rows: StatRow[] = [];

  if (a.tss != null) {
    const label = a.sport === "running" ? "rTSS" : a.sport === "swimming" ? "sTSS" : "TSS";
    rows.push({
      id: "tss",
      label,
      value: Math.round(a.tss).toString(),
      icon: <BarChart3 size={13} />,
      color: "#8b5cf6",
      tooltip: "Training Stress Score",
    });
  }

  if (a.intensityFactor != null) {
    rows.push({
      id: "if",
      label: "IF",
      value: a.intensityFactor.toFixed(2),
      icon: <TrendingUp size={13} />,
      color: "#3b82f6",
      tooltip: "Intensity Factor (NP / FTP)",
    });
  }

  if (a.normalizedPower != null) {
    rows.push({
      id: "np",
      label: "NP",
      value: `${a.normalizedPower} W`,
      icon: <Zap size={13} />,
      color: "#f59e0b",
      tooltip: "Normalized Power",
    });
  }

  if (a.avgPower != null) {
    rows.push({
      id: "ap",
      label: "Avg Power",
      value: `${a.avgPower} W`,
      icon: <Zap size={13} />,
      color: "#64748b",
    });
  }

  if (a.aerobicTrainingEffect != null) {
    rows.push({
      id: "ate",
      label: "Aerobic TE",
      value: a.aerobicTrainingEffect.toFixed(1),
      icon: <Heart size={13} />,
      color: "#22c55e",
      tooltip: "Aerobic Training Effect (0–5)",
    });
  }

  if (a.anaerobicTrainingEffect != null) {
    rows.push({
      id: "ante",
      label: "Anaerobic TE",
      value: a.anaerobicTrainingEffect.toFixed(1),
      icon: <Heart size={13} />,
      color: "#ef4444",
      tooltip: "Anaerobic Training Effect (0–5)",
    });
  }

  return rows;
}

export function ActivityQuickStats({ activity }: Props) {
  const stats = buildStats(activity);
  if (stats.length === 0) return null;

  return (
    <Card>
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 size={15} className="text-text-muted" />
        <h3 className="text-sm font-bold text-text-primary">Training Load</h3>
      </div>

      <div className="flex flex-col gap-1">
        {stats.map((stat) => (
          <div
            key={stat.id}
            title={stat.tooltip}
            className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-bg-elevated/50"
          >
            <div className="flex items-center gap-2">
              <span style={{ color: stat.color }}>{stat.icon}</span>
              <span className="text-xs text-text-secondary">{stat.label}</span>
            </div>
            <span
              className="font-mono text-xs font-bold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
