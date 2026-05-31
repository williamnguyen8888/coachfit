"use client";

// src/components/calendar/CalendarEventChip.tsx
// Dispatcher component — routes to the appropriate rich card based on event type.
//
// - Workout events (planned) → WorkoutCard
// - Completed/partial events with activity → ActivityCard
// - Other events (rest, note, race) → minimal inline chip (legacy)

import { useState, useRef, useCallback } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { getSportMeta, formatDuration } from "./calendarUtils";
import { CalendarEventTooltip } from "./CalendarEventTooltip";
import { WorkoutCard } from "./WorkoutCard";
import { ActivityCard } from "./ActivityCard";
import type { DailyHealthSummary, SleepRecord } from "@/lib/services/health";

// ─── Component props ─────────────────────────────────────────────────────────

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
  // Sleep / Health integration
  sleep?: SleepRecord;
  health?: DailyHealthSummary;
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
    card = <ActivityCard {...props} draggable={isDraggable} />;
  } else if (isWorkout) {
    card = <WorkoutCard {...props} draggable={isDraggable} />;
  } else {
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

  // Customize aesthetics based on subtype
  let bg = "var(--bg-elevated)";
  let border = "none";
  let borderLeft = "3px solid var(--text-muted)";
  let shadow = "none";
  let hoverBg = "var(--bg-input)";

  if (isRest) {
    borderLeft = "3px solid #10b981"; // Emerald green for recovery
    bg = "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(8, 145, 178, 0.06) 100%)";
    border = "1px solid rgba(16, 185, 129, 0.15)";
    shadow = "0 2px 10px rgba(16, 185, 129, 0.04)";
    hoverBg = "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(8, 145, 178, 0.12) 100%)";
  } else if (isRace) {
    borderLeft = "3px solid #ef4444"; // Red for race
    bg = "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)";
    border = "1.5px solid rgba(239, 68, 68, 0.3)";
    shadow = "0 4px 14px rgba(239, 68, 68, 0.15)";
    hoverBg = "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)";
  } else if (isNote) {
    borderLeft = "3px solid #8b5cf6"; // Violet for notes
    bg = "linear-gradient(135deg, rgba(139, 92, 246, 0.03) 0%, rgba(244, 63, 94, 0.03) 100%)";
    border = "1px solid rgba(139, 92, 246, 0.12)";
    shadow = "none";
    hoverBg = "var(--bg-input)";
  }

  // ── Render rest/recovery widget (when data is available in week view) ─────
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
            background: bg,
            border: border,
            borderLeft: borderLeft,
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            cursor: draggable ? "grab" : "pointer",
            textAlign: "left",
            boxShadow: shadow,
            transition: "all 150ms ease-out",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = bg;
            (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow;
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", marginBottom: 6 }}>
            <span style={{ fontSize: 13 }}>😴</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981", letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Rest & Recovery
            </span>
          </div>

          {/* Sleep Score pill */}
          {sleep && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              {sleep.score !== null && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    padding: "1px 5px",
                    borderRadius: 4,
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#10b981",
                    fontSize: 9,
                    fontWeight: 700,
                  }}
                >
                  <span>★</span>
                  <span>{sleep.score} Sleep</span>
                </div>
              )}
              {sleep.totalMinutes !== null && (
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)" }}>
                  {(sleep.totalMinutes / 60).toFixed(1)} hrs
                </span>
              )}
            </div>
          )}

          {/* Health metrics row */}
          {health && (health.restingHr || health.hrv) && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 8px",
                fontSize: 10,
                color: "var(--text-muted)",
                fontWeight: 600,
              }}
            >
              {health.restingHr && <span>❤️ {health.restingHr} HR</span>}
              {health.hrv && <span>⚡ {Math.round(health.hrv)} HRV</span>}
            </div>
          )}
        </button>
      </div>
    );
  }

  // ── Render race details card (in week view) ──────────────────────────────
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
            background: bg,
            border: border,
            borderLeft: borderLeft,
            borderRadius: "0 var(--radius-md) var(--radius-md) 0",
            cursor: draggable ? "grab" : "pointer",
            textAlign: "left",
            boxShadow: shadow,
            transition: "all 150ms ease-out",
            position: "relative",
            overflow: "hidden",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(239, 68, 68, 0.22)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = bg;
            (e.currentTarget as HTMLButtonElement).style.boxShadow = shadow;
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", marginBottom: 4 }}>
            <span style={{ fontSize: 13 }}>🏁</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              RACE DAY
            </span>
            {/* Pulsing Dot */}
            <span style={{ display: "flex", height: 6, width: 6, position: "relative", marginLeft: "auto" }}>
              <span style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", position: "absolute", inlineSize: "100%", blockSize: "100%", borderRadius: "50%", background: "#ef4444", opacity: 0.75 }}></span>
              <span style={{ position: "relative", borderRadius: "50%", height: 6, width: 6, background: "#ef4444" }}></span>
            </span>
          </div>

          {/* Title */}
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4, display: "block" }}>
            {event.title}
          </span>

          {/* Race details or notes preview */}
          {event.notes && (
            <span style={{ fontSize: 10, color: "var(--text-secondary)", fontStyle: "italic", display: "block" }}>
              {event.notes}
            </span>
          )}
        </button>
      </div>
    );
  }

  // ── Render standard / compact mode ─────────────────────────────────────────
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
          background: bg,
          border: border,
          borderLeft: borderLeft,
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
          cursor: draggable ? "grab" : "pointer",
          textAlign: "left",
          transition: "background 150ms ease-out, box-shadow 150ms ease-out",
          opacity: isSkipped ? 0.6 : 1,
          minHeight: compact ? "var(--cal-chip-height-compact)" : 40,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
          (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 8px rgba(0,0,0,0.05)`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = bg;
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
        }}
      >
        {/* Icon */}
        <span style={{ fontSize: compact ? 11 : 14, flexShrink: 0 }}>
          {isRest ? "😴" : isRace ? "🏁" : "📝"}
        </span>

        {/* Title */}
        <span
          style={{
            fontSize: compact ? "var(--text-xs)" : "var(--text-sm)",
            color: isSkipped ? "var(--text-muted)" : "var(--text-primary)",
            fontWeight: 600,
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

        {/* Notes preview in Note mode (when not compact) */}
        {!compact && isNote && event.notes && (
          <span
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              fontStyle: "italic",
              marginLeft: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "50%",
            }}
          >
            {event.notes}
          </span>
        )}
      </button>
    </div>
  );
}
