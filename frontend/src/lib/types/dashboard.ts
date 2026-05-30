// src/lib/types/dashboard.ts
// Type definitions for dashboard APIs — aligned to docs/05-api-design.md § Dashboard

import type { ActivitySummary } from "./activity";

// ─── Health Snapshot ──────────────────────────────────────────────────────────

export interface SleepStages {
  deep: number;   // minutes
  light: number;  // minutes
  rem: number;    // minutes
  awake: number;  // minutes
}

export type HrvStatus = "balanced" | "unbalanced" | "low" | "high";

export interface HealthSnapshot {
  source: string; // "garmin" | "polar" | "manual" | etc.
  restingHr: number | null;
  sleepScore: number | null;
  sleepHours: number | null;
  sleepStages: SleepStages | null;
  hrv: number | null;
  hrvStatus: HrvStatus | null;
  bodyBattery: number | null;
  stressAvg: number | null;
  steps: number | null;
  spo2: number | null;
}

// ─── Fitness Status ───────────────────────────────────────────────────────────

export type FitnessTrend = "improving" | "declining" | "stable" | "building" | "peaking";

export interface FitnessStatus {
  ctl: number;  // Chronic Training Load (fitness)
  atl: number;  // Acute Training Load (fatigue)
  tsb: number;  // Training Stress Balance (form)
  trend: FitnessTrend;
}

// ─── Today's Workout ─────────────────────────────────────────────────────────

export interface TodayWorkout {
  id: string;
  title: string;
  sport: string;
  estimatedDuration?: number; // seconds
  status?: "planned" | "completed" | "skipped";
  complianceScore?: number | null;
}

// ─── Week Progress ────────────────────────────────────────────────────────────

export interface WeekProgress {
  plannedHours: number;
  completedHours: number;
  percentage: number;
}

// ─── Last Wellness ────────────────────────────────────────────────────────────

export interface LastWellness {
  date: string; // YYYY-MM-DD
  mood: number | null;   // 1-5
  rpe: number | null;    // 1-10
}

// ─── Dashboard Today Response ─────────────────────────────────────────────────

export interface DashboardToday {
  greeting: string;
  todayWorkout: TodayWorkout | null;
  healthSnapshot: HealthSnapshot | null;
  fitnessStatus: FitnessStatus | null;
  weekProgress: WeekProgress | null;
  lastWellness: LastWellness | null;
  recentActivities: ActivitySummary[];
}

// ─── Weekly Summary ───────────────────────────────────────────────────────────

export interface DayVolume {
  date: string;       // YYYY-MM-DD
  dayLabel: string;   // "Mon", "Tue", etc.
  planned: number;    // hours
  completed: number;  // hours
  tss: number | null;
}

export interface WeeklySummary {
  weekLabel: string;       // e.g. "May 26 – Jun 1"
  totalPlannedHours: number;
  totalCompletedHours: number;
  totalTss: number | null;
  compliance: number;       // percentage 0-100
  days: DayVolume[];
}

// ─── Fitness Trend ────────────────────────────────────────────────────────────

export interface FitnessTrendPoint {
  date: string;  // YYYY-MM-DD
  ctl: number;
  atl: number;
  tsb: number;
}

export interface FitnessTrendResponse {
  points: FitnessTrendPoint[];
  currentCtl: number;
  currentAtl: number;
  currentTsb: number;
}
