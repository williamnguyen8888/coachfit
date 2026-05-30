"use client";

// src/components/calendar/CalendarEventChip.tsx
// Premium visual chip for a single calendar event.
//
// Visual features (intervals.icu-level):
//   - Intensity zone bar (5 colored segments)
//   - Load score badge
//   - Sport-colored left accent + matching glow on hover
//   - Status overlays (completed gradient, skipped dim+strikethrough)
//   - Drag handle ⠿ (desktop hover / mobile always)
//   - Inline ✓/× quick actions
//   - Rich hover tooltip (CalendarEventTooltip) — desktop only
//   - data-event-id for touch-drag restoration

import { useState, useRef, useCallback } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { getSportMeta, getZoneDistribution, getEstimatedLoad, formatDuration } from "./calendarUtils";
import { CalendarEventTooltip } from "./CalendarEventTooltip";

// ─── Intensity bar (mini, 5 segments) ─────────────────────────────────────────

const ZONE_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#fb923c", "#f87171"];

function IntensityBar({ distribution, height = 4 }: { distribution: number[]; height?: number }) {
  const hasData = distribution.some((v) => v > 0);
  if (!hasData) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 1,
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        flexShrink: 0,
      }}
      title="Estimated intensity zone distribution"
    >
      {distribution.map((pct, i) =>
        pct > 0 ? (
          <div
            key={i}
            style={{
              flex: pct,
              background: ZONE_COLORS[i],
              borderRadius: i === 0 ? `${height / 2}px 0 0 ${height / 2}px` : i === distribution.length - 1 ? `0 ${height / 2}px ${height / 2}px 0` : 0,
            }}
          />
        ) : null,
      )}
    </div>
  );
}

// ─── Completion ring (SVG, small) ─────────────────────────────────────────────

function CompletionRing({ pct, color, size = 16 }: { pct: number; color: string; size?: number }) {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-default)" strokeWidth={2} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}

// ─── Load badge ───────────────────────────────────────────────────────────────

function LoadBadge({ load, color }: { load: number; color: string }) {
  return (
    <span
      title={`Estimated load: ${load}`}
      style={{
        fontSize: 9,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        color,
        background: `${color}22`,
        border: `1px solid ${color}44`,
        borderRadius: 4,
        padding: "1px 4px",
        lineHeight: 1.4,
        flexShrink: 0,
        letterSpacing: "0.02em",
      }}
    >
      {load}
    </span>
  );
}

// ─── Component props ──────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

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
  const sport      = event.workout?.sport ?? "other";
  const meta       = getSportMeta(sport, event.eventType);
  const dist       = getZoneDistribution(sport, event.status);
  const load       = getEstimatedLoad(event);
  const duration   = event.workout?.estimatedDuration;

  const isCompleted = event.status === "completed";
  const isSkipped   = event.status === "skipped";
  const isPartial   = event.status === "partial";
  const isPlanned   = event.status === "planned";

  const showCompleteAction = onComplete && (isPlanned || isPartial);
  const showSkipAction     = onSkip     && (isPlanned || isPartial);

  // Tooltip state (desktop hover only)
  const [showTooltip, setShowTooltip]   = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chipBtnRef      = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => {
    tooltipTimerRef.current = setTimeout(() => setShowTooltip(true), 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setShowTooltip(false);
  }, []);

  // Background based on status
  const chipBg = isCompleted
    ? "linear-gradient(135deg, var(--color-success-8) 0%, var(--color-success-12) 100%)"
    : isSkipped
    ? "var(--color-danger-6)"
    : isPartial
    ? "linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(245,158,11,0.10) 100%)"
    : "var(--bg-elevated)";

  const chipBgHover = isCompleted
    ? "linear-gradient(135deg, var(--color-success-14) 0%, var(--color-success-25) 100%)"
    : isSkipped
    ? "var(--color-danger-10)"
    : isPartial
    ? "linear-gradient(135deg, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0.18) 100%)"
    : "var(--bg-input)";

  // Completion ring pct
  const ringPct = isCompleted ? 100 : isPartial ? 60 : isSkipped ? 0 : 0;
  const ringColor = isCompleted
    ? "var(--color-success)"
    : isPartial
    ? "var(--color-warning)"
    : "var(--text-muted)";

  return (
    <>
      <div
        data-event-id={event.id}
        className="cal-chip-wrapper"
        style={{
          position: "relative",
          width: "100%",
          opacity: isDragging ? 0.3 : 1,
          transition: "opacity 150ms ease-out",
        }}
        onDragOver={onChipDragOver}
        onMouseEnter={compact ? undefined : handleMouseEnter}
        onMouseLeave={compact ? undefined : handleMouseLeave}
      >
        {/* ── Drag handle ── */}
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
            }}
          >
            ⠿
          </div>
        )}

        {/* ── Main chip ── */}
        <button
          ref={chipBtnRef}
          type="button"
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
          className="cal-chip-btn"
          aria-label={`${event.title} — ${event.status}`}
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: compact ? "3px 6px 3px 8px" : "5px 6px 4px 8px",
            background: chipBg,
            border: "none",
            borderLeft: `3px solid ${meta.color}`,
            borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
            cursor: draggable ? "grab" : "pointer",
            textAlign: "left",
            transition: "background 150ms ease-out, box-shadow 150ms ease-out, transform 120ms ease-out",
            opacity: isSkipped ? 0.65 : 1,
            minHeight: compact ? "var(--cal-chip-height-compact)" : "var(--cal-chip-height-normal)",
            gap: compact ? 2 : 3,
            // Inline CSS var for sport glow used in animation
            ["--chip-sport-color" as string]: meta.color,
            ["--chip-sport-glow" as string]: meta.glow,
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.background = chipBgHover;
            el.style.transform = "translateX(1px)";
            el.style.boxShadow = `0 0 0 1px ${meta.color}44, 0 2px 8px ${meta.glow}`;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.background = chipBg;
            el.style.transform = "translateX(0)";
            el.style.boxShadow = "none";
          }}
        >
          {/* Row 1: icon + title + actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, width: "100%" }}>
            {/* Sport icon */}
            {!compact && (
              <span style={{ fontSize: 11, flexShrink: 0, lineHeight: 1 }}>{meta.icon}</span>
            )}

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

            {/* Duration */}
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

            {/* Load badge */}
            {!compact && load > 0 && !isSkipped && (
              <LoadBadge load={load} color={meta.color} />
            )}

            {/* Completion ring */}
            {!compact && (isCompleted || isPartial) && (
              <CompletionRing pct={ringPct} color={ringColor} size={14} />
            )}

            {/* Quick actions */}
            {(showCompleteAction || showSkipAction) && (
              <div
                className="cal-chip-actions"
                style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}
              >
                {showCompleteAction && (
                  <button
                    type="button"
                    className="cal-quick-action"
                    onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
                    aria-label="Mark complete"
                    title="Mark complete"
                    style={{
                      width: 20, height: 20, minWidth: 20,
                      background: "var(--color-success-12)",
                      border: "1px solid var(--color-success-30)",
                      borderRadius: 5,
                      color: "var(--color-success)",
                      fontSize: 10, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, lineHeight: 1, flexShrink: 0,
                      transition: "background 120ms ease-out",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-success-25)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-success-12)"; }}
                  >
                    ✓
                  </button>
                )}
                {showSkipAction && (
                  <button
                    type="button"
                    className="cal-quick-action"
                    onClick={(e) => { e.stopPropagation(); onSkip?.(); }}
                    aria-label="Mark skipped"
                    title="Mark skipped"
                    style={{
                      width: 20, height: 20, minWidth: 20,
                      background: "var(--color-danger-8)",
                      border: "1px solid var(--color-danger-25)",
                      borderRadius: 5,
                      color: "var(--color-danger)",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: 0, lineHeight: 1, flexShrink: 0,
                      transition: "background 120ms ease-out",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-danger-18)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-danger-8)"; }}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Intensity bar — only in normal mode for workout events */}
          {!compact && event.eventType === "workout" && (
            <IntensityBar distribution={dist} height={4} />
          )}
        </button>

        {/* ── Tooltip (desktop hover only) ── */}
        {showTooltip && chipBtnRef.current && (
          <CalendarEventTooltip event={event} anchorEl={chipBtnRef.current} />
        )}
      </div>

      {/* ── Scoped CSS ── */}
      <style>{`
        @media (hover: hover) {
          .cal-chip-handle { opacity: 0; transition: opacity 150ms ease-out; }
          .cal-chip-wrapper:hover .cal-chip-handle { opacity: 1; }
          .cal-chip-actions { opacity: 0; transition: opacity 150ms ease-out; }
          .cal-chip-wrapper:hover .cal-chip-actions { opacity: 1; }
        }
        @media (hover: none) {
          .cal-chip-handle { opacity: 0.5; }
          .cal-chip-actions { opacity: 1; }
          .cal-chip-btn { min-height: 44px !important; }
        }
      `}</style>
    </>
  );
}
