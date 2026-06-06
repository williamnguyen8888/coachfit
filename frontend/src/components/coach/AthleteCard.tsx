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

const STATUS_CONFIG = {
  fresh: {
    label: "Fresh",
    color: "var(--color-success)",
    bg: "var(--color-success-8)",
    dot: "#22c55e",
  },
  optimal: {
    label: "Optimal",
    color: "var(--color-warning)",
    bg: "rgba(245, 158, 11, 0.08)",
    dot: "#f59e0b",
  },
  fatigued: {
    label: "Fatigued",
    color: "var(--color-danger)",
    bg: "var(--color-danger-8)",
    dot: "#ef4444",
  },
  nodata: {
    label: "No data",
    color: "var(--text-muted)",
    bg: "transparent",
    dot: "#5a5a6e",
  },
} as const;

const SPORT_COLORS: Record<string, string> = {
  cycling: "#3b82f6",
  running: "#22c55e",
  swimming: "#06b6d4",
  strength: "#f97316",
};

function AthleteSportDot({ sport }: { sport: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: SPORT_COLORS[sport] ?? "#6b7280",
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
      style={{
        width: "100%",
        textAlign: "left",
        background: isSelected ? "var(--bg-elevated)" : "transparent",
        border: isSelected
          ? "1px solid var(--border-default)"
          : "1px solid transparent",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
        cursor: "pointer",
        transition: "all var(--duration-micro) var(--ease-standard)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "var(--bg-surface)";
          e.currentTarget.style.border = "1px solid var(--border-subtle)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.border = "1px solid transparent";
        }
      }}
    >
      {/* Left accent bar when selected */}
      {isSelected && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: "20%",
            bottom: "20%",
            width: 3,
            borderRadius: "0 var(--radius-full) var(--radius-full) 0",
            background: "var(--color-accent)",
          }}
        />
      )}

      {/* Main row */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--radius-full)",
            background: isSelected ? "var(--color-accent-20)" : "var(--bg-elevated)",
            color: isSelected ? "var(--color-accent)" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "var(--text-xs)",
            flexShrink: 0,
            border: "2px solid transparent",
            borderColor: isSelected ? "var(--color-accent-30)" : "transparent",
            transition: "all var(--duration-micro) var(--ease-standard)",
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
            {/* Status dot */}
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: config.dot,
                flexShrink: 0,
                boxShadow:
                  status !== "nodata"
                    ? `0 0 6px ${config.dot}88`
                    : "none",
              }}
              title={config.label}
            />
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

        {/* CTL/TSB quick stats */}
        {fitness && (
          <div className="flex flex-col items-end gap-0.5 shrink-0">
            <span
              className="font-metric tabular-nums"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--color-fitness)",
                fontWeight: 600,
              }}
            >
              {Math.round(fitness.ctl)}
            </span>
            <span
              className="font-metric tabular-nums"
              style={{
                fontSize: 10,
                color:
                  fitness.tsb > 0
                    ? "var(--color-form)"
                    : "var(--color-fatigue)",
                fontWeight: 600,
              }}
            >
              {fitness.tsb > 0 ? "+" : ""}
              {Math.round(fitness.tsb)}
            </span>
          </div>
        )}
      </div>

      {/* Tags row */}
      {athlete.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {athlete.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "var(--color-accent)",
                background: "var(--color-accent-8)",
                border: "1px solid var(--color-accent-20)",
                borderRadius: "var(--radius-full)",
                padding: "1px 7px",
                letterSpacing: "0.01em",
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
