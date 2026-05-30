"use client";
// src/components/dashboard/HealthSnapshot.tsx
// Garmin / wearable health data: resting HR, sleep score, HRV, body battery,
// stress, steps, SpO2. Mobile-first grid of metric chips.

import React from "react";
import { clsx } from "clsx";
import {
  Heart,
  Moon,
  Zap,
  Battery,
  Brain,
  Footprints,
  Wind,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { HealthSnapshot as HealthSnapshotType } from "@/lib/types/dashboard";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function fmt(v: number | null, decimals = 0): string {
  if (v === null || v === undefined) return "—";
  return Number(v).toFixed(decimals);
}

function formatSteps(steps: number | null): string {
  if (steps === null) return "—";
  if (steps >= 1000) return `${(steps / 1000).toFixed(1)}k`;
  return String(steps);
}

function sleepQualityColor(score: number | null): string {
  if (score === null) return "var(--text-muted)";
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-warning)";
  return "var(--color-danger)";
}

function bodyBatteryColor(bb: number | null): string {
  if (bb === null) return "var(--text-muted)";
  if (bb >= 75) return "var(--color-success)";
  if (bb >= 50) return "var(--zone-2)";
  if (bb >= 25) return "var(--color-warning)";
  return "var(--color-danger)";
}

function stressColor(stress: number | null): string {
  if (stress === null) return "var(--text-muted)";
  if (stress <= 25) return "var(--color-success)";
  if (stress <= 50) return "var(--color-warning)";
  return "var(--color-danger)";
}

function hrvStatusLabel(status: string | null): string {
  const map: Record<string, string> = {
    balanced: "Balanced",
    unbalanced: "Unbalanced",
    low: "Low",
    high: "High",
  };
  return status ? (map[status] ?? status) : "—";
}

function hrvStatusColor(status: string | null): string {
  if (!status) return "var(--text-muted)";
  if (status === "balanced") return "var(--color-success)";
  if (status === "high") return "var(--color-fitness)";
  return "var(--color-warning)";
}

/* ─── MetricChip ──────────────────────────────────────────────────────── */

interface ChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  valueColor?: string;
  className?: string;
}

function MetricChip({
  icon,
  label,
  value,
  unit,
  sub,
  valueColor,
  className,
}: ChipProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-1 rounded-[var(--radius-lg)] p-3",
        "transition-all duration-[var(--duration-micro)]",
        className
      )}
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div
        className="flex items-center gap-1.5"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span style={{ fontSize: "var(--text-xs)", letterSpacing: "0.04em" }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="font-metric tabular-nums font-bold"
          style={{
            fontSize: "var(--text-2xl)",
            color: valueColor ?? "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ─── Sleep detail bar ─────────────────────────────────────────────────── */

function SleepStagesBar({
  stages,
}: {
  stages: HealthSnapshotType["sleepStages"];
}) {
  if (!stages) return null;
  const total = stages.deep + stages.light + stages.rem + stages.awake;
  if (total === 0) return null;

  const segments = [
    { key: "deep", label: "Deep", color: "var(--color-fitness)", minutes: stages.deep },
    { key: "rem", label: "REM", color: "var(--color-accent)", minutes: stages.rem },
    { key: "light", label: "Light", color: "var(--zone-1)", minutes: stages.light },
    { key: "awake", label: "Awake", color: "var(--border-default)", minutes: stages.awake },
  ];

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {/* Bar */}
      <div
        className="w-full flex overflow-hidden"
        style={{ height: 6, borderRadius: "var(--radius-full)" }}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(s.minutes / total) * 100}%`,
              background: s.color,
            }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1">
            <span
              className="inline-block rounded-full"
              style={{ width: 6, height: 6, background: s.color, flexShrink: 0 }}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {s.label} {Math.round(s.minutes / 60 * 10) / 10}h
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────── */

export function HealthSnapshotSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <Skeleton width="120px" height="20px" />
        <Skeleton width="60px" height="16px" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="80px" />
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

interface Props {
  data: HealthSnapshotType | null;
  className?: string;
}

export function HealthSnapshot({ data, className }: Props) {
  const iconSize = 13;

  if (!data || Object.values(data).every((v) => v === null)) {
    return (
      <div
        className={clsx(
          "rounded-[var(--radius-xl)] p-5 flex flex-col items-center justify-center gap-3",
          className
        )}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          minHeight: 160,
        }}
      >
        <WifiOff size={28} style={{ color: "var(--text-muted)" }} strokeWidth={1.5} />
        <div className="text-center">
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            No health data
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Connect Garmin or another wearable in Settings
          </p>
        </div>
      </div>
    );
  }

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
          Health
        </h2>
        {data.source && (
          <div className="flex items-center gap-1.5">
            <Wifi size={11} style={{ color: "var(--color-success)" }} strokeWidth={2} />
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                textTransform: "capitalize",
              }}
            >
              {data.source}
            </span>
          </div>
        )}
      </div>

      {/* Grid of metrics — 3-col on mobile, stays 3-col */}
      <div className="grid grid-cols-3 gap-2">
        <MetricChip
          icon={<Heart size={iconSize} strokeWidth={1.75} />}
          label="Resting HR"
          value={fmt(data.restingHr)}
          unit={data.restingHr !== null ? "bpm" : ""}
          valueColor={
            data.restingHr !== null && data.restingHr < 50
              ? "var(--color-success)"
              : "var(--text-primary)"
          }
        />

        <MetricChip
          icon={<Moon size={iconSize} strokeWidth={1.75} />}
          label="Sleep"
          value={fmt(data.sleepScore)}
          unit={data.sleepScore !== null ? "/100" : ""}
          sub={data.sleepHours !== null ? `${fmt(data.sleepHours, 1)}h` : undefined}
          valueColor={sleepQualityColor(data.sleepScore)}
        />

        <MetricChip
          icon={<Brain size={iconSize} strokeWidth={1.75} />}
          label="HRV"
          value={fmt(data.hrv, 0)}
          unit={data.hrv !== null ? "ms" : ""}
          sub={hrvStatusLabel(data.hrvStatus)}
          valueColor={hrvStatusColor(data.hrvStatus)}
        />

        <MetricChip
          icon={<Battery size={iconSize} strokeWidth={1.75} />}
          label="Body Battery"
          value={fmt(data.bodyBattery)}
          unit={data.bodyBattery !== null ? "%" : ""}
          valueColor={bodyBatteryColor(data.bodyBattery)}
        />

        <MetricChip
          icon={<Zap size={iconSize} strokeWidth={1.75} />}
          label="Stress"
          value={fmt(data.stressAvg)}
          unit={data.stressAvg !== null ? "/100" : ""}
          valueColor={stressColor(data.stressAvg)}
        />

        <MetricChip
          icon={<Footprints size={iconSize} strokeWidth={1.75} />}
          label="Steps"
          value={formatSteps(data.steps)}
          valueColor="var(--text-primary)"
        />
      </div>

      {/* Optional SpO2 full-width row */}
      {data.spo2 !== null && (
        <div
          className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <Wind size={13} strokeWidth={1.75} />
            <span style={{ fontSize: "var(--text-xs)" }}>SpO₂</span>
          </div>
          <span
            className="font-metric tabular-nums"
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color:
                data.spo2 >= 95 ? "var(--color-success)" : "var(--color-warning)",
            }}
          >
            {fmt(data.spo2, 1)}%
          </span>
        </div>
      )}

      {/* Sleep stages breakdown */}
      {data.sleepStages && <SleepStagesBar stages={data.sleepStages} />}
    </div>
  );
}
