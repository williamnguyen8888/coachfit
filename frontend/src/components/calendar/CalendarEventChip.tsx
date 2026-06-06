"use client";

// src/components/calendar/CalendarEventChip.tsx
// Dispatcher component — routes to the appropriate rich card based on event type.
//
// - Workout events (planned) → WorkoutCard
// - Completed/partial events with activity → ActivityCard
// - Other events (rest, note, race) → MinimalEventChip

import { useState, useRef, useCallback } from "react";
import { Bed, Flag, FileText, Heart, Activity, Moon } from "lucide-react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { getSportMeta, formatDuration } from "./calendarUtils";
import { CalendarEventTooltip } from "./CalendarEventTooltip";
import { WorkoutCard } from "./WorkoutCard";
import { ActivityCard } from "./ActivityCard";
import type { DailyHealthSummary, SleepRecord } from "@/lib/services/health";

// ─── Component props ──────────────────────────────────────────────────────────

export interface CalendarEventChipProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
  onAnalysisClick?: (eventId: string) => void;
  onLinkActivity?: (event: CalendarEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onChipDragOver?: (e: React.DragEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  isDragging?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
  sleep?: SleepRecord;
  health?: DailyHealthSummary;
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function CalendarEventChip(props: CalendarEventChipProps) {
  const { event, compact } = props;

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

  const isWorkout = event.eventType === "workout";
  const isStandaloneActivity =
    event.id.startsWith("activity-event-") ||
    (event.activity !== null && event.workout === null);
  const isCompletedWithActivity =
    isStandaloneActivity ||
    event.status === "completed" ||
    event.status === "partial";
  const isDraggable = props.draggable && !isStandaloneActivity;

  let card: React.ReactNode;

  if (isCompletedWithActivity) {
    card = <ActivityCard {...props} draggable={isDraggable} />;
  } else if (isWorkout) {
    card = (
      <WorkoutCard {...props} draggable={isDraggable} onLinkActivity={props.onLinkActivity} />
    );
  } else {
    card = <MinimalEventChip {...props} draggable={isDraggable} />;
  }

  if (compact) return <>{card}</>;

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

function MinimalEventChip(props: CalendarEventChipProps) {
  const {
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
    sleep,
    health,
  } = props;

  const isRest = event.eventType === "rest";
  const isRace = event.eventType === "race";
  const isNote = event.eventType === "note";
  const isSkipped = event.status === "skipped";

  // Border-left color and hover bg — all token-based
  let borderLeftColor = "var(--text-muted)";
  let bgBase = "var(--bg-elevated)";
  let bgHover = "var(--bg-input)";
  let borderColor = "var(--border-subtle)";

  if (isRest) {
    borderLeftColor = "var(--color-form)";   // TSB green = recovery
    bgBase = "var(--bg-elevated)";
    bgHover = "var(--bg-input)";
    borderColor = "var(--border-subtle)";
  } else if (isRace) {
    borderLeftColor = "var(--color-danger)";
    bgBase = "var(--bg-elevated)";
    bgHover = "var(--bg-input)";
    borderColor = "var(--border-default)";
  } else if (isNote) {
    borderLeftColor = "var(--color-accent)";
    bgBase = "var(--bg-elevated)";
    bgHover = "var(--bg-input)";
    borderColor = "var(--border-subtle)";
  }

  // ── Rest / recovery card with health data ─────────────────────────────────
  if (isRest && !compact && (sleep || health)) {
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
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "8px 10px",
            background: bgBase,
            border: `1px solid ${borderColor}`,
            borderLeft: `3px solid ${borderLeftColor}`,
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            cursor: draggable ? "grab" : "pointer",
            textAlign: "left",
            transition: "background 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = bgHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = bgBase;
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Moon size={12} style={{ color: "var(--color-form)", flexShrink: 0 }} />
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-secondary)",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}>
              Rest &amp; Recovery
            </span>
          </div>

          {/* Sleep data — text only, no emoji */}
          {sleep && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              {sleep.score !== null && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: sleep.score >= 80
                    ? "var(--color-success)"
                    : sleep.score >= 60
                    ? "var(--color-warning)"
                    : "var(--color-danger)",
                }}>
                  Sleep {sleep.score}
                </span>
              )}
              {sleep.totalMinutes !== null && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {(sleep.totalMinutes / 60).toFixed(1)}h
                </span>
              )}
            </div>
          )}

          {/* Health metrics — Lucide icons, no emoji */}
          {health && (health.restingHr || health.hrv) && (
            <div style={{
              display: "flex",
              gap: "4px 10px",
              fontSize: 10,
              color: "var(--text-muted)",
              flexWrap: "wrap",
            }}>
              {health.restingHr && (
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Heart size={10} style={{ color: "var(--color-danger)" }} />
                  {health.restingHr} bpm
                </span>
              )}
              {health.hrv && (
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Activity size={10} style={{ color: "var(--color-accent)" }} />
                  HRV {Math.round(health.hrv)}ms
                </span>
              )}
            </div>
          )}
        </button>
      </div>
    );
  }

  // ── Race card ──────────────────────────────────────────────────────────────
  if (isRace && !compact) {
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
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "8px 10px",
            background: bgBase,
            border: `1.5px solid ${borderColor}`,
            borderLeft: `3px solid ${borderLeftColor}`,
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            cursor: draggable ? "grab" : "pointer",
            textAlign: "left",
            transition: "background 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = bgHover;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = bgBase;
          }}
        >
          {/* Header — Lucide flag icon, not emoji */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Flag size={12} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--color-danger)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              Race Day
            </span>
            {/* Pulsing dot — small, not animated (accessibility) */}
            <span style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-danger)",
              flexShrink: 0,
              marginLeft: "auto",
            }} />
          </div>

          {/* Title */}
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 3,
            display: "block",
          }}>
            {event.title}
          </span>

          {event.notes && (
            <span style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontStyle: "italic",
              display: "block",
            }}>
              {event.notes}
            </span>
          )}
        </button>
      </div>
    );
  }

  // ── Standard chip (rest compact / note / default) ──────────────────────────
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
          background: bgBase,
          border: `1px solid ${borderColor}`,
          borderLeft: `3px solid ${borderLeftColor}`,
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
          cursor: draggable ? "grab" : "pointer",
          textAlign: "left",
          transition: "background 150ms ease-out",
          opacity: isSkipped ? 0.55 : 1,
          minHeight: compact ? "var(--cal-chip-height-compact)" : 40,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = bgHover;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = bgBase;
        }}
      >
        {/* Icon — Lucide, not emoji */}
        <span style={{ flexShrink: 0, color: borderLeftColor, display: "flex" }}>
          {isRest ? (
            <Bed size={compact ? 10 : 13} />
          ) : isRace ? (
            <Flag size={compact ? 10 : 13} />
          ) : (
            <FileText size={compact ? 10 : 13} />
          )}
        </span>

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
            fontStyle: isNote ? "italic" : "normal",
          }}
        >
          {event.title}
        </span>

        {/* Note preview */}
        {!compact && isNote && event.notes && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontStyle: "italic",
              marginLeft: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "45%",
            }}
          >
            {event.notes}
          </span>
        )}
      </button>
    </div>
  );
}
