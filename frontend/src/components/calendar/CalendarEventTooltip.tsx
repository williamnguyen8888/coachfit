"use client";

// src/components/calendar/CalendarEventTooltip.tsx
// Rich tooltip shown on desktop hover over a CalendarEventChip.
// Features: sport header, duration, intensity zone bar, load score, notes preview.

import { useEffect, useRef, useState } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { getZoneDistribution, getEstimatedLoad, getSportMeta } from "./calendarUtils";

// ─── Duration helper ──────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  return `${m}m`;
}

// ─── Zone bar (large, with labels) ───────────────────────────────────────────

const ZONE_LABELS = ["Z1", "Z2", "Z3", "Z4", "Z5"];
const ZONE_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#fb923c", "#f87171"];
const ZONE_NAMES  = ["Recovery", "Aerobic", "Tempo", "Threshold", "VO₂max"];

function ZoneBarLarge({ distribution }: { distribution: number[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 2, height: 10, borderRadius: 5, overflow: "hidden" }}>
        {distribution.map((pct, i) =>
          pct > 0 ? (
            <div
              key={i}
              title={`${ZONE_NAMES[i]}: ${Math.round(pct)}%`}
              style={{
                flex: pct,
                background: ZONE_COLORS[i],
                transition: "flex 0.4s ease",
              }}
            />
          ) : null,
        )}
      </div>
      {/* Zone legend */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {distribution.map((pct, i) =>
          pct > 2 ? (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 10,
                color: "var(--text-muted)",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: 2, background: ZONE_COLORS[i], flexShrink: 0 }} />
              <span style={{ color: ZONE_COLORS[i], fontWeight: 600 }}>{ZONE_LABELS[i]}</span>
              <span>{Math.round(pct)}%</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        padding: "6px 10px",
        background: "var(--bg-input)",
        borderRadius: 8,
        minWidth: 48,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: color ?? "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Status chip ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  planned:   { label: "Planned",   color: "var(--text-secondary)", bg: "var(--bg-input)" },
  completed: { label: "Completed", color: "var(--color-success)",  bg: "var(--color-success-10)" },
  skipped:   { label: "Skipped",   color: "var(--color-danger)",   bg: "var(--color-danger-8)" },
  partial:   { label: "Partial",   color: "var(--color-warning)",  bg: "rgba(245,158,11,0.10)" },
};

// ─── Main tooltip ─────────────────────────────────────────────────────────────

export interface CalendarEventTooltipProps {
  event: CalendarEvent;
  anchorEl: HTMLElement;
}

export function CalendarEventTooltip({ event, anchorEl }: CalendarEventTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; side: "right" | "left" }>({
    top: 0,
    left: 0,
    side: "right",
  });
  const [visible, setVisible] = useState(false);

  const sport  = event.workout?.sport ?? "other";
  const meta   = getSportMeta(sport, event.eventType);
  const dist   = getZoneDistribution(sport, event.status);
  const load   = getEstimatedLoad(event);
  const duration = event.workout?.estimatedDuration;
  const statusMeta = STATUS_META[event.status] ?? STATUS_META.planned;

  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const TOOLTIP_W = 260;
    const GAP = 10;

    const spaceRight = vw - rect.right;
    const side: "right" | "left" = spaceRight >= TOOLTIP_W + GAP ? "right" : "left";

    let left = side === "right"
      ? rect.right + GAP
      : rect.left - TOOLTIP_W - GAP;

    // Clamp to viewport
    left = Math.max(8, Math.min(left, vw - TOOLTIP_W - 8));

    let top = rect.top - 8;
    // Don't go above viewport
    top = Math.max(8, top);

    setPos({ top, left, side });
    // Trigger animation after mount
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [anchorEl]);

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        width: 260,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(4px)",
        transition: "opacity 180ms ease, transform 180ms ease",
        pointerEvents: "none",
      }}
    >
      {/* Sport color accent strip */}
      <div style={{ height: 3, background: meta.color, opacity: 0.9 }} />

      {/* Header */}
      <div
        style={{
          padding: "10px 12px 8px",
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${meta.color}22`,
            border: `1px solid ${meta.color}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.3,
            }}
          >
            {event.title}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
            {meta.label}
          </div>
        </div>
        {/* Status badge */}
        <div
          style={{
            padding: "2px 7px",
            background: statusMeta.bg,
            borderRadius: 99,
            fontSize: 10,
            fontWeight: 600,
            color: statusMeta.color,
            flexShrink: 0,
          }}
        >
          {statusMeta.label}
        </div>
      </div>

      {/* Stats row */}
      {(duration || load > 0) && (
        <div style={{ padding: "0 12px 10px", display: "flex", gap: 6 }}>
          {duration && duration > 0 && (
            <StatPill label="Duration" value={formatDuration(duration)} color={meta.color} />
          )}
          {load > 0 && (
            <StatPill label="Load" value={String(load)} />
          )}
        </div>
      )}

      {/* Intensity bar */}
      {dist.some((v) => v > 0) && (
        <div style={{ padding: "0 12px 10px" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Intensity Distribution
          </div>
          <ZoneBarLarge distribution={dist} />
        </div>
      )}

      {/* Notes */}
      {event.notes && (
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 11,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          } as React.CSSProperties}
        >
          {event.notes}
        </div>
      )}

      {/* Footer hint */}
      <div
        style={{
          padding: "6px 12px",
          borderTop: "1px solid var(--border-subtle)",
          fontSize: 10,
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ opacity: 0.6 }}>Click to edit</span>
      </div>
    </div>
  );
}
