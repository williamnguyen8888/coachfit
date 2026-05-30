// src/lib/types/wellness.ts
// Type definitions for wellness & health data — aligned to docs/05-api-design.md § Wellness & Health Data

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
 * A single wellness log entry.
 * `source` is "manual" for entries logged via this form.
 * Auto-populated health data (Garmin, etc.) appears in /health/* endpoints.
 */
export interface WellnessEntry {
  date: string;             // YYYY-MM-DD
  mood: MoodScore | null;
  rpe: RpeScore | null;     // yesterday's perceived exertion
  fatigue: FatigueScore | null;
  sleepQuality: SleepQuality | null;
  sleepHours: number | null; // decimal hours
  muscleSoreness: FatigueScore | null; // 1=very sore, 5=none
  motivation: MoodScore | null; // 1=very low, 5=very high
  notes: string | null;
  source: "manual" | "garmin" | "polar" | "coros";
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

// ─── POST /wellness request body ────────────────────────────────────────────

export interface WellnessLogRequest {
  date: string;             // YYYY-MM-DD (defaults to today if omitted)
  mood?: MoodScore;
  rpe?: RpeScore;
  fatigue?: FatigueScore;
  sleepQuality?: SleepQuality;
  sleepHours?: number;
  muscleSoreness?: FatigueScore;
  motivation?: MoodScore;
  notes?: string;
}

// ─── GET /wellness response ──────────────────────────────────────────────────

export interface WellnessListResponse {
  content: WellnessEntry[];
  // backend uses date-range filter, no pagination cursor needed
}
