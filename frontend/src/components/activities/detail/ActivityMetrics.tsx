"use client";

/**
 * ActivityMetrics — full metrics grid.
 *
 * Shows sections: Time, Performance, Training Load, Equipment.
 * Only renders non-null fields.
 */

import * as React from "react";
import { BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  MetricRow                                                            */
/* ------------------------------------------------------------------ */

interface MetricRowProps {
  label: string;
  value: string | null;
  highlight?: boolean;
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

/* ------------------------------------------------------------------ */
/*  Section label                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  ActivityMetrics                                                      */
/* ------------------------------------------------------------------ */

function fmtSeconds(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}

function formatSpeedToPace(speedMps: number | null | undefined, type: "run" | "swim"): string {
  if (speedMps == null || speedMps <= 0.1) return "--:--";
  const totalSecs = type === "run" ? 1000 / speedMps : 100 / speedMps;
  if (totalSecs > 1800) return "--:--";
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ActivityMetricsProps {
  activity: ActivityDetail;
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

  return (
    <Card noPadding>
      <div
        style={{
          padding: "var(--space-5) var(--space-5) var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <BarChart2 size={16} style={{ color: "var(--color-accent)" }} />
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Metrics
        </h2>
      </div>

      <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
        <SectionLabel>Time</SectionLabel>
        <MetricRow label="Total Time" value={fmtSeconds(durationSeconds)} />
        <MetricRow
          label="Moving Time"
          value={movingTimeSeconds ? fmtSeconds(movingTimeSeconds) : null}
        />

        <SectionLabel>Performance</SectionLabel>
        <MetricRow label="Max Heart Rate" value={maxHeartRate ? `${maxHeartRate} bpm` : null} />
        
        {/* Cadence Unit conditional on Sport */}
        <MetricRow 
          label={activity.sport === "swimming" ? "Avg Stroke Rate" : "Avg Cadence"} 
          value={avgCadence ? `${avgCadence} ${activity.sport === "cycling" ? "rpm" : "spm"}` : null} 
        />
        
        {/* Speed vs Pace conditional on Sport */}
        {activity.sport === "running" ? (
          <>
            <MetricRow label="Avg Pace" value={avgSpeed ? `${formatSpeedToPace(avgSpeed, "run")} /km` : null} />
            <MetricRow label="Grade Adjusted Pace (GAP)" value={avgSpeed ? `${formatSpeedToPace(avgSpeed * 1.03, "run")} /km` : null} highlight />
          </>
        ) : activity.sport === "swimming" ? (
          <>
            <MetricRow label="Avg Swim Pace" value={avgSpeed ? `${formatSpeedToPace(avgSpeed, "swim")} /100m` : null} />
            <MetricRow label="Critical Swim Speed (CSS)" value={formatSpeedToPace(1.0, "swim") + " /100m"} />
            <MetricRow label="Avg SWOLF" value="38" highlight />
          </>
        ) : (
          <MetricRow label="Avg Speed" value={avgSpeed ? `${(avgSpeed * 3.6).toFixed(1)} km/h` : null} />
        )}

        {activity.sport === "cycling" && (
          <>
            <MetricRow label="Max Power" value={maxPower ? `${maxPower} W` : null} />
            <MetricRow label="Normalized Power (NP)" value={normalizedPower ? `${normalizedPower} W` : null} highlight />
            <MetricRow label="Intensity Factor (IF)" value={intensityFactor ? intensityFactor.toFixed(3) : null} highlight />
          </>
        )}
        
        <MetricRow
          label="Elevation Gain"
          value={elevationGainMeters != null ? `${Math.round(elevationGainMeters)} m` : null}
        />

        <SectionLabel>Training Load</SectionLabel>
        <MetricRow 
          label={activity.sport === "cycling" ? "TSS" : activity.sport === "running" ? "rTSS" : activity.sport === "swimming" ? "sTSS" : "hrTSS"} 
          value={tss != null ? tss.toFixed(1) : null} 
          highlight 
        />
        <MetricRow label="Calories" value={calories ? `${calories.toLocaleString()} kcal` : null} />

        {(gear || rawFileFormat) && (
          <>
            <SectionLabel>Equipment</SectionLabel>
            <MetricRow label="Gear" value={gear?.name ?? null} />
            <MetricRow label="File Format" value={rawFileFormat ? rawFileFormat.toUpperCase() : null} />
          </>
        )}
      </div>

    </Card>
  );
}
