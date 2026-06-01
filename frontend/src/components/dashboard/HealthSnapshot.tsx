"use client";
// src/components/dashboard/HealthSnapshot.tsx
// Garmin / wearable health data: resting HR, sleep score, HRV, body battery,
// stress, steps, SpO2. Mobile-first grid of metric chips + Training Readiness score.

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
  if (bb >= 50) return "var(--color-info)";
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
  if (status === "high") return "var(--color-accent)";
  return "var(--color-warning)";
}

/* ─── Calculate Readiness Score ───────────────────────────────────────── */

interface ReadinessResult {
  score: number;
  label: string;
  color: string;
  desc: string;
}

function calculateReadiness(data: HealthSnapshotType | null): ReadinessResult | null {
  if (!data) return null;
  const sleep = data.sleepScore ?? 70; // fallback if missing
  const stress = data.stressAvg !== null ? 100 - data.stressAvg : 75; // inverse stress
  const hrvVal = data.hrv ?? 55;
  // Map HRV to 0-100 score defensively (normal athlete baseline is 40-90 ms)
  const hrvScore = Math.min(Math.max((hrvVal - 30) * 1.6, 20), 100);

  // Weighted average: 45% Sleep, 35% HRV, 20% Stress
  const score = Math.round(sleep * 0.45 + hrvScore * 0.35 + stress * 0.2);

  let label = "Moderate";
  let color = "var(--color-warning)";
  let desc = "Recovery is still building. Moderate work is appropriate.";

  if (score >= 85) {
    label = "Prime";
    color = "var(--color-success)";
    desc = "Recovery markers support high-intensity work.";
  } else if (score >= 70) {
    label = "Good";
    color = "var(--color-info)";
    desc = "Ready for regular training. Watch hydration and effort.";
  } else if (score < 50) {
    label = "Fatigued";
    color = "var(--color-danger)";
    desc = "Stress or sleep markers suggest recovery or rest.";
  }

  return { score, label, color, desc };
}

/* ─── MetricChip ──────────────────────────────────────────────────────── */

interface ChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  valueColor?: string;
  bgTint?: string;
}

function MetricChip({
  icon,
  label,
  value,
  unit,
  sub,
  valueColor,
  bgTint,
}: ChipProps) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[var(--radius-lg)] p-3 transition-all duration-[var(--duration-micro)] hover:scale-[1.02] border border-[var(--border-subtle)] relative overflow-hidden"
      style={{
        background: bgTint 
          ? `color-mix(in srgb, ${bgTint} 8%, var(--bg-elevated))`
          : "var(--bg-elevated)",
      }}
    >
      <div
        className="flex items-center gap-1.5"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="flex-shrink-0" style={{ color: bgTint ?? "inherit" }}>{icon}</span>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, letterSpacing: "0.02em" }}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-0.5 mt-0.5">
        <span
          className="font-metric tabular-nums font-bold"
          style={{
            fontSize: "var(--text-xl)",
            color: valueColor ?? "var(--text-primary)",
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
        {unit && (
          <span
            style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 1 }}
          >
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500, marginTop: 1 }}>
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
    { key: "awake", label: "Awake", color: "var(--text-muted)", minutes: stages.awake },
  ];

  return (
    <div className="flex flex-col gap-2 mt-2 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)]" style={{ background: "rgba(0,0,0,0.1)" }}>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>
        Sleep Cycles Architecture
      </span>
      {/* Bar */}
      <div
        className="w-full flex overflow-hidden"
        style={{ height: 8, borderRadius: "var(--radius-full)" }}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(s.minutes / total) * 100}%`,
              background: s.color,
            }}
            title={`${s.label}: ${Math.round(s.minutes)} mins`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 min-[375px]:flex gap-y-1.5 gap-x-4">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full"
              style={{ width: 8, height: 8, background: s.color, flexShrink: 0 }}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              <span className="font-medium text-secondary" style={{ color: "var(--text-secondary)" }}>{s.label}</span> {Math.round((s.minutes / 60) * 10) / 10}h
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
      className="rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card"
    >
      <div className="flex items-center justify-between">
        <Skeleton width="120px" height="22px" />
        <Skeleton width="60px" height="16px" />
      </div>
      <div className="flex items-center gap-4 py-2 border-b border-[var(--border-subtle)]">
        <Skeleton shape="circle" width="60px" height="60px" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton width="40%" height="16px" />
          <Skeleton width="80%" height="12px" />
        </div>
      </div>
      <div className="grid grid-cols-2 min-[420px]:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} height="75px" className="rounded-[var(--radius-lg)]" />
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
  const iconSize = 14;

  if (!data || Object.values(data).every((v) => v === null)) {
    return (
      <div
        className={clsx(
          "rounded-[var(--radius-md)] p-5 flex flex-col items-center justify-center gap-3 glass-card",
          className
        )}
        style={{ minHeight: 180 }}
      >
        <div className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
          <WifiOff size={28} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
            Biometric sync pending
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2, maxWidth: 220 }}>
            Connect a supported source in settings to populate this panel.
          </p>
        </div>
      </div>
    );
  }

  const readiness = calculateReadiness(data);

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
          Biometric Snapshot
        </h2>
        {data.source && (
          <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-0.5 border border-[var(--border-subtle)]" style={{ background: "var(--color-success-8)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--color-success)" }} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                color: "var(--color-success)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {data.source} connected
            </span>
          </div>
        )}
      </div>

      {/* Training Readiness Ring Widget */}
      {readiness && (
        <div 
          className="flex items-center gap-4 p-3.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)]"
          style={{
            background: "var(--bg-elevated)",
          }}
        >
          {/* Radial SVG Ring */}
          <div className="relative flex-shrink-0 w-[64px] h-[64px]">
            <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
              <path
                className="text-[var(--bg-elevated)]"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="transition-all duration-700 ease-out"
                strokeDasharray={`${readiness.score}, 100`}
                strokeWidth="3.2"
                strokeLinecap="round"
                stroke={readiness.color}
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-metric font-extrabold text-[15px]" style={{ color: readiness.color }}>
                {readiness.score}
              </span>
              <span style={{ fontSize: "8px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                Score
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>Training readiness</span>
              <span 
                className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] font-bold" 
                style={{ color: readiness.color, background: `color-mix(in srgb, ${readiness.color} 12%, transparent)` }}
              >
                {readiness.label}
              </span>
            </div>
            <p className="mt-1" style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.35 }}>
              {readiness.desc}
            </p>
          </div>
        </div>
      )}

      {/* Grid of metrics — responsive: 2 columns on small, 3 columns on larger phones */}
      <div className="grid grid-cols-2 min-[420px]:grid-cols-3 gap-2.5">
        <MetricChip
          icon={<Heart size={iconSize} strokeWidth={2} />}
          label="Resting HR"
          value={fmt(data.restingHr)}
          unit={data.restingHr !== null ? "bpm" : ""}
          valueColor={
            data.restingHr !== null && data.restingHr < 50
              ? "var(--color-success)"
              : "var(--text-primary)"
          }
          bgTint="var(--color-success)"
        />

        <MetricChip
          icon={<Moon size={iconSize} strokeWidth={2} />}
          label="Sleep Quality"
          value={fmt(data.sleepScore)}
          unit={data.sleepScore !== null ? "/100" : ""}
          sub={data.sleepHours !== null ? `${fmt(data.sleepHours, 1)}h total` : undefined}
          valueColor={sleepQualityColor(data.sleepScore)}
          bgTint={sleepQualityColor(data.sleepScore)}
        />

        <MetricChip
          icon={<Brain size={iconSize} strokeWidth={2} />}
          label="HRV Status"
          value={fmt(data.hrv, 0)}
          unit={data.hrv !== null ? "ms" : ""}
          sub={hrvStatusLabel(data.hrvStatus)}
          valueColor={hrvStatusColor(data.hrvStatus)}
          bgTint={hrvStatusColor(data.hrvStatus)}
        />

        <MetricChip
          icon={<Battery size={iconSize} strokeWidth={2} />}
          label="Body Battery"
          value={fmt(data.bodyBattery)}
          unit={data.bodyBattery !== null ? "%" : ""}
          valueColor={bodyBatteryColor(data.bodyBattery)}
          bgTint={bodyBatteryColor(data.bodyBattery)}
        />

        <MetricChip
          icon={<Zap size={iconSize} strokeWidth={2} />}
          label="Stress Avg"
          value={fmt(data.stressAvg)}
          unit={data.stressAvg !== null ? "/100" : ""}
          valueColor={stressColor(data.stressAvg)}
          bgTint={stressColor(data.stressAvg)}
        />

        <MetricChip
          icon={<Footprints size={iconSize} strokeWidth={2} />}
          label="Daily Steps"
          value={formatSteps(data.steps)}
          unit={data.steps !== null ? "steps" : ""}
          valueColor="var(--text-primary)"
          bgTint="var(--color-accent)"
        />
      </div>

      {/* Optional SpO2 full-width row */}
      {data.spo2 !== null && (
        <div
          className="flex items-center justify-between rounded-[var(--radius-md)] px-3.5 py-2.5 border border-[var(--border-subtle)]"
          style={{ background: "var(--bg-elevated)" }}
        >
          <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <Wind size={14} strokeWidth={2} className="text-info" style={{ color: "var(--color-info)" }} />
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>Blood Oxygen (SpO₂)</span>
          </div>
          <span
            className="font-metric tabular-nums font-bold"
            style={{
              fontSize: "var(--text-sm)",
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
