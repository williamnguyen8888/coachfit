// src/lib/types/workout.ts
// Type definitions for workouts — aligned to docs/05-api-design.md

import type { Sport } from "./activity";

// ─── Step building blocks ─────────────────────────────────────────────────────

export type StepType =
  | "warmup"
  | "work"
  | "rest"
  | "cooldown"
  | "ramp"
  | "free"
  | "repeat"
  | "other";

export type DurationType = "time" | "distance" | "lap_button";

export interface StepDuration {
  type: DurationType;
  /** seconds for time, meters for distance */
  value?: number;
}

export type TargetType =
  | "power_zone"
  | "power_pct"
  | "power_watts"
  | "hr_zone"
  | "hr_pct"
  | "hr_bpm"
  | "pace_zone"
  | "pace"
  | "speed"
  | "cadence"
  | "rpe"
  | "open"
  | "none";

export interface StepTarget {
  type: TargetType;
  /** e.g. zone number for power_zone / hr_zone */
  zone?: number;
  /** min pct for power_pct */
  min?: number;
  /** max pct for power_pct */
  max?: number;
  /** raw value for pace / cadence */
  value?: number;
}

export interface WorkoutStep {
  type: StepType;
  duration?: StepDuration;
  target?: StepTarget;
  description?: string;
  /** Only set when type === "repeat" */
  count?: number;
  /** Nested steps (only for type === "repeat") */
  steps?: WorkoutStep[];
}

// ─── Workout ─────────────────────────────────────────────────────────────────

/** Summary returned in list responses */
export interface WorkoutSummary {
  id: string;
  name: string;
  sport: Sport;
  description: string | null;
  /** Estimated total duration in seconds (derived from steps) */
  estimatedDuration: number | null;
  estimatedTss: number | null;
  estimatedDistance: number | null;
  averageIntensity?: number | null;
  tags: string[];
  /** True = CoachFit system template, False = user-created */
  isTemplate: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

/** Full workout detail with steps */
export interface WorkoutDetail extends WorkoutSummary {
  steps: WorkoutStep[];
}

/** Paginated list response */
export interface PaginatedWorkouts {
  content: WorkoutSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ─── Filter / query ───────────────────────────────────────────────────────────

export type WorkoutSource = "template" | "mine" | "all";

export interface WorkoutsFilter {
  page?: number;
  size?: number;
  sport?: Sport | "";
  source?: WorkoutSource;
  sort?: string;
}

// ─── Create / update payload ──────────────────────────────────────────────────

export interface WorkoutPayload {
  name: string;
  sport: Sport;
  description?: string;
  steps: WorkoutStep[];
  tags?: string[];
}
