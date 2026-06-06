"use client";

/**
 * WorkoutCard — a single workout card or row in the library list.
 * Supports "grid" and "list" layouts.
 */

import * as React from "react";
import { Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
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

/* ─── Tag pill — neutral, minimal ───────────────────────────────────── */

function TagPill({ label }: { label: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "var(--radius-full)",
        fontSize: "11px",
        fontWeight: 500,
        color: "var(--text-muted)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

/* ─── WorkoutCard ────────────────────────────────────────────────────── */

export interface WorkoutCardProps {
  workout: WorkoutSummary;
  viewMode?: "grid" | "list";
  onClick?: (id: string) => void;
}

export function WorkoutCard({ workout, viewMode = "list", onClick }: WorkoutCardProps) {
  const { id, name, sport, description, estimatedDuration, tags, isTemplate } = workout;
  const accentColor = SPORT_COLOR[sport] ?? SPORT_COLOR.other;

  // Hover: border highlight only — no glow, no translate
  const cardStyle: React.CSSProperties = {
    transition: `border-color var(--duration-micro) var(--ease-standard),
                 background var(--duration-micro) var(--ease-standard)`,
  };

  if (viewMode === "grid") {
    return (
      <Card
        variant="highlighted"
        accentColor={accentColor}
        className={`${onClick ? "cursor-pointer interactive-card group" : ""} flex flex-col justify-between h-full`}
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
        style={cardStyle}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "var(--bg-elevated)",
                border: `2px solid ${accentColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: accentColor,
              }}
            >
              <SportIcon sport={sport} size={20} />
            </div>

            {isTemplate && (
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-full)",
                  padding: "1px 8px",
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Template
              </span>
            )}
          </div>

          {/* Title & Description */}
          <div className="mb-4">
            <h3
              className="font-semibold line-clamp-2"
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {name}
            </h3>
            {description && (
              <p
                className="line-clamp-2"
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex flex-wrap items-center gap-2 pt-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {estimatedDuration != null && (
            <div
              className="flex items-center gap-1.5"
              aria-label={`Estimated duration: ${formatDuration(estimatedDuration)}`}
            >
              <Clock size={12} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <span
                className="tabular-nums"
                style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}
              >
                {formatDuration(estimatedDuration)}
              </span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
              {tags.length > 2 && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // List View
  return (
    <Card
      variant="highlighted"
      accentColor={accentColor}
      className={`${onClick ? "cursor-pointer interactive-card group" : ""} h-full`}
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
      style={cardStyle}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "var(--bg-elevated)",
              border: `2px solid ${accentColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: accentColor,
            }}
          >
            <SportIcon sport={sport} size={17} />
          </div>
          <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <h3
                className="truncate font-semibold sm:max-w-[240px] md:max-w-[320px]"
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
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-full)",
                    padding: "1px 7px",
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  Template
                </span>
              )}
            </div>
            {description && (
              <p
                className="truncate hidden md:block flex-1"
                style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 shrink-0">
          {estimatedDuration != null && (
            <div
              className="flex items-center gap-1.5"
              aria-label={`Estimated duration: ${formatDuration(estimatedDuration)}`}
            >
              <Clock size={12} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <span
                className="tabular-nums"
                style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}
              >
                {formatDuration(estimatedDuration)}
              </span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
              {tags.length > 3 && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          {onClick && (
            <ChevronRight
              size={15}
              aria-hidden="true"
              style={{ color: "var(--text-muted)", flexShrink: 0 }}
              className="hidden sm:block group-hover:translate-x-0.5 transition-transform"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
