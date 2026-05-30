// src/lib/types/activity.ts
// Type definitions for activities — aligned to docs/05-api-design.md

export type Sport =
  | "cycling"
  | "running"
  | "swimming"
  | "strength"
  | "other";

export type ActivitySource = "strava" | "garmin" | "manual" | "upload";

/** Activity summary returned by GET /activities (list) */
export interface ActivitySummary {
  id: string;
  sport: Sport;
  name: string;
  startedAt: string; // ISO 8601
  durationSeconds: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  avgPower: number | null;
  tss: number | null;
  source: ActivitySource;
}

/** Paginated response from GET /activities */
export interface PaginatedActivities {
  content: ActivitySummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Query params for GET /activities */
export interface ActivitiesFilter {
  page?: number;
  size?: number;
  sport?: Sport | "";
  source?: ActivitySource | "";
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  sort?: string; // e.g. "startedAt,desc"
}
