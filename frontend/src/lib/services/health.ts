// src/lib/services/health.ts
// API service layer for health data (daily summaries, sleep, trends).
// These endpoints are served by HealthController.java.
//
// Endpoints:
//   GET /health/daily?from=&to=    — daily health summaries (steps, HRV, restingHr, etc.)
//   GET /health/sleep?from=&to=    — sleep records
//   GET /health/trends?metric=&days= — trend data for a specific health metric

import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DailyHealthSummary {
  date: string;               // YYYY-MM-DD
  steps: number | null;
  activeCalories: number | null;
  totalCalories: number | null;
  restingHr: number | null;   // bpm
  hrv: number | null;
  weightKg: number | null;
  floorsClimbed: number | null;
  source: string;
}

export interface SleepRecord {
  date: string;               // night of YYYY-MM-DD
  totalMinutes: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
  lightMinutes: number | null;
  awakeMinutes: number | null;
  score: number | null;       // 0–100
  source: string;
}

export interface HealthTrendPoint {
  date: string;
  value: number;
}

export interface HealthTrendResponse {
  metric: string;
  points: HealthTrendPoint[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const healthService = {
  /**
   * GET /health/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns daily health summaries (steps, HRV, weight, etc.) in date range.
   */
  listDaily: (params?: { from?: string; to?: string }): Promise<DailyHealthSummary[]> => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const q = qs.toString();
    return api.get<DailyHealthSummary[]>(`/health/daily${q ? `?${q}` : ""}`);
  },

  /**
   * GET /health/sleep?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns sleep records in date range.
   */
  listSleep: (params?: { from?: string; to?: string }): Promise<SleepRecord[]> => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    const q = qs.toString();
    return api.get<SleepRecord[]>(`/health/sleep${q ? `?${q}` : ""}`);
  },

  /**
   * GET /health/trends?metric=&days=N
   * Returns trend data for a specific health metric over N days.
   * Common metrics: "hrv", "restingHr", "weight", "steps"
   */
  getTrend: (metric: string, days = 90): Promise<HealthTrendResponse> =>
    api.get<HealthTrendResponse>(`/health/trends?metric=${encodeURIComponent(metric)}&days=${days}`),
};
