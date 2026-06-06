"use client";

/**
 * WorkoutCard — list-view only row for the workout library.
 *
 * Layout:
 *   [sport icon w/ border-left accent] [title + sport label + optional template badge]  [duration (mono) + step count chevron]
 *   [description — single truncated line, muted]
 *
 * Min height: 64px. List view only — grid variant removed.
 */

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { SportIcon } from "@/components/activities/SportIcon";
import { formatDuration } from "@/lib/utils";
import type { WorkoutSummary } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ─── Sport color map — token-based only ────────────────────────────── */

const SPORT_COLOR: Record<Sport, string> = {
  cycling: "var(--sport-cycling)",
  running: "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  hiking: "var(--sport-hiking)",
  walking: "var(--sport-walking)",
  other: "var(--sport-other)",
};

const SPORT_LABEL: Partial<Record<Sport, string>> = {
  cycling: "Cycling",
  running: "Running",
  swimming: "Swimming",
  strength: "Strength",
  hiking: "Hiking",
  walking: "Walking",
  other: "Other",
};

/* ─── WorkoutCard ────────────────────────────────────────────────────── */

export interface WorkoutCardProps {
  workout: WorkoutSummary;
  /** Kept for API compat — ignored (list-only) */
  viewMode?: "grid" | "list";
  onClick?: (id: string) => void;
}

export function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const { id, name, sport, description, estimatedDuration, isTemplate } = workout;
  const accentColor = SPORT_COLOR[sport] ?? SPORT_COLOR.other;
  const sportLabel = SPORT_LABEL[sport] ?? sport;

  const handleClick = onClick ? () => onClick(id) : undefined;
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(id);
        }
      }
    : undefined;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`Workout: ${name}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        minHeight: 64,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: "var(--radius-md)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 150ms ease, background 150ms ease",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = `var(--border-default)`;
        el.style.borderLeftColor = accentColor;
        el.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        if (!onClick) return;
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--border-subtle)";
        el.style.borderLeftColor = accentColor;
        el.style.background = "var(--bg-surface)";
      }}
    >
      {/* Sport icon */}
      <div
        aria-hidden="true"
        style={{
          width: 52,
          alignSelf: "stretch",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: accentColor,
        }}
      >
        <SportIcon sport={sport} size={20} />
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: "12px 0",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <h3
            style={{
              fontSize: "var(--text-base)",
              fontWeight: 600,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
              flex: "0 1 auto",
              maxWidth: "100%",
            }}
          >
            {name}
          </h3>

          {isTemplate && (
            <span
              style={{
                flexShrink: 0,
                fontSize: "var(--text-xs)",
                color: "var(--color-accent)",
                background: "var(--color-accent-12)",
                border: "1px solid var(--color-accent)",
                borderRadius: "var(--radius-full)",
                padding: "1px 7px",
                fontWeight: 600,
                lineHeight: 1.5,
                opacity: 0.85,
              }}
            >
              Template
            </span>
          )}
        </div>

        {/* Sport label */}
        <span
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            lineHeight: 1.3,
          }}
        >
          {sportLabel}
        </span>

        {/* Description — single line, only when present */}
        {description && (
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              lineHeight: 1.4,
              marginTop: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Right: duration + chevron */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          flexShrink: 0,
          padding: "0 14px 0 12px",
        }}
      >
        {estimatedDuration != null ? (
          <span
            className="tabular-nums"
            aria-label={`Estimated duration: ${formatDuration(estimatedDuration)}`}
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {formatDuration(estimatedDuration)}
          </span>
        ) : (
          <span
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--text-muted)",
              lineHeight: 1.2,
            }}
          >
            —
          </span>
        )}

        {onClick && (
          <ChevronRight
            size={14}
            aria-hidden="true"
            style={{
              color: "var(--text-muted)",
              marginTop: 4,
              transition: "transform 150ms ease",
            }}
          />
        )}
      </div>
    </div>
  );
}
