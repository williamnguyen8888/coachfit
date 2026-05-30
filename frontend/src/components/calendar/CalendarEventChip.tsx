"use client";

// src/components/calendar/CalendarEventChip.tsx
// Visual chip representing a single calendar event on the calendar grid.
// Design spec: docs/09-design-system.md § Calendar

import type { CalendarEvent } from "@/lib/types/calendar";

// ─── Sport / status helpers ───────────────────────────────────────────────────

const SPORT_COLORS: Record<string, string> = {
  cycling: "var(--sport-cycling)",
  running: "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  other: "var(--sport-other)",
};

const SPORT_ICONS: Record<string, string> = {
  cycling: "🚴",
  running: "🏃",
  swimming: "🏊",
  strength: "💪",
  other: "🏋️",
};

function getSportColor(event: CalendarEvent): string {
  if (event.eventType === "rest") return "var(--text-muted)";
  if (event.eventType === "race") return "var(--color-danger)";
  const sport = event.workout?.sport;
  return sport ? (SPORT_COLORS[sport] ?? "var(--color-accent)") : "var(--color-accent)";
}

function getSportIcon(event: CalendarEvent): string {
  if (event.eventType === "rest") return "😴";
  if (event.eventType === "race") return "🏁";
  const sport = event.workout?.sport;
  return sport ? (SPORT_ICONS[sport] ?? "🏋️") : "🏋️";
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CalendarEvent["status"] }) {
  if (status === "completed")
    return (
      <span
        style={{
          fontSize: "10px",
          color: "var(--color-success)",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ✓
      </span>
    );
  if (status === "partial")
    return (
      <span
        style={{
          fontSize: "10px",
          color: "var(--color-warning)",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ⚡
      </span>
    );
  if (status === "skipped")
    return (
      <span
        style={{
          fontSize: "10px",
          color: "var(--color-danger)",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        —
      </span>
    );
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface CalendarEventChipProps {
  event: CalendarEvent;
  /** Compact mode for month view cells (tighter layout) */
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
}

export function CalendarEventChip({
  event,
  compact = false,
  onClick,
}: CalendarEventChipProps) {
  const color = getSportColor(event);
  const icon = getSportIcon(event);
  const isSkipped = event.status === "skipped";
  const isCompleted = event.status === "completed";
  const duration = event.workout?.estimatedDuration;

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1)",
        width: "100%",
        padding: compact ? "3px var(--space-2)" : "var(--space-1) var(--space-2)",
        background: isCompleted
          ? "rgba(34,197,94,0.08)"
          : isSkipped
            ? "rgba(239,68,68,0.06)"
            : "var(--bg-elevated)",
        border: "none",
        borderLeft: `3px solid ${color}`,
        borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
        cursor: "pointer",
        textAlign: "left",
        transition: "background var(--duration-micro) ease-out, transform var(--duration-micro) ease-out",
        opacity: isSkipped ? 0.6 : 1,
        minHeight: 28,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isCompleted
          ? "rgba(34,197,94,0.14)"
          : isSkipped
            ? "rgba(239,68,68,0.10)"
            : "var(--bg-input)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateX(1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isCompleted
          ? "rgba(34,197,94,0.08)"
          : isSkipped
            ? "rgba(239,68,68,0.06)"
            : "var(--bg-elevated)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateX(0)";
      }}
      aria-label={`${event.title} — ${event.status}`}
    >
      {/* Sport icon */}
      {!compact && (
        <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
      )}

      {/* Title */}
      <span
        style={{
          fontSize: compact ? "var(--text-xs)" : "var(--text-sm)",
          color: "var(--text-primary)",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          textDecoration: isSkipped ? "line-through" : "none",
        }}
      >
        {event.title}
      </span>

      {/* Duration (week view only) */}
      {!compact && duration && duration > 0 && (
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            flexShrink: 0,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {formatDuration(duration)}
        </span>
      )}

      {/* Status badge */}
      <StatusBadge status={event.status} />
    </button>
  );
}
