"use client";

// src/components/coach/AthleteCard.tsx
// Single athlete card in the roster panel.

import { type RosterAthlete, getAthleteStatus } from "@/lib/types/coach";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "@/lib/utils/time";

interface AthleteCardProps {
  athlete: RosterAthlete;
  isSelected: boolean;
  onClick: () => void;
}

// Status config — color only on the text/value, no bg tint
const STATUS_CONFIG = {
  fresh: {
    label: "Fresh",
    color: "var(--color-success)",
  },
  optimal: {
    label: "Optimal",
    color: "var(--color-warning)",
  },
  fatigued: {
    label: "Fatigued",
    color: "var(--color-danger)",
  },
  nodata: {
    label: "—",
    color: "var(--text-muted)",
  },
} as const;

// Sport colors — all token-based
const SPORT_COLORS: Record<string, string> = {
  cycling: "var(--sport-cycling)",
  running: "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  hiking: "var(--sport-hiking)",
  walking: "var(--sport-walking)",
};

function AthleteSportDot({ sport }: { sport: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: SPORT_COLORS[sport] ?? "var(--sport-other)",
        flexShrink: 0,
      }}
    />
  );
}

export function AthleteCard({ athlete, isSelected, onClick }: AthleteCardProps) {
  const status = getAthleteStatus(athlete.fitness?.tsb);
  const config = STATUS_CONFIG[status];
  const fitness = athlete.fitness;

  const displayName = athlete.nickname ?? athlete.name;
  const initials = athlete.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const lastActivityLabel = athlete.lastActivity
    ? (() => {
        try {
          return formatDistanceToNow(new Date(athlete.lastActivity.date), {
            addSuffix: true,
          });
        } catch {
          return athlete.lastActivity.date;
        }
      })()
    : null;

  return (
    <button
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "w-full text-left rounded-[var(--radius-md)] px-4 py-3 cursor-pointer relative overflow-hidden",
        "transition-colors duration-150",
        isSelected
          ? "bg-[var(--bg-elevated)] border border-[var(--border-default)]"
          : "bg-transparent border border-transparent hover:bg-[var(--bg-surface)] hover:border-[var(--border-subtle)]"
      )}
    >
      {/* Active left accent bar */}
      {isSelected && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "22%",
            bottom: "22%",
            width: 2,
            borderRadius: "0 var(--radius-full) var(--radius-full) 0",
            background: "var(--color-accent)",
          }}
        />
      )}

      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Avatar — neutral, initials only */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-full)",
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            border: `1px solid ${isSelected ? "var(--border-default)" : "var(--border-subtle)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: "var(--text-xs)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        {/* Name & status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold truncate"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-primary)",
              }}
            >
              {displayName}
            </span>
            {/* Status — text label, no glow dot */}
            <span
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: config.color,
                flexShrink: 0,
              }}
            >
              {config.label}
            </span>
          </div>

          {/* Sports & last activity */}
          <div
            className="flex items-center gap-2 mt-0.5"
            style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
          >
            <div className="flex items-center gap-1">
              {athlete.sports.slice(0, 3).map((sport) => (
                <AthleteSportDot key={sport} sport={sport} />
              ))}
            </div>
            {lastActivityLabel && (
              <span className="truncate">{lastActivityLabel}</span>
            )}
          </div>
        </div>

        {/* CTL / TSB numbers — right side */}
        {fitness && (
          <div className="flex flex-col items-end gap-0 shrink-0">
            <span
              className="font-metric tabular-nums"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-fitness)",
                fontWeight: 700,
              }}
            >
              {Math.round(fitness.ctl)}
            </span>
            <span
              className="font-metric tabular-nums"
              style={{
                fontSize: "11px",
                color:
                  fitness.tsb > 0
                    ? "var(--color-form)"
                    : "var(--color-warning)",
                fontWeight: 600,
              }}
            >
              {fitness.tsb > 0 ? "+" : ""}
              {Math.round(fitness.tsb)}
            </span>
          </div>
        )}
      </div>

      {/* Tags — minimal, no accent bg */}
      {athlete.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {athlete.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-muted)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-full)",
                padding: "1px 7px",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
