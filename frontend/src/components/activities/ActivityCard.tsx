"use client";

/**
 * ActivityCard — single activity feed row (list view only).
 *
 * Layout:
 *   [border-left accent] [36px sport icon] | title / sport+date | primary metric (large mono)
 *                                                                  secondary metrics (tiny text)
 */

import * as React from "react";
import { Heart, Zap, TrendingUp } from "lucide-react";
import { SportIcon } from "./SportIcon";
import { formatDuration, formatDistance } from "@/lib/utils";
import type { ActivitySummary, Sport } from "@/lib/types/activity";

/* ─── Sport color map — token-based only ─────────────────────────────── */

const sportColorVar: Record<Sport, string> = {
  cycling:  "var(--sport-cycling)",
  running:  "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  hiking:   "var(--sport-hiking, #84cc16)",
  walking:  "var(--sport-walking, #a78bfa)",
  other:    "var(--sport-other)",
};

const sportLabel: Record<Sport, string> = {
  cycling:  "Cycling",
  running:  "Running",
  swimming: "Swimming",
  strength: "Strength",
  hiking:   "Hiking",
  walking:  "Walking",
  other:    "Other",
};

/* ─── Date helpers ────────────────────────────────────────────────────── */

function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month:   "short",
    day:     "numeric",
  });
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour:   "2-digit",
    minute: "2-digit",
  });
}

/* ─── ActivityCard ────────────────────────────────────────────────────── */

export interface ActivityCardProps {
  activity: ActivitySummary;
  /** Kept for backwards compat — always renders as list */
  viewMode?: "grid" | "list";
  onClick?: (id: string) => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const {
    id,
    sport,
    name,
    startedAt,
    durationSeconds,
    distanceMeters,
    avgHeartRate,
    avgPower,
    tss,
  } = activity;

  const accentColor = sportColorVar[sport] ?? sportColorVar.other;

  /* Primary metric: distance if available, otherwise duration */
  const hasDist = distanceMeters != null && distanceMeters > 0;
  const primaryMetric = hasDist
    ? formatDistance(distanceMeters!)
    : formatDuration(durationSeconds);

  /* Secondary metrics — plain icon + text, no boxes */
  const secondaryParts: React.ReactNode[] = [];
  if (hasDist && durationSeconds) {
    secondaryParts.push(
      <span key="dur" style={{ color: "var(--text-muted)" }}>
        {formatDuration(durationSeconds)}
      </span>
    );
  }
  if (avgHeartRate) {
    secondaryParts.push(
      <span key="hr" className="inline-flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
        <Heart size={10} aria-hidden="true" />
        {avgHeartRate}
      </span>
    );
  }
  if (avgPower) {
    secondaryParts.push(
      <span key="pwr" className="inline-flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
        <Zap size={10} aria-hidden="true" />
        {avgPower}W
      </span>
    );
  }
  if (tss != null) {
    secondaryParts.push(
      <span key="tss" className="inline-flex items-center gap-0.5" style={{ color: "var(--text-muted)" }}>
        <TrendingUp size={10} aria-hidden="true" />
        {tss.toFixed(0)} TSS
      </span>
    );
  }

  const handleKey = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(id);
        }
      }
    : undefined;

  return (
    <div
      onClick={onClick ? () => onClick(id) : undefined}
      onKeyDown={handleKey}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Activity: ${name}`}
      style={{
        display: "flex",
        alignItems: "center",
        minHeight: 68,
        paddingRight: 16,
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${accentColor}`,
        cursor: onClick ? "pointer" : "default",
        transition: `background var(--duration-micro) var(--ease-standard),
                     border-color var(--duration-micro) var(--ease-standard)`,
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.background = "var(--bg-elevated)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--bg-surface)";
      }}
    >
      {/* Sport icon container */}
      <div
        aria-hidden="true"
        style={{
          width: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          alignSelf: "stretch",
          color: accentColor,
        }}
      >
        <SportIcon sport={sport} size={18} />
      </div>

      {/* Middle — title + meta */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          paddingTop: 12,
          paddingBottom: 12,
        }}
      >
        <p
          className="truncate"
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 600,
            color: "var(--text-primary)",
            lineHeight: 1.25,
          }}
        >
          {name}
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            marginTop: 3,
            lineHeight: 1.2,
          }}
        >
          {sportLabel[sport] ?? sport} · {formatActivityDate(startedAt)}{" "}
          <span style={{ color: "var(--text-muted)" }}>
            {formatActivityTime(startedAt)}
          </span>
        </p>
      </div>

      {/* Right — primary + secondary metrics */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "right",
          paddingLeft: 12,
        }}
      >
        <p
          className="tabular-nums"
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 700,
            color: "var(--text-primary)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1.2,
          }}
        >
          {primaryMetric}
        </p>
        {secondaryParts.length > 0 && (
          <div
            className="tabular-nums"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              flexWrap: "wrap",
              gap: "0 8px",
              marginTop: 3,
              fontSize: "var(--text-xs)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {secondaryParts}
          </div>
        )}
      </div>
    </div>
  );
}
