// src/components/calendar/calendarUtils.ts
// Shared helpers for calendar visual components:
//   - Sport metadata (icon, color, glow, label)
//   - Zone intensity distribution (estimated for planned, actuals when available)
//   - Estimated training load score

import type { CalendarEvent } from "@/lib/types/calendar";

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
  const dur = event.workout?.estimatedDuration ?? 0;
  if (dur <= 0) return 0;
  const sport = event.workout?.sport ?? "other";
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
  const totalDurationSec = workoutEvents.reduce(
    (sum, e) => sum + (e.workout?.estimatedDuration ?? 0),
    0,
  );
  const plannedCount   = workoutEvents.filter((e) => e.status === "planned").length;
  const completedCount = workoutEvents.filter((e) => e.status === "completed" || e.status === "partial").length;
  const skippedCount   = workoutEvents.filter((e) => e.status === "skipped").length;
  const totalLoad      = workoutEvents.reduce((sum, e) => sum + getEstimatedLoad(e), 0);
  const total = plannedCount + completedCount + skippedCount;
  const completionPct  = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  return { totalDurationSec, plannedCount, completedCount, skippedCount, totalLoad, completionPct };
}
