"use client";

/**
 * SportIcon — renders a sport-appropriate icon + colour dot.
 * Uses Lucide icons for consistency; falls back gracefully.
 */

import * as React from "react";
import {
  Bike,
  Footprints,
  Mountain,
  PersonStanding,
  Waves,
  Dumbbell,
  Activity,
} from "lucide-react";
import type { Sport } from "@/lib/types/activity";

const SPORT_META: Record<
  Sport,
  { Icon: React.ElementType; color: string; label: string }
> = {
  cycling: {
    Icon: Bike,
    color: "var(--sport-cycling)",
    label: "Cycling",
  },
  running: {
    Icon: Footprints,
    color: "var(--sport-running)",
    label: "Running",
  },
  swimming: {
    Icon: Waves,
    color: "var(--sport-swimming)",
    label: "Swimming",
  },
  strength: {
    Icon: Dumbbell,
    color: "var(--sport-strength)",
    label: "Strength",
  },
  hiking: {
    Icon: Mountain,
    color: "#84cc16",
    label: "Hiking",
  },
  walking: {
    Icon: PersonStanding,
    color: "#a78bfa",
    label: "Walking",
  },
  other: {
    Icon: Activity,
    color: "var(--sport-other)",
    label: "Other",
  },
};

interface SportIconProps {
  sport: Sport;
  /** Icon size in px */
  size?: number;
  /** Include text label beside the icon */
  showLabel?: boolean;
  className?: string;
}

export function SportIcon({
  sport,
  size = 18,
  showLabel = false,
  className,
}: SportIconProps) {
  const meta = SPORT_META[sport] ?? SPORT_META.other;
  const { Icon, color, label } = meta;

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className ?? ""}`}
      aria-label={label}
    >
      <Icon size={size} style={{ color }} aria-hidden="true" />
      {showLabel && (
        <span
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}

/** Compact sport colour pill — used in filter chips */
export function SportDot({ sport }: { sport: Sport }) {
  const color = SPORT_META[sport]?.color ?? SPORT_META.other.color;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "var(--radius-full)",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}
