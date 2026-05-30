// src/lib/types/wellness.ts
// Type definitions for wellness & health data — aligned to actual backend DTOs.
// Backend: WellnessResponse.java, WellnessRequest.java, WellnessController.java

// ─── Wellness Entry ────────────────────────────────────────────────────────────

/** 1–5 scale: 1=very bad, 2=bad, 3=neutral, 4=good, 5=excellent */
export type MoodScore = 1 | 2 | 3 | 4 | 5;

/** 1–10 scale: Rate of Perceived Exertion (Borg CR10) */
export type RpeScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/** 1–5 scale: 1=extremely fatigued, 5=completely fresh */
export type FatigueScore = 1 | 2 | 3 | 4 | 5;

/** 1–5 scale: 1=very poor, 5=excellent */
export type SleepQuality = 1 | 2 | 3 | 4 | 5;

/**
 * A single wellness log entry — maps to backend WellnessResponse record.
 * Field names match backend exactly.
 */
export interface WellnessEntry {
  date: string;                  // YYYY-MM-DD
  source: "manual" | "garmin" | "polar" | "coros";
  mood: MoodScore | null;
  rpe: RpeScore | null;          // yesterday's perceived exertion
  sleepQuality: SleepQuality | null;
  sleepHours: number | null;     // decimal hours
  fatigue: FatigueScore | null;
  /** Backend field name is `soreness` (not `muscleSoreness`) */
  soreness: FatigueScore | null; // 1=very sore, 5=none
  stressLevel: number | null;    // 1–10, not yet surfaced in UI
  restingHr: number | null;      // bpm
  hrv: number | null;
  weightKg: number | null;
  notes: string | null;
  fieldSources?: Record<string, string> | null;
}

// ─── POST /wellness / PUT /wellness/{date} request body ──────────────────────

/**
 * Request body — maps to backend WellnessRequest record.
 * All fields optional; only non-null values are merged.
 * Note: `date` is passed as a URL path param for PUT, not in the body.
 */
export interface WellnessLogRequest {
  mood?: MoodScore;
  rpe?: RpeScore;
  sleepQuality?: SleepQuality;
  sleepHours?: number;
  fatigue?: FatigueScore;
  /** Backend field name is `soreness` */
  soreness?: FatigueScore;
  stressLevel?: number;
  restingHr?: number;
  hrv?: number;
  weightKg?: number;
  notes?: string;
}

// ─── GET /wellness response ──────────────────────────────────────────────────

/**
 * Backend returns a raw array (not a paginated envelope) for GET /wellness.
 * Components must handle Array.isArray(data) directly.
 */
export type WellnessListResponse = WellnessEntry[];
