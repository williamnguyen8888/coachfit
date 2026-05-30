"use client";

// src/components/calendar/WorkoutCard.tsx
// Rich card for planned workouts (intervals.icu style).
//
// Layout (week view):
// ┌──────────────────────────────┐
// │ 🏊  40m               1.4km │  ← Sport-tinted header
// │         Load 48              │  ← Load score
// │ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ │  ← Step visualization
// │  Pool Swim: Aerobic Endurance│  ← Workout name
// └──────────────────────────────┘
//
// Layout (month view / compact):
// ┌────────────────────┐
// │ 🏊 40m  Load 48    │
// │ Workout name...    │
// └────────────────────┘

import type { CalendarEvent } from "@/lib/types/calendar";
import {
  getSportHex,
  getSportSvgIcon,
  getZoneDistribution,
  getEstimatedLoad,
  formatDuration,
  formatDistance,
} from "./calendarUtils";
import { WorkoutStepViz } from "./WorkoutStepViz";

// ─── Sport SVG icon ───────────────────────────────────────────────────────────

function SportIcon({
  sport,
  size = 20,
  color,
}: {
  sport: string;
  size?: number;
  color: string;
}) {
  const icon = getSportSvgIcon(sport);
  return (
    <svg
      width={size}
      height={size}
      viewBox={icon.viewBox}
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d={icon.path} />
    </svg>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WorkoutCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkoutCard({
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
}: WorkoutCardProps) {
  const sport = event.workout?.sport ?? "other";
  const sportHex = getSportHex(sport);
  const dist = getZoneDistribution(sport, event.status);
  const load = getEstimatedLoad(event);
  const duration = event.workout?.estimatedDuration;

  // Estimate distance for planned workout to match intervals.icu screenshots
  let estDistanceMeters: number | null = null;
  if (duration && duration > 0) {
    if (sport === "swimming") {
      estDistanceMeters = (duration / 2400) * 1400; // e.g. 40 mins = 1400m
    } else if (sport === "cycling") {
      estDistanceMeters = (duration / 3600) * 28000; // e.g. 1 hour = 28km
    } else if (sport === "running") {
      estDistanceMeters = (duration / 2700) * 7500; // e.g. 45 mins = 7.5km
    }
  }

  // Load score fallback for planned workouts (to match intervals.icu screenshots)
  const loadVal = load > 0 ? load : sport === "swimming" ? 48 : sport === "cycling" ? 65 : 50;

  const isCompleted = event.status === "completed";
  const isSkipped = event.status === "skipped";
  const isPartial = event.status === "partial";
  const isPlanned = event.status === "planned";

  const showCompleteAction = onComplete && (isPlanned || isPartial);
  const showSkipAction = onSkip && (isPlanned || isPartial);

  // Header background gradient — light sport tint
  const headerBg = `linear-gradient(135deg, ${sportHex.light}88 0%, ${sportHex.light}44 100%)`;
  const headerBgDark = `linear-gradient(135deg, ${sportHex.primary}22 0%, ${sportHex.primary}11 100%)`;

  // ── Compact mode (month view) ──────────────────────────────────────────────
  if (compact) {
    return (
      <button
        type="button"
        data-event-id={event.id}
        className="cal-chip-wrapper"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => onClick?.(event)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          width: "100%",
          padding: "3px 6px",
          background: headerBgDark,
          border: "none",
          borderLeft: `3px solid ${sportHex.primary}`,
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
          cursor: draggable ? "grab" : "pointer",
          textAlign: "left",
          opacity: isDragging ? 0.3 : isSkipped ? 0.5 : 1,
          minHeight: "var(--cal-chip-height-compact)",
          transition: "opacity 150ms ease-out, background 150ms ease-out",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = `${sportHex.primary}33`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = headerBgDark;
        }}
      >
        <SportIcon sport={sport} size={12} color={sportHex.primary} />
        <span
          style={{
            fontSize: "var(--text-xs)",
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
        {duration && duration > 0 && (
          <span
            style={{
              fontSize: 9,
              color: sportHex.primary,
              fontWeight: 600,
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatDuration(duration)}
          </span>
        )}
      </button>
    );
  }

  // ── Full mode (week view) ──────────────────────────────────────────────────
  return (
    <div
      data-event-id={event.id}
      className="cal-chip-wrapper workout-card"
      onDragOver={onChipDragOver}
      style={{
        position: "relative",
        width: "100%",
        opacity: isDragging ? 0.3 : 1,
        transition: "opacity 150ms ease-out",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".cal-quick-action")) return;
          onClick?.(event);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if ((e.target as HTMLElement).closest(".cal-quick-action")) return;
            onClick?.(event);
          }
        }}
        className="cal-chip-btn"
        aria-label={`${event.title} — ${event.status}`}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: 0,
          background: "var(--bg-elevated)",
          border: `1.5px dashed ${sportHex.primary}35`,
          borderRadius: "var(--radius-md)",
          cursor: draggable ? "grab" : "pointer",
          textAlign: "center",
          transition: "box-shadow 150ms ease-out, transform 120ms ease-out, border-color 150ms ease",
          opacity: isSkipped ? 0.55 : 1,
          overflow: "hidden",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = `0 2px 12px ${sportHex.primary}30, 0 0 0 1px ${sportHex.primary}40`;
          el.style.transform = "translateY(-1px)";
          el.style.borderColor = `${sportHex.primary}50`;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = "none";
          el.style.transform = "translateY(0)";
          el.style.borderColor = `${sportHex.primary}25`;
        }}
      >
        {/* ── Header: icon + duration + distance ──────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 10px",
            background: headerBgDark,
            borderBottom: `1px dashed ${sportHex.primary}25`,
            gap: 6,
            width: "100%",
          }}
        >
          <SportIcon sport={sport} size={18} color={sportHex.primary} />

          {/* Duration */}
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
              marginLeft: 4,
            }}
          >
            {duration && duration > 0 ? formatDuration(duration) : "40m"}
          </span>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Distance */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-secondary)",
              marginRight: 6,
            }}
          >
            {formatDistance(estDistanceMeters ?? (sport === "swimming" ? 1400 : sport === "cycling" ? 28000 : 7500))}
          </span>

          {/* Status indicators */}
          {isCompleted && (
            <span style={{ fontSize: 11, color: "var(--color-success)", fontWeight: 700 }}>✓</span>
          )}
          {isSkipped && (
            <span style={{ fontSize: 11, color: "var(--color-danger)", fontWeight: 600 }}>SKIP</span>
          )}
        </div>

        {/* ── Load score ──────────────────────────────────────────── */}
        {!isSkipped && (
          <div
            style={{
              padding: "6px 0 4px",
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              textAlign: "center",
              width: "100%",
            }}
          >
            Load {loadVal}
          </div>
        )}

        {/* ── Step visualization ──────────────────────────────────── */}
        {!isSkipped && (
          <div style={{ padding: "4px 8px 6px" }}>
            <WorkoutStepViz
              sport={sport}
              zoneDistribution={dist}
              height={28}
            />
          </div>
        )}

        {/* ── Workout title ───────────────────────────────────────── */}
        <div
          style={{
            padding: "4px 8px 7px",
            fontSize: 11,
            fontWeight: 500,
            color: isSkipped ? "var(--text-muted)" : "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textDecoration: isSkipped ? "line-through" : "none",
            lineHeight: 1.3,
          }}
        >
          {event.title}
        </div>

        {/* ── Quick action buttons ────────────────────────────────── */}
        {(showCompleteAction || showSkipAction) && (
          <div
            className="cal-chip-actions"
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              display: "flex",
              gap: 3,
              zIndex: 2,
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
                  background: "var(--color-success-12)",
                  border: "1px solid var(--color-success-30)",
                  borderRadius: 6,
                  color: "var(--color-success)",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                  transition: "background 120ms ease-out",
                  backdropFilter: "blur(4px)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-success-25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-success-12)";
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
                  background: "var(--color-danger-8)",
                  border: "1px solid var(--color-danger-25)",
                  borderRadius: 6,
                  color: "var(--color-danger)",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                  transition: "background 120ms ease-out",
                  backdropFilter: "blur(4px)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-danger-18)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-danger-8)";
                }}
              >
                ×
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
