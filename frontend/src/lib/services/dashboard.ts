// src/lib/services/dashboard.ts
// API service layer for dashboard — wraps api.ts with typed helpers.
// Endpoints: GET /dashboard/today, /dashboard/weekly-summary, /dashboard/fitness-trend

import { api } from "@/lib/api";
import type {
  DashboardToday,
  WeeklySummary,
  FitnessTrendResponse,
} from "@/lib/types/dashboard";

export const dashboardService = {
  /**
   * GET /dashboard/today
   * Morning briefing: greeting, today's workout, health snapshot,
   * fitness status, week progress, recent activities.
   */
  getToday: (): Promise<DashboardToday> =>
    api.get<DashboardToday>("/dashboard/today"),

  /**
   * GET /dashboard/weekly-summary
   * Per-day planned vs actual volume for the current week.
   */
  getWeeklySummary: (): Promise<WeeklySummary> =>
    api.get<WeeklySummary>("/dashboard/weekly-summary"),

  /**
   * GET /dashboard/fitness-trend?days=N
   * CTL/ATL/TSB sparkline data.
   * Free tier: 30-day; Pro+: 90-day.
   */
  getFitnessTrend: (days: 30 | 90 = 90): Promise<FitnessTrendResponse> =>
    api.get<FitnessTrendResponse>(`/dashboard/fitness-trend?days=${days}`),
};
