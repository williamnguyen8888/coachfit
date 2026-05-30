"use client";

/**
 * WorkoutCard — a single workout card or row in the library list.
 * Supports "grid" and "list" layouts.
 *
 * Displays: sport icon, name, estimated duration, tags, and a template badge.
 */

import * as React from "react";
import { Clock, Tag, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SportIcon } from "@/components/activities/SportIcon";
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

const SPORT_GLOW: Record<Sport, string> = {
  cycling: "var(--sport-cycling-glow, rgba(59, 130, 246, 0.15))",
  running: "var(--sport-running-glow, rgba(34, 197, 94, 0.15))",
  swimming: "var(--sport-swimming-glow, rgba(6, 182, 212, 0.15))",
  strength: "var(--sport-strength-glow, rgba(249, 115, 22, 0.15))",
  other: "var(--sport-other-glow, rgba(107, 114, 128, 0.1))",
};

/* ------------------------------------------------------------------ */
/*  Tag pill                                                             */
/* ------------------------------------------------------------------ */

function TagPill({ label }: { label: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-[var(--radius-full)] border border-[rgba(255,255,255,0.02)] bg-[rgba(255,255,255,0.02)] text-[11px] sm:text-xs text-[var(--text-secondary)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)]"
      style={{
        lineHeight: 1.5,
        display: "inline-block",
        fontWeight: 400,
        whiteSpace: "nowrap",
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
  viewMode?: "grid" | "list";
  onClick?: (id: string) => void;
}

export function WorkoutCard({ workout, viewMode = "list", onClick }: WorkoutCardProps) {
  const { id, name, sport, description, estimatedDuration, tags, isTemplate } = workout;
  const [hovered, setHovered] = React.useState(false);

  const accentColor = SPORT_COLOR[sport] ?? SPORT_COLOR.other;
  const glowColor = SPORT_GLOW[sport] ?? SPORT_GLOW.other;

  const customStyle: React.CSSProperties = {
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: hovered 
      ? `0 10px 30px -5px ${glowColor}, 0 0 15px ${glowColor}` 
      : "var(--shadow-sm)",
    borderColor: hovered ? accentColor : undefined,
    transform: hovered ? "translateY(-2px)" : "none",
  };

  if (viewMode === "grid") {
    return (
      <Card
        variant="highlighted"
        accentColor={accentColor}
        className={`${onClick ? "cursor-pointer group" : ""} flex flex-col justify-between h-full`}
        onClick={onClick ? () => onClick(id) : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
        style={customStyle}
      >
        <div>
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                background: `linear-gradient(135deg, ${accentColor}2A 0%, ${accentColor}0A 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: `1px solid ${accentColor}20`,
              }}
            >
              <SportIcon sport={sport} size={22} />
            </div>
            {isTemplate && (
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-accent)",
                  background: "var(--color-accent-12)",
                  border: "1px solid var(--color-accent-25)",
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

        {/* Footer info: Duration + Tags */}
        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {estimatedDuration != null && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[var(--radius-sm)] border border-[rgba(255,255,255,0.02)] bg-[rgba(255,255,255,0.01)]"
              title="Estimated duration"
              aria-label={`Estimated duration: ${formatDuration(estimatedDuration)}`}
            >
              <Clock size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <span
                className="tabular-nums text-xs sm:text-token-sm"
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                {formatDuration(estimatedDuration)}
              </span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tags.slice(0, 2).map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
              {tags.length > 2 && (
                <span
                  style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
                >
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // List View (sleek table row)
  return (
    <Card
      variant="highlighted"
      accentColor={accentColor}
      className={`${onClick ? "cursor-pointer group" : ""} h-full`}
      onClick={onClick ? () => onClick(id) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      style={customStyle}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon + Title Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-md)",
              background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}05 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: `1px solid ${accentColor}15`,
            }}
          >
            <SportIcon sport={sport} size={18} />
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
                    fontSize: "var(--text-xs)",
                    color: "var(--color-accent)",
                    background: "var(--color-accent-12)",
                    border: "1px solid var(--color-accent-25)",
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
                className="truncate hidden md:block flex-1"
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                }}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Duration + Tags + Arrow */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
          {estimatedDuration != null && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[var(--radius-sm)] border border-[rgba(255,255,255,0.02)] bg-[rgba(255,255,255,0.01)]"
              title="Estimated duration"
              aria-label={`Estimated duration: ${formatDuration(estimatedDuration)}`}
            >
              <Clock size={13} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <span
                className="tabular-nums text-xs sm:text-token-sm"
                style={{
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                {formatDuration(estimatedDuration)}
              </span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <Tag size={12} aria-hidden="true" style={{ color: "var(--text-muted)" }} className="hidden sm:block" />
              {tags.slice(0, 3).map((tag) => (
                <TagPill key={tag} label={tag} />
              ))}
              {tags.length > 3 && (
                <span
                  style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
                >
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          {onClick && (
            <ChevronRight
              size={16}
              aria-hidden="true"
              style={{
                color: "var(--text-muted)",
                flexShrink: 0,
                transition: `transform var(--duration-micro) ease-out`,
              }}
              className="group-hover:translate-x-0.5 hidden sm:block"
            />
          )}
        </div>
      </div>
    </Card>
  );
}
