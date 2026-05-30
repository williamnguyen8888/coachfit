"use client";

// src/components/calendar/CalendarEventChip.tsx
// Visual chip representing a single calendar event on the calendar grid.
// Design spec: docs/09-design-system.md § Calendar
//
// Now supports:
//   - Drag handle (⠿) — visible on hover (desktop) / always on mobile
//   - Inline quick actions: ✓ Complete, × Skip (hover desktop, persistent mobile)
//   - data-event-id attribute for touch-drag restoration
//   - data-drop-date is set by the parent container (DayColumn / DayCell)

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
  // ── Drag props (passed in by WeekView / MonthView) ──────────────────────────
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  /** Called when the finger/pointer moves over this chip for reorder hints */
  onChipDragOver?: (e: React.DragEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  /** Visual: dim this chip while it's being dragged */
  isDragging?: boolean;
  // ── Quick action callbacks ──────────────────────────────────────────────────
  onComplete?: () => void;
  onSkip?: () => void;
}

export function CalendarEventChip({
  event,
  compact = false,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  onChipDragOver,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isDragging = false,
  onComplete,
  onSkip,
}: CalendarEventChipProps) {
  const color = getSportColor(event);
  const icon = getSportIcon(event);
  const isSkipped = event.status === "skipped";
  const isCompleted = event.status === "completed";
  const isPlanned = event.status === "planned";
  const isPartial = event.status === "partial";
  const duration = event.workout?.estimatedDuration;

  const showCompleteAction = onComplete && (isPlanned || isPartial);
  const showSkipAction = onSkip && (isPlanned || isPartial);

  return (
    <div
      data-event-id={event.id}
      className="cal-chip-wrapper"
      style={{
        position: "relative",
        width: "100%",
        opacity: isDragging ? 0.35 : 1,
        transition: "opacity var(--duration-micro) ease-out",
      }}
      onDragOver={onChipDragOver}
    >
      {/* ── Drag handle (desktop: hover only / mobile: always) ── */}
      {draggable && (
        <div
          className="cal-chip-handle"
          style={{
            position: "absolute",
            left: -14,
            top: 0,
            bottom: 0,
            width: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "grab",
            color: "var(--text-muted)",
            fontSize: 10,
            userSelect: "none",
            // Shown via CSS class hover logic
          }}
        >
          ⠿
        </div>
      )}

      {/* ── Main chip button ── */}
      <button
        type="button"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          // Don't open modal if a quick-action was the target
          if ((e.target as HTMLElement).closest(".cal-quick-action")) return;
          onClick?.(event);
        }}
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
          cursor: draggable ? "grab" : "pointer",
          textAlign: "left",
          transition:
            "background var(--duration-micro) ease-out, transform var(--duration-micro) ease-out",
          opacity: isSkipped ? 0.6 : 1,
          // Design system: min touch target 44px on mobile
          minHeight: compact ? 28 : 32,
        }}
        className="cal-chip-btn"
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

        {/* ── Inline quick actions ── */}
        {(showCompleteAction || showSkipAction) && (
          <div
            className="cal-chip-actions"
            style={{
              display: "flex",
              gap: 2,
              flexShrink: 0,
              alignItems: "center",
            }}
          >
            {showCompleteAction && (
              <button
                type="button"
                className="cal-quick-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onComplete?.();
                }}
                aria-label="Mark complete"
                title="Mark complete"
                style={{
                  width: 22,
                  height: 22,
                  minWidth: 22,
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-success)",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: "background var(--duration-micro) ease-out",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(34,197,94,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(34,197,94,0.12)";
                }}
              >
                ✓
              </button>
            )}

            {showSkipAction && (
              <button
                type="button"
                className="cal-quick-action"
                onClick={(e) => {
                  e.stopPropagation();
                  onSkip?.();
                }}
                aria-label="Mark skipped"
                title="Mark skipped"
                style={{
                  width: 22,
                  height: 22,
                  minWidth: 22,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-danger)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: "background var(--duration-micro) ease-out",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(239,68,68,0.18)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(239,68,68,0.08)";
                }}
              >
                ×
              </button>
            )}
          </div>
        )}
      </button>

      {/* ── Scoped CSS ── */}
      <style>{`
        /* Desktop: hide drag handle and quick actions until hover */
        @media (hover: hover) {
          .cal-chip-handle { opacity: 0; transition: opacity 150ms ease-out; }
          .cal-chip-wrapper:hover .cal-chip-handle { opacity: 1; }
          .cal-chip-actions { opacity: 0; transition: opacity 150ms ease-out; }
          .cal-chip-wrapper:hover .cal-chip-actions { opacity: 1; }
        }
        /* Mobile: drag handle and actions always visible but compact */
        @media (hover: none) {
          .cal-chip-handle { opacity: 0.5; }
          .cal-chip-actions { opacity: 1; }
          .cal-chip-btn { min-height: 44px !important; }
        }
      `}</style>
    </div>
  );
}
