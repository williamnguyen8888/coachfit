// src/lib/services/workouts.ts
// API service layer for workouts — wraps api.ts with typed helpers.
// Endpoints aligned to docs/05-api-design.md § Workouts

import { api } from "@/lib/api";
import type {
  WorkoutSummary,
  WorkoutDetail,
  WorkoutsFilter,
  PaginatedWorkouts,
  WorkoutPayload,
} from "@/lib/types/workout";

export interface FitExportResult {
  /** Pre-signed download URL (24 h expiry) — backend field: `downloadUrl` */
  downloadUrl: string;
  /** Suggested filename e.g. "Tempo_Intervals.fit" — backend field: `filename` */
  filename: string;
}

export interface SchedulePayload {
  workoutId: string;
  date: string; // ISO date "YYYY-MM-DD"
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  status: string;
  assignedBy: string | null;
}

function buildQuery(filter: WorkoutsFilter): string {
  const params = new URLSearchParams();
  if (filter.page !== undefined) params.set("page", String(filter.page));
  if (filter.size !== undefined) params.set("size", String(filter.size));
  if (filter.sport) params.set("sport", filter.sport);
  if (filter.sort) params.set("sort", filter.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const workoutsService = {
  /** GET /workouts — user's workout library (paginated) */
  list: (filter: WorkoutsFilter = {}): Promise<PaginatedWorkouts> => {
    const merged: WorkoutsFilter = { size: 20, sort: "createdAt,desc", ...filter };
    return api.get<PaginatedWorkouts>(`/workouts${buildQuery(merged)}`);
  },

  /** GET /workouts/templates — CoachFit system templates (paginated) */
  listTemplates: (): Promise<PaginatedWorkouts> =>
    api.get<PaginatedWorkouts>("/workouts/templates"),

  /** GET /workouts/{id} — full detail with steps */
  get: (id: string): Promise<WorkoutDetail> =>
    api.get<WorkoutDetail>(`/workouts/${id}`),

  /** POST /workouts — create a new workout */
  create: (payload: WorkoutPayload): Promise<WorkoutDetail> =>
    api.post<WorkoutDetail>("/workouts", payload),

  /** PUT /workouts/{id} — update an existing workout */
  update: (id: string, payload: WorkoutPayload): Promise<WorkoutDetail> =>
    api.put<WorkoutDetail>(`/workouts/${id}`, payload),

  /** DELETE /workouts/{id} */
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/workouts/${id}`),

  /**
   * GET /workouts/{id}/export/fit
   * Returns a pre-signed download URL for the .FIT file.
   */
  exportFit: (id: string): Promise<FitExportResult> =>
    api.get<FitExportResult>(`/workouts/${id}/export/fit`),

  /**
   * POST /calendar — schedule a workout to a specific date.
   * Aligned to docs/05-api-design.md § Calendar.
   */
  scheduleToCalendar: (payload: SchedulePayload): Promise<CalendarEvent> =>
    api.post<CalendarEvent>("/calendar", payload),
};
