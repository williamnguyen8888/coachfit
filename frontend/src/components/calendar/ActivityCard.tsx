"use client";

// src/components/calendar/ActivityCard.tsx
// Rich card for completed/synced activities (intervals.icu style).
//
// Layout (week view):
// ┌──────────────────────────────┐
// │ 🚴  42m               30 km │  ← Full sport-colored header
// │      136bpm  134w            │  ← Metrics (HR, Power, Pace)
// │       Load 49                │  ← Load / TSS
// │ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ │  ← Intensity visualization
// │      ❤️ 166                   │  ← Max HR
// │  Activity Name 📋            │  ← Name
// │       ✅ 91%                  │  ← Compliance score
// └──────────────────────────────┘

import type { CalendarEvent } from "@/lib/types/calendar";
import {
  getSportHex,
  getSportSvgIcon,
  getZoneDistribution,
  formatDuration,
  formatDistance,
  formatPace,
  getRpeEmoji,
  getRpeColor,
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

export interface ActivityCardProps {
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

export function ActivityCard({
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
}: ActivityCardProps) {
  const sport = event.workout?.sport ?? event.activity?.sport ?? "other";
  const sportHex = getSportHex(sport);
  const dist = getZoneDistribution(sport, event.status);
  const activityRef = event.activity;

  // Duration from activity (actual) or workout (estimated)
  const durationSec =
    activityRef?.durationSeconds ?? event.workout?.estimatedDuration ?? 0;

  // TSS / Load from activity
  const tss = activityRef?.tss ?? 0;

  // Compliance score
  const compliance = event.complianceScore;

  // Status
  const isCompleted = event.status === "completed";
  const isPartial = event.status === "partial";

  // Calculate detailed metrics — use actual data when available, placeholders when not
  const avgHr = activityRef?.avgHeartRate ?? null;
  const maxHr = activityRef?.maxHeartRate ?? null;
  const rpe = activityRef?.rpe ?? null;

  let estDistanceMeters = activityRef?.distanceMeters ?? null;
  if (estDistanceMeters === null && durationSec > 0) {
    if (sport === "swimming") {
      estDistanceMeters = (durationSec / 2520) * 1500;
    } else if (sport === "cycling") {
      estDistanceMeters = (durationSec / 2520) * 30000;
    } else if (sport === "running") {
      estDistanceMeters = (durationSec / 2700) * 8000;
    }
  }

  // Power / Pace
  let paceOrPowerStr: string | null = null;
  if (sport === "cycling" && activityRef?.avgPower != null) {
    paceOrPowerStr = `${activityRef.avgPower}w`;
  } else if (sport === "running" && estDistanceMeters && durationSec > 0) {
    const speedMs = estDistanceMeters / durationSec;
    paceOrPowerStr = formatPace(speedMs, sport);
  }

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
          background: `${sportHex.primary}18`,
          border: "none",
          borderLeft: `3px solid ${sportHex.primary}`,
          borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
          cursor: draggable ? "grab" : "pointer",
          textAlign: "left",
          opacity: isDragging ? 0.3 : 1,
          minHeight: "var(--cal-chip-height-compact)",
          transition: "opacity 150ms ease-out, background 150ms ease-out",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = `${sportHex.primary}30`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = `${sportHex.primary}18`;
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
          }}
        >
          {event.title}
        </span>
        {durationSec > 0 && (
          <span
            style={{
              fontSize: 9,
              color: sportHex.primary,
              fontWeight: 600,
              flexShrink: 0,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatDuration(durationSec)}
          </span>
        )}
        {(isCompleted || isPartial) && (
          <span style={{ fontSize: 9, color: "var(--color-success)", flexShrink: 0 }}>✓</span>
        )}
      </button>
    );
  }

  // ── Full mode (week view) ──────────────────────────────────────────────────
  return (
    <div
      data-event-id={event.id}
      className="cal-chip-wrapper activity-card"
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
          flexDirection: "column",
          width: "100%",
          padding: 0,
          background: "var(--bg-elevated)",
          border: `1px solid ${sportHex.primary}30`,
          borderRadius: "var(--radius-md)",
          cursor: draggable ? "grab" : "pointer",
          textAlign: "center",
          transition: "box-shadow 150ms ease-out, transform 120ms ease-out, border-color 150ms ease",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = `0 2px 12px ${sportHex.primary}30, 0 0 0 1px ${sportHex.primary}50`;
          el.style.transform = "translateY(-1px)";
          el.style.borderColor = `${sportHex.primary}60`;
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget;
          el.style.boxShadow = "none";
          el.style.transform = "translateY(0)";
          el.style.borderColor = `${sportHex.primary}30`;
        }}
      >
        {/* ── Header: FULL sport color background ─────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "7px 10px",
            background: `linear-gradient(135deg, ${sportHex.primary} 0%, ${sportHex.dark} 100%)`,
            gap: 6,
            width: "100%",
          }}
        >
          <SportIcon sport={sport} size={18} color="rgba(255,255,255,0.9)" />

          {/* Duration */}
          {durationSec > 0 && (
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "white",
                fontVariantNumeric: "tabular-nums",
                marginLeft: 4,
              }}
            >
              {formatDuration(durationSec)}
            </span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Distance */}
          {estDistanceMeters && estDistanceMeters > 0 && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "white",
                marginRight: 6,
              }}
            >
              {formatDistance(estDistanceMeters)}
            </span>
          )}

          {/* Completion indicator */}
          {isCompleted && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
              ✓ Done
            </span>
          )}
          {isPartial && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#fbbf24" }}>
              ◐ Partial
            </span>
          )}
        </div>

        {/* ── Synced activity metrics row (HR, Power, Pace) ───────── */}
        {(avgHr != null || paceOrPowerStr) && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
              padding: "5px 10px 2px",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            {avgHr != null && (
              <span style={{ color: "var(--color-danger)" }}>
                ❤️ {avgHr} bpm
              </span>
            )}
            {paceOrPowerStr && (
              <span style={{ color: "var(--color-success)" }}>
                ⚡ {paceOrPowerStr}
              </span>
            )}
          </div>
        )}

        {/* ── TSS / Load ──────────────────────────────────────────── */}
        {tss > 0 && (
          <div
            style={{
              padding: "2px 0",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Load {tss}
          </div>
        )}

        {/* ── Perceived exertion RPE ──────────────────────────────── */}
        {rpe != null && (
          <div
            style={{
              padding: "2px 0 4px",
              fontSize: 11,
              fontWeight: 700,
              color: getRpeColor(rpe),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <span>RPE {rpe}</span>
            <span>{getRpeEmoji(rpe)}</span>
          </div>
        )}

        {/* ── Intensity visualization ─────────────────────────────── */}
        <div style={{ padding: "4px 8px 4px", width: "100%" }}>
          <WorkoutStepViz
            sport={sport}
            zoneDistribution={dist}
            height={24}
          />
        </div>

        {/* ── Max HR row ──────────────────────────────────────────── */}
        {maxHr != null && (
          <div
            style={{
              padding: "2px 0 4px",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--text-muted)",
            }}
          >
            ❤️ {maxHr} Max HR
          </div>
        )}

        {/* ── Activity title + Bookmark/flag ──────────────────────── */}
        <div
          style={{
            padding: "3px 8px 4px",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: 1.3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            width: "100%",
          }}
        >
          <span>{event.title}</span>
          <span style={{ fontSize: 10, opacity: 0.8 }} title="Synced Platform Activity">📋</span>
        </div>

        {/* ── Compliance score ────────────────────────────────────── */}
        {compliance != null && compliance > 0 && (
          <div
            style={{
              padding: "2px 8px 6px",
              fontSize: 11,
              fontWeight: 600,
              color: compliance >= 80 ? "var(--color-success)" : compliance >= 50 ? "var(--color-warning)" : "var(--color-danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span>✅ Compliance</span>
            <span>{compliance}%</span>
          </div>
        )}

        {/* ── Linked workout badge ────────────────────────────────── */}
        {event.workout && (
          <div
            style={{
              padding: "5px 8px 6px",
              borderTop: `1px solid ${sportHex.primary}12`,
              fontSize: 10,
              color: sportHex.primary,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              width: "100%",
            }}
          >
            <span style={{ fontSize: 9 }}>🔗</span>
            <span>Matched to Planned Workout</span>
          </div>
        )}
      </button>
    </div>
  );
}
