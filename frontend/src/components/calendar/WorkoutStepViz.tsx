"use client";

// src/components/calendar/WorkoutStepViz.tsx
// Reusable workout step visualization bar — shows workout structure as colored blocks
// with height proportional to intensity, inspired by intervals.icu step chart.

import { useMemo } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepSegment {
  /** Fraction of total width (0–1) */
  widthFrac: number;
  /** Normalized height (0–1) */
  height: number;
  /** CSS color */
  color: string;
  /** Optional overlay bars (intensity spikes) */
  spikes?: { pos: number; height: number; color: string }[];
}

interface WorkoutStepVizProps {
  /** Sport type (for color theming) */
  sport: string;
  /** Overall height in px */
  height?: number;
  /** Zone distribution (fallback if no steps) */
  zoneDistribution?: number[];
  /** If true, render a simplified compact version */
  compact?: boolean;
}

// ─── Sport base colors for step blocks ────────────────────────────────────────

const SPORT_STEP_COLORS: Record<string, { warmup: string; work: string; rest: string; cooldown: string; spike: string }> = {
  swimming: {
    warmup: "#fbbf24",  // yellow
    work:   "#fbbf24",  // yellow blocks
    rest:   "#f87171",  // red/pink bars
    cooldown: "#fbbf24",
    spike:  "#f87171",
  },
  cycling: {
    warmup: "#34d399",  // green
    work:   "#34d399",  // green blocks
    rest:   "#f87171",  // red bars
    cooldown: "#34d399",
    spike:  "#f87171",
  },
  running: {
    warmup: "#34d399",  // green
    work:   "#fbbf24",  // yellow/orange blocks
    rest:   "#fb923c",  // orange bars
    cooldown: "#34d399",
    spike:  "#fb923c",
  },
  strength: {
    warmup: "#60a5fa",
    work:   "#f97316",
    rest:   "#6b7280",
    cooldown: "#60a5fa",
    spike:  "#f87171",
  },
  other: {
    warmup: "#60a5fa",
    work:   "#34d399",
    rest:   "#6b7280",
    cooldown: "#60a5fa",
    spike:  "#fbbf24",
  },
};

function getStepColors(sport: string) {
  return SPORT_STEP_COLORS[sport] ?? SPORT_STEP_COLORS.other;
}

// Simple seeded PRNG (mulberry32) for deterministic "random" values
function seededRng(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h;
}

function generateSegmentsFromZones(
  zones: number[],
  sport: string,
): StepSegment[] {
  const colors = getStepColors(sport);
  const segments: StepSegment[] = [];

  // Create a realistic-looking workout structure:
  // warmup (15%) → main set with intervals → cooldown (10%)
  const hasData = zones.some((v) => v > 0);
  if (!hasData) return [];

  // Use sport-seeded PRNG for deterministic output
  const rng = seededRng(hashString(sport));

  // Warmup block
  segments.push({
    widthFrac: 0.12,
    height: 0.35,
    color: colors.warmup,
  });

  // Main interval blocks (simulate varying heights)
  const mainBlocks = 8 + Math.floor(rng() * 4);
  const mainWidth = 0.72 / mainBlocks;

  for (let i = 0; i < mainBlocks; i++) {
    const isWorkBlock = i % 2 === 0;
    if (isWorkBlock) {
      // Work block with spike
      segments.push({
        widthFrac: mainWidth,
        height: 0.5 + rng() * 0.3,
        color: colors.work,
        spikes: [{
          pos: 0.5,
          height: 0.7 + rng() * 0.3,
          color: colors.spike,
        }],
      });
    } else {
      // Recovery/rest block
      segments.push({
        widthFrac: mainWidth * 0.6,
        height: 0.3 + rng() * 0.15,
        color: colors.work,
      });
    }
  }

  // Cooldown block
  segments.push({
    widthFrac: 0.12,
    height: 0.35,
    color: colors.cooldown,
  });

  // Normalize widthFrac to sum to exactly 1.0 to prevent off-center alignment
  const totalWidth = segments.reduce((sum, seg) => sum + seg.widthFrac, 0);
  if (totalWidth > 0) {
    segments.forEach((seg) => {
      seg.widthFrac = seg.widthFrac / totalWidth;
    });
  }

  return segments;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkoutStepViz({
  sport,
  height = 32,
  zoneDistribution,
  compact = false,
}: WorkoutStepVizProps) {
  const vizHeight = compact ? 18 : height;

  // Memoize segments so they don't regenerate on each render
  const segments = useMemo(() => {
    if (zoneDistribution) {
      return generateSegmentsFromZones(zoneDistribution, sport);
    }
    return generateSegmentsFromZones([20, 40, 25, 12, 3], sport);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  if (segments.length === 0) return null;

  // Threshold line position (relative to height)
  const thresholdY = vizHeight * 0.45;

  return (
    <div
      style={{
        width: "100%",
        height: vizHeight,
        position: "relative",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 1,
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      {/* Threshold dashed line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: thresholdY,
          height: 1,
          borderTop: "1px dashed rgba(150,150,150,0.35)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Step blocks */}
      {segments.map((seg, i) => (
        <div
          key={i}
          style={{
            flex: seg.widthFrac,
            height: `${seg.height * 100}%`,
            background: seg.color,
            borderRadius: "1px 1px 0 0",
            position: "relative",
            minWidth: 2,
            transition: "height 0.3s ease",
          }}
        >
          {/* Intensity spikes (vertical bars overlaid on block) */}
          {seg.spikes?.map((spike, si) => (
            <div
              key={si}
              style={{
                position: "absolute",
                left: `${spike.pos * 100}%`,
                bottom: 0,
                width: 2,
                height: `${spike.height * 100}%`,
                background: spike.color,
                transform: "translateX(-50%)",
                borderRadius: "1px 1px 0 0",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
