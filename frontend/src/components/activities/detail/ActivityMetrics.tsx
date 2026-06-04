"use client";

import * as React from "react";
import { BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail } from "@/lib/types/activity";

interface MetricRowProps {
  label: string;
  value: string | null;
  highlight?: boolean;
}

interface ActivityMetricsProps {
  activity: ActivityDetail;
}

function MetricRow({ label, value, highlight }: MetricRowProps) {
  if (value == null) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{label}</span>
      <span
        className="tabular-nums"
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: highlight ? "var(--color-accent)" : "var(--text-primary)",
          flexShrink: 0,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 4,
        marginTop: "var(--space-4)",
      }}
    >
      {children}
    </p>
  );
}

function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
  }

  return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
}

function formatSpeedToPace(speedMps: number | null | undefined, type: "run" | "swim"): string | null {
  if (speedMps == null || speedMps <= 0.1) return null;

  const totalSecs = type === "run" ? 1000 / speedMps : 100 / speedMps;
  if (totalSecs > 1800) return null;

  const rounded = Math.round(totalSecs);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ActivityMetrics({ activity }: ActivityMetricsProps) {
  const {
    durationSeconds,
    movingTimeSeconds,
    maxHeartRate,
    avgCadence,
    avgSpeed,
    normalizedPower,
    maxPower,
    intensityFactor,
    elevationGainMeters,
    tss,
    calories,
    gear,
    rawFileFormat,
  } = activity;

  const cadenceLabel = activity.sport === "swimming" ? "Avg Stroke Rate" : "Avg Cadence";
  const cadenceUnit = activity.sport === "cycling" ? "rpm" : "spm";
  const trainingLoadLabel =
    activity.sport === "cycling"
      ? "TSS"
      : activity.sport === "running"
        ? "rTSS"
        : activity.sport === "swimming"
          ? "sTSS"
          : "Load";

  const averageSpeedOrPace =
    activity.sport === "running"
      ? (() => {
          const pace = formatSpeedToPace(avgSpeed, "run");
          return pace ? `${pace} /km` : null;
        })()
      : activity.sport === "swimming"
        ? (() => {
            const pace = formatSpeedToPace(avgSpeed, "swim");
            return pace ? `${pace} /100m` : null;
          })()
        : avgSpeed != null
          ? `${(avgSpeed * 3.6).toFixed(1)} km/h`
          : null;

  const averageSpeedLabel =
    activity.sport === "running"
      ? "Avg Pace"
      : activity.sport === "swimming"
        ? "Avg Swim Pace"
        : "Avg Speed";

  return (
    <Card noPadding>
      <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-3 sm:px-5 sm:pt-5 sm:pb-4">
        <BarChart2 size={16} style={{ color: "var(--color-accent)" }} />
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          Metrics
        </h2>
      </div>

      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <SectionLabel>Time</SectionLabel>
        <MetricRow label="Total Time" value={formatDuration(durationSeconds)} />
        <MetricRow
          label="Moving Time"
          value={movingTimeSeconds != null ? formatDuration(movingTimeSeconds) : null}
        />

        <SectionLabel>Performance</SectionLabel>
        <MetricRow
          label="Max Heart Rate"
          value={maxHeartRate != null ? `${maxHeartRate} bpm` : null}
        />
        <MetricRow
          label={cadenceLabel}
          value={avgCadence != null ? `${avgCadence} ${cadenceUnit}` : null}
        />
        <MetricRow label={averageSpeedLabel} value={averageSpeedOrPace} />

        {activity.sport === "cycling" ? (
          <>
            <MetricRow label="Max Power" value={maxPower != null ? `${maxPower} W` : null} />
            <MetricRow
              label="Normalized Power (NP)"
              value={normalizedPower != null ? `${normalizedPower} W` : null}
              highlight
            />
            <MetricRow
              label="Intensity Factor (IF)"
              value={intensityFactor != null ? intensityFactor.toFixed(3) : null}
              highlight
            />
          </>
        ) : null}

        <MetricRow
          label="Elevation Gain"
          value={elevationGainMeters != null ? `${Math.round(elevationGainMeters)} m` : null}
        />

        <SectionLabel>Training Load</SectionLabel>
        <MetricRow
          label={trainingLoadLabel}
          value={tss != null ? tss.toFixed(1) : null}
          highlight
        />
        <MetricRow
          label="Calories"
          value={calories != null ? `${calories.toLocaleString()} kcal` : null}
        />

        {gear || rawFileFormat ? (
          <>
            <SectionLabel>Equipment</SectionLabel>
            <MetricRow label="Gear" value={gear?.name ?? null} />
            <MetricRow label="File Format" value={rawFileFormat ? rawFileFormat.toUpperCase() : null} />
          </>
        ) : null}
      </div>
    </Card>
  );
}
