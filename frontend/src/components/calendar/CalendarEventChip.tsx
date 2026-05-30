"use client";

// src/components/calendar/CalendarEventChip.tsx
// Dispatcher component — routes to the appropriate rich card based on event type.
//
// - Workout events (planned) → WorkoutCard
// - Completed/partial events with activity → ActivityCard
// - Other events (rest, note, race) → minimal inline chip (legacy)
//
// The public interface (CalendarEventChipProps) is UNCHANGED so WeekView
// and MonthView require zero modifications.

import { useState, useRef, useCallback } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { getSportMeta, formatDuration } from "./calendarUtils";
import { CalendarEventTooltip } from "./CalendarEventTooltip";
import { WorkoutCard } from "./WorkoutCard";
import { ActivityCard } from "./ActivityCard";

// ─── Component props (unchanged public API) ──────────────────────────────────

export interface CalendarEventChipProps {
  event: CalendarEvent;
  /** Compact mode for month view cells */
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
  // Drag props
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onChipDragOver?: (e: React.DragEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  isDragging?: boolean;
  // Quick action callbacks
  onComplete?: () => void;
  onSkip?: () => void;
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function CalendarEventChip(props: CalendarEventChipProps) {
  const { event, compact } = props;

  // Tooltip state (desktop hover only — wraps all card types in week view)
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 600);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  }, []);

  // ── Route to rich card components ────────────────────────────────────────
  const isWorkout = event.eventType === "workout";
  const isStandaloneActivity = event.id.startsWith("activity-event-");
  const isCompletedWithActivity = isStandaloneActivity || event.status === "completed" || event.status === "partial";
  const isDraggable = props.draggable && !isStandaloneActivity;

  // Determine which card to render
  let card: React.ReactNode;

  if (isCompletedWithActivity) {
    // Synced activity card (ảnh 4-5)
    card = <ActivityCard {...props} draggable={isDraggable} />;
  } else if (isWorkout) {
    // Planned workout card (ảnh 1-3)
    card = <WorkoutCard {...props} draggable={isDraggable} />;
  } else {
    // Fallback: minimal chip for rest/note/race events
    card = <MinimalEventChip {...props} draggable={isDraggable} />;
  }

  // In compact mode, render without tooltip wrapper
  if (compact) return <>{card}</>;

  // In full mode, wrap with tooltip
  return (
    <div
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {card}
      {showTooltip && wrapperRef.current && (
        <CalendarEventTooltip event={event} anchorEl={wrapperRef.current} />
      )}
    </div>
  );
}

// ─── MinimalEventChip — for rest / note / race events ─────────────────────────

function MinimalEventChip({
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
}: CalendarEventChipProps) {
  const meta = getSportMeta(event.workout?.sport ?? "other", event.eventType);
  const duration = event.workout?.estimatedDuration;
  const isSkipped = event.status === "skipped";

  return (
    <div
      data-event-id={event.id}
      className="cal-chip-wrapper"
      onDragOver={onChipDragOver}
      style={{
        position: "relative",
        width: "100%",
        opacity: isDragging ? 0.3 : 1,
        transition: "opacity 150ms ease-out",
      }}
    >
      <button
        type="button"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => onClick?.(event)}
        className="cal-chip-btn"
        aria-label={`${event.title} — ${event.status}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          width: "100%",
          padding: compact ? "3px 6px 3px 8px" : "6px 8px 6px 10px",
          background: "var(--bg-elevated)",
          border: "none",
          borderLeft: `3px solid ${meta.color}`,
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
          cursor: draggable ? "grab" : "pointer",
          textAlign: "left",
          transition: "background 150ms ease-out, box-shadow 150ms ease-out",
          opacity: isSkipped ? 0.6 : 1,
          minHeight: compact ? "var(--cal-chip-height-compact)" : 40,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-input)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 1px ${meta.color}33`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        {/* Icon */}
        <span style={{ fontSize: compact ? 11 : 14, flexShrink: 0 }}>{meta.icon}</span>

        {/* Title */}
        <span
          style={{
            fontSize: compact ? "var(--text-xs)" : "var(--text-sm)",
            color: isSkipped ? "var(--text-muted)" : "var(--text-primary)",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            textDecoration: isSkipped ? "line-through" : "none",
            lineHeight: 1.3,
          }}
        >
          {event.title}
        </span>

        {/* Duration (if any) */}
        {!compact && duration && duration > 0 && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatDuration(duration)}
          </span>
        )}
      </button>
    </div>
  );
}
