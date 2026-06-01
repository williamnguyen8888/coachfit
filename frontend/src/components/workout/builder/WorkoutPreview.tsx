"use client";

/**
 * WorkoutPreview — SVG bar chart visualization of the workout profile.
 *
 * Each step renders as a bar:
 *   - Width  ∝ duration in seconds (repeat blocks expanded × count)
 *   - Height ∝ intensity (zone number or %FTP)
 *   - Color  = zone color from design system
 *
 * Repeat blocks show all child steps × count side by side with a
 * bracket overlay and repeat count badge.
 *
 * No external charting library — pure SVG.
 */

import * as React from "react";
import type { BuilderStep, BuilderLeafStep } from "@/lib/types/builder";
import { formatDuration } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Zone color map                                                       */
/* ------------------------------------------------------------------ */

const ZONE_COLORS: Record<number, string> = {
  1: "#60A5FA",
  2: "#34D399",
  3: "#FBBF24",
  4: "#FB923C",
  5: "#F87171",
  6: "#C084FC",
  7: "#F472B6",
};

function zoneColor(zone: number): string {
  return ZONE_COLORS[Math.max(1, Math.min(7, zone))] ?? "#8B8B9E";
}

/* ------------------------------------------------------------------ */
/*  Derive bar segments from a step                                      */
/* ------------------------------------------------------------------ */

interface Segment {
  durationSeconds: number;
  intensity: number; // 0.0 – 1.0 (relative)
  color: string;
  label: string;
  isGap?: boolean; // for a tiny gap between segments
}

function intensityFromTarget(target?: BuilderLeafStep["target"]): { intensity: number; color: string } {
  if (!target || target.type === "open" || target.type === "none") {
    return { intensity: 0.2, color: "#5A5A6E" };
  }
  switch (target.type) {
    case "power_zone":
    case "hr_zone": {
      const z = target.zone ?? 2;
      const intensity = Math.min(1, z / 7);
      return { intensity, color: zoneColor(z) };
    }
    case "power_pct": {
      const mid = ((target.min ?? 0.5) + (target.max ?? 0.8)) / 2;
      // Map %FTP to an approximate zone (0%=0, 100%=Z4, 120%=Z6)
      const zone = Math.max(1, Math.min(7, Math.round(mid * 4.5)));
      return { intensity: Math.min(1, mid), color: zoneColor(zone) };
    }
    case "pace": {
      // Faster pace = lower sec/km value = higher intensity
      const mid = ((target.min ?? 300) + (target.max ?? 360)) / 2;
      const intensity = Math.max(0.1, Math.min(1, (600 - mid) / 400));
      const zone = Math.max(1, Math.min(5, Math.round(intensity * 5)));
      return { intensity, color: zoneColor(zone) };
    }
    case "rpe": {
      const mid = ((target.min ?? 6) + (target.max ?? 7)) / 2;
      const intensity = mid / 10;
      const zone = Math.max(1, Math.min(5, Math.round(intensity * 5)));
      return { intensity, color: zoneColor(zone) };
    }
    case "cadence": {
      return { intensity: 0.65, color: zoneColor(2) };
    }
    default:
      return { intensity: 0.3, color: "#8B8B9E" };
  }
}

function stepTypeIntensityOverride(type: BuilderLeafStep["type"]): number | null {
  if (type === "warmup" || type === "cooldown") return null; // use target
  if (type === "rest") return null; // use target (usually Z1)
  return null;
}

function leafToSegment(step: BuilderLeafStep): Segment {
  const { intensity, color } = intensityFromTarget(step.target);
  const override = stepTypeIntensityOverride(step.type);
  const dur = step.duration?.type === "time" ? (step.duration.value ?? 300) : 300;

  return {
    durationSeconds: dur,
    intensity: override ?? intensity,
    color,
    label: `${step.type[0].toUpperCase()}${step.type.slice(1)}`,
  };
}

function buildSegments(steps: BuilderStep[]): Segment[] {
  const segs: Segment[] = [];
  for (const step of steps) {
    if (step.type === "repeat") {
      const childSegs = step.steps.flatMap((s) => leafToSegment(s));
      for (let i = 0; i < (step.count ?? 1); i++) {
        segs.push(...childSegs);
      }
    } else {
      segs.push(leafToSegment(step));
    }
  }
  return segs;
}

/* ------------------------------------------------------------------ */
/*  Duration label helper                                               */
/* ------------------------------------------------------------------ */

function totalDuration(steps: BuilderStep[]): number {
  let total = 0;
  for (const step of steps) {
    if (step.type === "repeat") {
      const childDur = step.steps.reduce((a, s) => a + (s.duration?.value ?? 300), 0);
      total += childDur * (step.count ?? 1);
    } else {
      total += step.duration?.value ?? 300;
    }
  }
  return total;
}

/* ------------------------------------------------------------------ */
/*  SVG Chart                                                            */
/* ------------------------------------------------------------------ */

const CHART_HEIGHT = 120;
const BAR_MIN_HEIGHT = 8;
const GAP_WIDTH = 2;

interface WorkoutPreviewProps {
  steps: BuilderStep[];
}

export function WorkoutPreview({ steps }: WorkoutPreviewProps) {
  const segments = buildSegments(steps);
  const total = segments.reduce((a, s) => a + s.durationSeconds, 0);
  const dur = totalDuration(steps);

  if (segments.length === 0) {
    return (
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px dashed var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "40px 24px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "var(--text-sm)",
        }}
      >
        Add steps to see a preview
      </div>
    );
  }

  const SVG_W = 1000;
  const LABEL_H = 24;
  const SVG_H = CHART_HEIGHT + LABEL_H;

  return (
    <div
      aria-label="Workout preview chart"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        overflow: "hidden",
      }}
    >
      {/* Summary line */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Workout Preview
        </span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
          {formatDuration(dur)} total · {segments.length} segments
        </span>
      </div>

      {/* SVG chart */}
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: "auto", minWidth: 300 }}
          role="img"
          aria-label={`Workout chart with ${segments.length} segments, total duration ${formatDuration(dur)}`}
        >
          {segments.map((seg, i) => {
            const segW = total > 0 ? (seg.durationSeconds / total) * (SVG_W - GAP_WIDTH * (segments.length - 1)) : SVG_W / segments.length;
            const x = segments.slice(0, i).reduce((acc, s, si) => {
              const w = total > 0 ? (s.durationSeconds / total) * (SVG_W - GAP_WIDTH * (segments.length - 1)) : SVG_W / segments.length;
              return acc + w + GAP_WIDTH;
            }, 0);
            const barH = Math.max(BAR_MIN_HEIGHT, seg.intensity * CHART_HEIGHT);
            const y = CHART_HEIGHT - barH;

            return (
              <g key={i}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={segW}
                  height={barH}
                  rx={3}
                  fill={seg.color}
                  fillOpacity={0.85}
                  aria-label={`${seg.label}: ${formatDuration(seg.durationSeconds)}`}
                >
                  <title>{`${seg.label}: ${formatDuration(seg.durationSeconds)}`}</title>
                </rect>
                {/* Subtle top glow */}
                <rect x={x} y={y} width={segW} height={4} rx={3} fill={seg.color} fillOpacity={0.4} />
              </g>
            );
          })}

          {/* Baseline */}
          <line x1={0} y1={CHART_HEIGHT} x2={SVG_W} y2={CHART_HEIGHT} stroke="var(--border-subtle)" strokeWidth={1} />
        </svg>
      </div>

      {/* Zone legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {Object.entries(ZONE_COLORS).map(([z, c]) => (
          <div key={z} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Z{z}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
