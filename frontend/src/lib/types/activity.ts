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

/** Full activity detail from GET /activities/{id} */
export interface ActivityDetail extends ActivitySummary {
  subSport: string | null;
  description: string | null;
  movingTimeSeconds: number | null;
  elevationGainMeters: number | null;
  calories: number | null;
  maxHeartRate: number | null;
  maxPower: number | null;
  normalizedPower: number | null;
  intensityFactor: number | null;
  avgCadence: number | null;
  avgSpeed: number | null;
  startLat: number | null;
  startLng: number | null;
  gear: { id: string; name: string } | null;
  rawFileFormat: string | null;
}

/** Single lap from GET /activities/{id}/laps */
export interface ActivityLap {
  lapIndex: number;
  startTime: string;
  durationSeconds: number;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgPower: number | null;
  maxPower: number | null;
  avgCadence: number | null;
  avgPace: number | null;
  avgSpeed: number | null;
  elevationGain: number | null;
}

/** A single data-point in a stream */
export interface StreamPoint {
  t: number;            // seconds from activity start
  hr?: number;          // bpm
  power?: number;       // watts
  cadence?: number;     // rpm
  speed?: number;       // m/s
  altitude?: number;    // meters
  lat?: number;         // decimal degrees
  lng?: number;         // decimal degrees
  distance?: number;    // meters from start (cumulative)
  grade?: number;       // percent
  temperature?: number; // °C
}

/** Response from GET /activities/{id}/streams */
export interface ActivityStreams {
  points: StreamPoint[];
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
