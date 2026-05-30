"use client";

/**
 * SourceBadge — displays the data source of an activity.
 * Sources: strava | garmin | manual | upload
 *
 * Each source has a distinct colour pill so athletes can instantly
 * see where each activity came from.
 */

import * as React from "react";
import type { ActivitySource } from "@/lib/types/activity";

interface SourceConfig {
  label: string;
  bg: string;
  text: string;
  border: string;
}

const SOURCE_CONFIG: Record<ActivitySource, SourceConfig> = {
  strava: {
    label: "Strava",
    // Strava brand orange — intentional brand literal, not a design-system color
    bg: "rgba(252, 76, 2, 0.15)",
    text: "#FC4C02",
    border: "rgba(252, 76, 2, 0.3)",
  },
  garmin: {
    label: "Garmin",
    // Garmin brand teal — intentional brand literal, not a design-system color
    bg: "rgba(0, 167, 106, 0.15)",
    text: "#00A76A",
    border: "rgba(0, 167, 106, 0.3)",
  },
  manual: {
    label: "Manual",
    bg: "var(--color-accent-12)",
    text: "var(--color-accent)",
    border: "var(--color-accent-25)",
  },
  upload: {
    label: "Upload",
    bg: "var(--color-accent-10)",
    text: "var(--color-fitness)",
    border: "var(--color-accent-25)",
  },
};

interface SourceBadgeProps {
  source: ActivitySource;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.manual;

  return (
    <span
      role="status"
      aria-label={`Source: ${config.label}`}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        letterSpacing: "0.02em",
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
}
