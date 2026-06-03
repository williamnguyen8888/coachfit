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

import { useRouter } from "next/navigation";
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
  getEstimatedLoad,
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

// ─── Platform source badge helper ─────────────────────────────────────────────

function renderSourceBadge(source?: string) {
  if (!source) return null;
  const src = source.toLowerCase();

  let label = "Manual";
  let bg = "rgba(107, 114, 128, 0.15)";
  let color = "var(--text-secondary)";
  let border = "1px solid rgba(107, 114, 128, 0.3)";
  let dotColor = "#9ca3af";

  if (src === "strava") {
    label = "Strava";
    bg = "rgba(252, 76, 2, 0.08)";
    color = "#fc4c02";
    border = "1px solid rgba(252, 76, 2, 0.25)";
    dotColor = "#fc4c02";
  } else if (src === "garmin") {
    label = "Garmin";
    bg = "rgba(0, 124, 195, 0.08)";
    color = "#007cc3";
    border = "1px solid rgba(0, 124, 195, 0.25)";
    dotColor = "#007cc3";
  } else if (src === "coros") {
    label = "COROS";
    bg = "rgba(28, 28, 28, 0.4)";
    color = "var(--text-primary)";
    border = "1px solid rgba(255, 255, 255, 0.15)";
    dotColor = "#ffffff";
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 6px",
        borderRadius: 4,
        background: bg,
        color: color,
        border: border,
        fontSize: 9,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        pointerEvents: "none",
        flexShrink: 0,
        height: 16,
        lineHeight: 1,
      }}
    >
      <span style={{ color: dotColor, fontSize: 8, marginRight: 1 }}>●</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActivityCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
  onAnalysisClick?: (eventId: string) => void;
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
  onAnalysisClick,
  draggable,
  onDragStart,
  onDragEnd,
  onChipDragOver,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isDragging = false,
}: ActivityCardProps) {
  const router = useRouter();
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

  const handleClick = () => {
    if (activityRef?.id) {
      router.push(`/activities/${activityRef.id}`);
    } else {
      onClick?.(event);
    }
  };

  const hasPlanAndActual = event.workout !== null && (isCompleted || isPartial);

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
        onClick={handleClick}
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
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="cal-chip-btn-container"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          padding: 0,
          background: "var(--bg-elevated)",
          border: `1px solid ${sportHex.primary}30`,
          borderRadius: "var(--radius-md)",
          cursor: draggable ? "grab" : "default",
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
        {/* UPPER BLOCK: Actual Activity details (clickable) */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          style={{
            cursor: "pointer",
            width: "100%",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `color-mix(in srgb, ${sportHex.primary} 4%, transparent)`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
          title="Click to view actual activity details & analysis"
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
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", gap: 3 }}>
                <span>✓ Done</span>
                <span style={{ fontSize: 8, opacity: 0.8 }}>↗</span>
              </span>
            )}
            {isPartial && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "#fbbf24", display: "flex", alignItems: "center", gap: 3 }}>
                <span>◐ Partial</span>
                <span style={{ fontSize: 8, opacity: 0.8 }}>↗</span>
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

          {/* ── TSS / Load & RPE ────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "2px 0" }}>
            {tss > 0 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                Load {tss}
              </span>
            )}
            {rpe != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: getRpeColor(rpe), display: "flex", alignItems: "center", gap: 3 }}>
                <span>RPE {rpe}</span>
                <span>{getRpeEmoji(rpe)}</span>
              </span>
            )}
          </div>

          {/* ── Max HR row ──────────────────────────────────────────── */}
          {maxHr != null && (
            <div
              style={{
                padding: "2px 0 2px",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              ❤️ {maxHr} Max HR
            </div>
          )}

          {/* ── Activity title + Brand Source Icon ──────────────────────── */}
          <div
            style={{
              padding: "4px 8px 6px",
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
              gap: 6,
              width: "100%",
            }}
          >
            <span>{event.title}</span>
            {renderSourceBadge(activityRef?.source)}
          </div>

          {/* ── Intensity visualization (Only when no plan and actual combined) ── */}
          {!hasPlanAndActual && (
            <div style={{ padding: "4px 8px 6px", width: "100%" }}>
              <WorkoutStepViz
                sport={sport}
                zoneDistribution={dist}
                height={24}
              />
            </div>
          )}
        </div>

        {/* ── Separator / Match Score Divider (Middle Section) ── */}
        {hasPlanAndActual && (
          <div
            style={{
              display: isDragging ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              height: 10,
              width: "100%",
              background: "transparent",
              margin: 0,
              zIndex: 1,
            }}
          >
            {/* Fading line */}
            <div
              style={{
                height: 1,
                width: "100%",
                background: `linear-gradient(90deg, transparent, ${sportHex.primary}40, transparent)`,
              }}
            />
            {/* Compliance pill */}
            {compliance != null && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAnalysisClick?.(event.id);
                }}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: compliance >= 80 ? "var(--color-success)" : compliance >= 50 ? "var(--color-warning)" : "var(--color-danger)",
                  color: "white",
                  fontSize: 9,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 10,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  zIndex: 2,
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                  border: "none",
                  cursor: onAnalysisClick ? "pointer" : "default",
                  transition: "transform 150ms ease, filter 150ms ease",
                }}
                onMouseEnter={(e) => {
                  if (onAnalysisClick) {
                    e.currentTarget.style.transform = "translate(-50%, -50%) scale(1.08)";
                    e.currentTarget.style.filter = "brightness(1.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (onAnalysisClick) {
                    e.currentTarget.style.transform = "translate(-50%, -50%) scale(1)";
                    e.currentTarget.style.filter = "none";
                  }
                }}
                title="Click to view detailed compliance match analysis report"
              >
                {compliance}% Match
              </button>
            )}
          </div>
        )}

        {/* ── Combined planned workout details (LOWER BLOCK - clickable separately) ── */}
        {hasPlanAndActual && (
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
              e.stopPropagation();
              onClick?.(event);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onClick?.(event);
              }
            }}
            style={{
              width: "100%",
              background: `color-mix(in srgb, ${sportHex.primary} 3%, transparent)`,
              padding: "6px 10px 10px",
              display: isDragging ? "none" : "flex",
              flexDirection: "column",
              gap: 4,
              position: "relative",
              cursor: draggable ? "grab" : "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `color-mix(in srgb, ${sportHex.primary} 8%, transparent)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `color-mix(in srgb, ${sportHex.primary} 3%, transparent)`;
            }}
            title="Click to view/edit planned workout targets"
          >
            {/* Plan Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 9,
                fontWeight: 800,
                color: sportHex.primary,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 2,
                width: "100%",
              }}
            >
              <span>🎯 Plan Targets</span>
              <span style={{ fontSize: 8, opacity: 0.6, fontWeight: 700 }}>Details ⚙</span>
            </div>

            {/* Plan Targets text pills */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, width: "100%", margin: "2px 0 4px" }}>
              <span style={{ fontSize: 9, fontWeight: 700, background: "var(--bg-input)", padding: "2px 5px", borderRadius: 4, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 2 }}>
                <span>⏱️</span>
                <span>{event.workout?.estimatedDuration ? formatDuration(event.workout.estimatedDuration) : "--"}</span>
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, background: "var(--bg-input)", padding: "2px 5px", borderRadius: 4, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 2 }}>
                <span>📏</span>
                <span>{formatDistance(
                  event.workout?.estimatedDistance ?? (
                    sport === "swimming" ? (event.workout?.estimatedDuration ? (event.workout.estimatedDuration / 2400) * 1400 : 0) :
                    sport === "cycling" ? (event.workout?.estimatedDuration ? (event.workout.estimatedDuration / 3600) * 28000 : 0) :
                    sport === "running" ? (event.workout?.estimatedDuration ? (event.workout.estimatedDuration / 2700) * 7500 : 0) : 0
                  )
                )}</span>
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, background: "var(--bg-input)", padding: "2px 5px", borderRadius: 4, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 2 }}>
                <span>🔥</span>
                <span>Load {getEstimatedLoad(event)}</span>
              </span>
            </div>

            {/* Target steps viz bar */}
            <div style={{ width: "100%" }}>
              <WorkoutStepViz
                sport={sport}
                zoneDistribution={getZoneDistribution(sport, "planned")}
                height={12}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
