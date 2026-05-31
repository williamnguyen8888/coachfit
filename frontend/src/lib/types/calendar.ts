// src/lib/types/calendar.ts
// Type definitions for calendar events — aligned to docs/05-api-design.md § Calendar

import type { Sport } from "./activity";

// ─── Enums / unions ───────────────────────────────────────────────────────────

/**
 * Event status lifecycle:
 *   planned → completed | partial | skipped
 *   completed → planned (if linked activity deleted)
 *   partial → completed (manual override) | planned (activity deleted)
 *   skipped → planned (user un-skips)
 */
export type CalendarEventStatus = "planned" | "completed" | "partial" | "skipped";

export type CalendarEventType = "workout" | "rest" | "race" | "note";

// ─── Response types ───────────────────────────────────────────────────────────

/** Workout summary embedded in a calendar event */
export interface CalendarWorkoutRef {
  id: string;
  sport: Sport;
  /** Estimated duration in seconds */
  estimatedDuration: number | null;
}

/** Activity summary embedded in a calendar event (when completed) */
export interface CalendarActivityRef {
  id: string;
  tss: number | null;
  durationSeconds: number;
  sport?: Sport;
  name?: string;
  distanceMeters?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  avgPower?: number | null;
  rpe?: number | null;
  source?: string;
}

/** Calendar event as returned by GET /calendar */
export interface CalendarEvent {
  id: string;
  /** ISO date string: "YYYY-MM-DD" */
  date: string;
  eventType: CalendarEventType;
  title: string;
  status: CalendarEventStatus;
  /** Linked workout (present when eventType === "workout") */
  workout: CalendarWorkoutRef | null;
  /** Linked completed activity (present when status is completed/partial) */
  activity: CalendarActivityRef | null;
  /** 0–100 compliance score (present when completed/partial) */
  complianceScore: number | null;
  /** Display order within a day (multi-event days) */
  orderIndex: number;
  /** "coach" when assigned by coach, null when self-assigned */
  assignedBy: "coach" | null;
  /** Optional notes from coach or athlete */
  notes: string | null;
  /**
   * Garmin Training API workout definition ID.
   * Populated after POST /api/v1/calendar/{id}/sync-garmin succeeds.
   * null = not yet synced to Garmin.
   */
  garminWorkoutId: string | null;
  /**
   * Garmin Training API schedule ID (links workout to a calendar date on Garmin Connect).
   * null = not yet synced to Garmin.
   */
  garminScheduledId: string | null;
  /** Timestamp of last successful Garmin sync (ISO 8601). */
  garminSyncedAt: string | null;
}

// ─── Request payloads ─────────────────────────────────────────────────────────

/** POST /calendar — create a new calendar event */
export interface CreateCalendarPayload {
  /** Workout to schedule (required for eventType "workout") */
  workoutId?: string;
  /** ISO date string: "YYYY-MM-DD" */
  date: string;
  eventType?: CalendarEventType;
  title?: string;
  notes?: string;
}

/** PUT /calendar/{id} — update a calendar event */
export interface UpdateCalendarPayload {
  date?: string;
  notes?: string;
  title?: string;
  eventType?: CalendarEventType;
  workoutId?: string;
}

// ─── Helper / derived types ───────────────────────────────────────────────────

/** Events grouped by date string for calendar grid rendering */
export type EventsByDate = Record<string, CalendarEvent[]>;

/** View mode for the calendar page */
export type CalendarViewMode = "week" | "month";
