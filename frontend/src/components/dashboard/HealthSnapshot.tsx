"use client";
// src/components/dashboard/HealthSnapshot.tsx
// Garmin / wearable health data: resting HR, sleep score, HRV, body battery,
// stress, steps, SpO2. Mobile-first grid of metric chips + Training Readiness score.

import React from "react";
import { clsx } from "clsx";
import { WifiOff } from "lucide-react";
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
  if (score === null) return "var(--text-primary)";
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-warning)";
  return "var(--color-danger)";
}

function bodyBatteryColor(bb: number | null): string {
  if (bb === null) return "var(--text-primary)";
  if (bb >= 75) return "var(--color-success)";
  if (bb >= 50) return "var(--text-primary)";
  if (bb >= 25) return "var(--color-warning)";
  return "var(--color-danger)";
}

function stressColor(stress: number | null): string {
  if (stress === null) return "var(--text-primary)";
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
  if (!status) return "var(--text-primary)";
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
  const sleep = data.sleepScore ?? 70;
  const stress = data.stressAvg !== null ? 100 - data.stressAvg : 75;
  const hrvVal = data.hrv ?? 55;
  const hrvScore = Math.min(Math.max((hrvVal - 30) * 1.6, 20), 100);
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
    color = "var(--color-accent)";
    desc = "Ready for regular training. Watch hydration and effort.";
  } else if (score < 50) {
    label = "Fatigued";
    color = "var(--color-danger)";
    desc = "Stress or sleep markers suggest recovery or rest.";
  }

  return { score, label, color, desc };
}

/* ─── MetricChip — purely neutral bg, color only on value ─────────────── */

interface ChipProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  valueColor?: string;
}

function MetricChip({ label, value, unit, sub, valueColor }: ChipProps) {
  return (
    <div className="metric-chip">
      <span className="metric-chip-label">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span
          className="metric-chip-value"
          style={{ color: valueColor ?? "var(--text-primary)" }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 1 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && <span className="metric-chip-sub">{sub}</span>}
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
    <div className="flex flex-col gap-2 mt-1">
      <span className="section-label">Sleep stages</span>
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
            title={`${s.label}: ${Math.round(s.minutes)} mins`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block rounded-full"
              style={{ width: 7, height: 7, background: s.color, flexShrink: 0 }}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{s.label}</span>{" "}
              {Math.round((s.minutes / 60) * 10) / 10}h
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
    <div className="rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card">
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
  const [showDetail, setShowDetail] = React.useState(false);

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
          <WifiOff size={24} strokeWidth={1.5} />
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
        <h2 className="card-title">Biometric Snapshot</h2>
        {data.source && (
          <div
            className="flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-0.5"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-success)" }} />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {data.source}
            </span>
          </div>
        )}
      </div>

      {/* Training Readiness — the primary answer to "am I ready?" */}
      {readiness && (
        <div
          className="flex items-center gap-4 p-3.5 rounded-[var(--radius-md)]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {/* Radial Score Ring */}
          <div className="relative flex-shrink-0 w-[60px] h-[60px]">
            <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
              <path
                strokeWidth="3"
                stroke="var(--border-default)"
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
              <span className="font-metric font-bold" style={{ fontSize: 15, color: readiness.color }}>
                {readiness.score}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
                Training readiness
              </span>
              <span
                className="status-badge"
                style={{
                  color: readiness.color,
                  background: "transparent",
                  border: `1px solid ${readiness.color}`,
                  opacity: 0.9,
                }}
              >
                {readiness.label}
              </span>
            </div>
            <p className="mt-1" style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              {readiness.desc}
            </p>
          </div>
        </div>
      )}

      {/* Primary metrics grid — 3 key signals */}
      <div className="grid grid-cols-3 gap-2">
        <MetricChip
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
          label="Sleep"
          value={fmt(data.sleepScore)}
          unit={data.sleepScore !== null ? "/100" : ""}
          sub={data.sleepHours !== null ? `${fmt(data.sleepHours, 1)}h total` : undefined}
          valueColor={sleepQualityColor(data.sleepScore)}
        />
        <MetricChip
          label="HRV"
          value={fmt(data.hrv, 0)}
          unit={data.hrv !== null ? "ms" : ""}
          sub={hrvStatusLabel(data.hrvStatus)}
          valueColor={hrvStatusColor(data.hrvStatus)}
        />
      </div>

      {/* Secondary metrics — collapsed by default */}
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="flex items-center justify-between w-full"
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--border-subtle)",
          fontSize: "var(--text-xs)",
          fontWeight: 500,
          color: "var(--text-muted)",
          background: "none",
          border: "1px solid transparent",
          borderTopColor: "var(--border-subtle)",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
          {showDetail ? "Hide details" : "More metrics"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            transform: showDetail ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
            color: "var(--text-muted)",
          }}
        >
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {showDetail && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <MetricChip
              label="Body Battery"
              value={fmt(data.bodyBattery)}
              unit={data.bodyBattery !== null ? "%" : ""}
              valueColor={bodyBatteryColor(data.bodyBattery)}
            />
            <MetricChip
              label="Stress Avg"
              value={fmt(data.stressAvg)}
              unit={data.stressAvg !== null ? "/100" : ""}
              valueColor={stressColor(data.stressAvg)}
            />
            <MetricChip
              label="Daily Steps"
              value={formatSteps(data.steps)}
            />
          </div>

          {/* SpO2 */}
          {data.spo2 !== null && (
            <div
              className="flex items-center justify-between rounded-[var(--radius-md)] px-3.5 py-2.5"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
            >
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--text-secondary)" }}>
                Blood Oxygen (SpO₂)
              </span>
              <span
                className="font-metric tabular-nums font-bold"
                style={{
                  fontSize: "var(--text-sm)",
                  color: data.spo2 >= 95 ? "var(--color-success)" : "var(--color-warning)",
                }}
              >
                {fmt(data.spo2, 1)}%
              </span>
            </div>
          )}

          {/* Sleep stages breakdown */}
          {data.sleepStages && <SleepStagesBar stages={data.sleepStages} />}
        </div>
      )}
    </div>
  );
}
