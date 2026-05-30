"use client";

/**
 * WorkoutCard — a single workout row in the library list.
 *
 * Displays: sport icon, name, tags, estimated duration, template badge.
 * Interactive: hover lift + left sport-color accent border.
 */

import * as React from "react";
import { Clock, Tag, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDuration } from "@/lib/utils";
import type { WorkoutSummary } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Sport color map                                                      */
/* ------------------------------------------------------------------ */

const SPORT_COLOR: Record<Sport, string> = {
  cycling: "var(--sport-cycling)",
  running: "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  other: "var(--sport-other)",
};

const SPORT_EMOJI: Record<Sport, string> = {
  cycling: "🚴",
  running: "🏃",
  swimming: "🏊",
  strength: "🏋️",
  other: "🎯",
};

/* ------------------------------------------------------------------ */
/*  Tag pill                                                             */
/* ------------------------------------------------------------------ */

function TagPill({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "var(--text-xs)",
        color: "var(--text-secondary)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-full)",
        padding: "2px 8px",
        lineHeight: 1.6,
        display: "inline-block",
        fontWeight: 400,
      }}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  WorkoutCard                                                          */
/* ------------------------------------------------------------------ */

export interface WorkoutCardProps {
  workout: WorkoutSummary;
  onClick?: (id: string) => void;
}

export function WorkoutCard({ workout, onClick }: WorkoutCardProps) {
  const { id, name, sport, description, estimatedDuration, tags, isTemplate } = workout;
  const accentColor = SPORT_COLOR[sport] ?? SPORT_COLOR.other;
  const emoji = SPORT_EMOJI[sport] ?? "🎯";

  return (
    <Card
      variant="highlighted"
      accentColor={accentColor}
      className={onClick ? "cursor-pointer group" : ""}
      onClick={onClick ? () => onClick(id) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(id);
              }
            }
          : undefined
      }
      aria-label={`Workout: ${name}`}
      style={{
        transition: `transform var(--duration-micro) ease-out, box-shadow var(--duration-micro) ease-out`,
      }}
    >
      {/* ── Top row: icon + name + template badge + arrow ── */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: emoji icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Sport icon bubble */}
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: `${accentColor}1A`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: 22,
            }}
          >
            {emoji}
          </div>

          {/* Name + description */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="truncate font-semibold"
                style={{
                  fontSize: "var(--text-base)",
                  color: "var(--text-primary)",
                  lineHeight: 1.3,
                }}
              >
                {name}
              </h3>
              {isTemplate && (
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--color-accent)",
                    background: "rgba(139,92,246,0.12)",
                    border: "1px solid rgba(139,92,246,0.25)",
                    borderRadius: "var(--radius-full)",
                    padding: "1px 7px",
                    fontWeight: 600,
                    flexShrink: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Template
                </span>
              )}
            </div>
            {description && (
              <p
                className="truncate"
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: chevron */}
        {onClick && (
          <ChevronRight
            size={16}
            aria-hidden="true"
            style={{
              color: "var(--text-muted)",
              flexShrink: 0,
              marginTop: 4,
              transition: `transform var(--duration-micro) ease-out`,
            }}
            className="group-hover:translate-x-0.5"
          />
        )}
      </div>

      {/* ── Bottom row: duration + tags ── */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}
      >
        {estimatedDuration != null && (
          <div
            className="flex items-center gap-1"
            title="Estimated duration"
            aria-label={`Estimated duration: ${formatDuration(estimatedDuration)}`}
          >
            <Clock
              size={13}
              aria-hidden="true"
              style={{ color: "var(--text-muted)" }}
            />
            <span
              className="tabular-nums"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-primary)",
                fontWeight: 500,
              }}
            >
              {formatDuration(estimatedDuration)}
            </span>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag size={12} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
            {tags.slice(0, 4).map((tag) => (
              <TagPill key={tag} label={tag} />
            ))}
            {tags.length > 4 && (
              <span
                style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
              >
                +{tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
