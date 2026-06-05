// src/components/calendar/calendarUtils.ts
// Shared helpers for calendar visual components:
//   - Sport metadata (icon, color, glow, label)
//   - Zone intensity distribution (estimated for planned, actuals when available)
//   - Estimated training load score

import type { CalendarEvent } from "@/lib/types/calendar";

// ─── ISO Week Number ──────────────────────────────────────────────────────────
// ISO 8601: weeks start on Monday; week 1 contains the year's first Thursday.
// This single implementation is used across WeekNavBar, WeekView, MonthView,
// and WeeklySummaryColumn to guarantee consistency.

export function getISOWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1 … Sun=7)
  const dayNum = d.getDay() || 7; // convert 0 (Sun) → 7
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ─── Sport metadata ────────────────────────────────────────────────────────────

export interface SportMeta {
  icon: string;
  color: string;
  glow: string;
  label: string;
}

const SPORT_META: Record<string, SportMeta> = {
  cycling: {
    icon: "🚴",
    color: "var(--sport-cycling)",
    glow: "var(--sport-cycling-glow)",
    label: "Cycling",
  },
  running: {
    icon: "🏃",
    color: "var(--sport-running)",
    glow: "var(--sport-running-glow)",
    label: "Running",
  },
  swimming: {
    icon: "🏊",
    color: "var(--sport-swimming)",
    glow: "var(--sport-swimming-glow)",
    label: "Swimming",
  },
  strength: {
    icon: "💪",
    color: "var(--sport-strength)",
    glow: "var(--sport-strength-glow)",
    label: "Strength",
  },
  other: {
    icon: "🏋️",
    color: "var(--sport-other)",
    glow: "var(--sport-other-glow)",
    label: "Workout",
  },
};

const EVENT_TYPE_META: Record<string, SportMeta> = {
  rest: {
    icon: "😴",
    color: "var(--text-muted)",
    glow: "rgba(90,90,110,0.1)",
    label: "Rest Day",
  },
  race: {
    icon: "🏁",
    color: "var(--color-danger)",
    glow: "var(--color-danger-10)",
    label: "Race",
  },
  note: {
    icon: "📝",
    color: "var(--text-secondary)",
    glow: "rgba(139,92,246,0.08)",
    label: "Note",
  },
};

export function getSportMeta(sport: string, eventType?: string): SportMeta {
  if (eventType && eventType !== "workout") {
    return EVENT_TYPE_META[eventType] ?? SPORT_META.other;
  }
  return SPORT_META[sport] ?? SPORT_META.other;
}

// ─── Zone intensity distribution ──────────────────────────────────────────────
// Returns [z1%, z2%, z3%, z4%, z5%] summing to 100
// For planned workouts: uses sport-based heuristics
// For skipped: returns all zeros
// For completed: would use real data — currently falls back to planned heuristic

const SPORT_ZONE_HEURISTIC: Record<string, number[]> = {
  cycling:  [15, 45, 25, 12,  3], // mostly aerobic / tempo
  running:  [20, 40, 25, 12,  3],
  swimming: [10, 50, 30,  8,  2], // mostly aerobic
  strength: [ 5, 10, 15, 40, 30], // mostly threshold/VO2
  other:    [20, 40, 25, 12,  3],
};

export function getZoneDistribution(
  sport: string,
  status: CalendarEvent["status"],
): number[] {
  if (status === "skipped" || status === "rest" as string) return [0, 0, 0, 0, 0];
  return SPORT_ZONE_HEURISTIC[sport] ?? SPORT_ZONE_HEURISTIC.other;
}

// ─── Estimated training load ──────────────────────────────────────────────────
// Simple proxy: (duration_minutes) × intensity_factor → rough TSS-like number

const INTENSITY_FACTOR: Record<string, number> = {
  cycling:  0.8,
  running:  1.0,
  swimming: 0.9,
  strength: 0.6,
  other:    0.7,
};

export function getEstimatedLoad(event: CalendarEvent): number {
  if (event.eventType === "rest" || event.eventType === "note") return 0;
  // ISSUE-02: Prefer actual activity TSS (most accurate), then planned workout TSS,
  // then fall back to a heuristic based on planned duration.
  if (event.activity?.tss != null && event.activity.tss > 0) return Math.round(event.activity.tss);
  if (event.workout?.estimatedTss != null) return Math.round(event.workout.estimatedTss);
  // Fallback: use actual activity duration if available, else planned
  const dur = event.activity?.durationSeconds ?? event.workout?.estimatedDuration ?? 0;
  if (dur <= 0) return 0;
  const sport = event.activity?.sport ?? event.workout?.sport ?? "other";
  const factor = INTENSITY_FACTOR[sport] ?? 0.7;
  return Math.round((dur / 60) * factor);
}

// ─── Duration formatting ──────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

// ─── Week aggregates ─────────────────────────────────────────────────────────

export interface WeekStats {
  totalDurationSec: number;
  plannedCount: number;
  completedCount: number;
  skippedCount: number;
  totalLoad: number;
  completionPct: number; // 0–100
}

export function computeWeekStats(events: CalendarEvent[]): WeekStats {
  const workoutEvents = events.filter((e) => e.eventType === "workout");
  // ISSUE-03: Use actual activity duration for completed/partial events,
  // planned estimated duration for planned/skipped events.
  const totalDurationSec = workoutEvents.reduce((sum, e) => {
    const isCompleted = e.status === "completed" || e.status === "partial";
    const dur = isCompleted
      ? (e.activity?.durationSeconds ?? e.workout?.estimatedDuration ?? 0)
      : (e.workout?.estimatedDuration ?? 0);
    return sum + dur;
  }, 0);
  const plannedCount   = workoutEvents.filter((e) => e.status === "planned").length;
  const completedCount = workoutEvents.filter((e) => e.status === "completed" || e.status === "partial").length;
  const skippedCount   = workoutEvents.filter((e) => e.status === "skipped").length;
  const totalLoad      = workoutEvents.reduce((sum, e) => sum + getEstimatedLoad(e), 0);
  const total = plannedCount + completedCount + skippedCount;
  const completionPct  = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  return { totalDurationSec, plannedCount, completedCount, skippedCount, totalLoad, completionPct };
}

// ─── Raw sport hex colors (for gradients, no CSS var indirection) ────────────

export const SPORT_HEX: Record<string, { primary: string; light: string; dark: string }> = {
  cycling:  { primary: "#3b82f6", light: "#dbeafe", dark: "#1e40af" },
  running:  { primary: "#b45309", light: "#fef3c7", dark: "#92400e" },
  swimming: { primary: "#0891b2", light: "#cffafe", dark: "#155e75" },
  strength: { primary: "#f97316", light: "#ffedd5", dark: "#c2410c" },
  other:    { primary: "#6b7280", light: "#f3f4f6", dark: "#374151" },
};

export function getSportHex(sport: string): { primary: string; light: string; dark: string } {
  return SPORT_HEX[sport] ?? SPORT_HEX.other;
}

// ─── SVG sport icon paths ─────────────────────────────────────────────────────
// Compact SVG path data for inline rendering (viewBox 0 0 24 24)

export const SPORT_SVG_ICONS: Record<string, { path: string; viewBox: string }> = {
  swimming: {
    viewBox: "0 0 24 24",
    path: "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1M2 14c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1M8.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 12l3.5-3.5L12 12",
  },
  cycling: {
    viewBox: "0 0 24 24",
    path: "M5.5 17a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM18.5 17a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 12.5l-3.5-5L12 5h3l-2.5 3.5L16 12.5h-4Z",
  },
  running: {
    viewBox: "0 0 24 24",
    path: "M13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-1.75 6L8 10.5l-1 5.5h2l.75-3L12 15v6h2v-7.5l-2.25-2L13 7.5c1.13 1.38 2.76 2.38 4.62 2.75l.38-1.97a5.994 5.994 0 0 1-3.75-2.53L13 4.25c-.37-.6-1-.97-1.7-1L8 3.5l-3 3 1.5 1.5L8.75 6l2.5 2Z",
  },
  strength: {
    viewBox: "0 0 24 24",
    path: "M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29Z",
  },
  other: {
    viewBox: "0 0 24 24",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm-1-13h2v6h-2Zm0 8h2v2h-2Z",
  },
};

export function getSportSvgIcon(sport: string): { path: string; viewBox: string } {
  return SPORT_SVG_ICONS[sport] ?? SPORT_SVG_ICONS.other;
}

// ─── Distance formatting ──────────────────────────────────────────────────────

export function formatDistance(meters: number | null | undefined): string | null {
  // ISSUE-09: Use explicit null check instead of falsy check for clarity.
  if (meters == null || meters <= 0) return null;
  if (meters >= 1000) {
    const km = meters / 1000;
    return km >= 10 ? `${Math.round(km)} km` : `${km.toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

// ─── Pace formatting ──────────────────────────────────────────────────────────

export function formatPace(speedMs: number | null | undefined, sport: string): string | null {
  if (speedMs == null || speedMs <= 0) return null;
  if (sport === "cycling") {
    const kmh = speedMs * 3.6;
    return `${kmh.toFixed(1)} km/h`;
  }
  if (sport === "swimming") {
    // ISSUE-10: Swimming uses pace per 100m, not per km.
    const secPer100m = 100 / speedMs;
    if (secPer100m > 600) return null; // sanity guard
    const mins = Math.floor(secPer100m / 60);
    const secs = Math.round(secPer100m % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}/100m`;
  }
  // Running: min/km
  const secPerKm = 1000 / speedMs;
  if (secPerKm > 1800) return null; // sanity guard (>30 min/km)
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}/km`;
}

// ─── RPE emoji ────────────────────────────────────────────────────────────────

export function getRpeEmoji(rpe: number): string {
  if (rpe <= 2) return "😌";
  if (rpe <= 4) return "🙂";
  if (rpe <= 6) return "😐";
  if (rpe <= 7) return "😤";
  if (rpe <= 8) return "😰";
  if (rpe <= 9) return "🥵";
  return "💀";
}

// ─── RPE color ────────────────────────────────────────────────────────────────

export function getRpeColor(rpe: number): string {
  if (rpe <= 3) return "#22c55e"; // green — easy
  if (rpe <= 5) return "#f59e0b"; // amber — moderate
  if (rpe <= 7) return "#f97316"; // orange — hard
  if (rpe <= 8) return "#ef4444"; // red — very hard
  return "#dc2626";               // deep red — maximal
}
