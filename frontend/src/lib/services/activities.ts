// src/lib/services/activities.ts
// API service layer for activities — wraps api.ts with typed helpers.

import { api, apiUpload } from "@/lib/api";
import type {
  ActivityDetail,
  ActivityLap,
  ActivityStreams,
  StreamPoint,
  ActivitiesFilter,
  PaginatedActivities,
} from "@/lib/types/activity";

/** Response from POST /activities/upload */
export interface ActivityUploadResponse {
  id: string;
  name: string;
  sport: string;
  startedAt: string;
  durationSeconds: number;
  distanceMeters: number | null;
  source: string;
  rawFileFormat: string;
}

/** Response from GET /activities/{id}/download */
export interface ActivityDownloadResponse {
  /** Pre-signed URL valid for `expiresInSeconds` */
  url: string;
  /** File format, e.g. "FIT", "TCX", "GPX" */
  format: string;
  expiresInSeconds: number;
}

interface ActivityStreamsApiResponse {
  timestamps?: number[];
  heartRate?: number[];
  power?: number[];
  cadence?: number[];
  speed?: number[];
  altitude?: number[];
  latitude?: number[];
  longitude?: number[];
  distance?: number[];
  grade?: number[];
  temperature?: number[];
}

/** Request body for PUT /activities/{id} */
export interface ActivityUpdateRequest {
  name?: string;
  description?: string;
  gearId?: string;
}

function buildQuery(filter: ActivitiesFilter): string {
  const params = new URLSearchParams();
  if (filter.page !== undefined) params.set("page", String(filter.page));
  if (filter.size !== undefined) params.set("size", String(filter.size));
  if (filter.sport) params.set("sport", filter.sport);
  if (filter.source) params.set("source", filter.source);
  if (filter.from) params.set("from", filter.from);
  if (filter.to) params.set("to", filter.to);
  if (filter.sort) params.set("sort", filter.sort);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const activitiesService = {
  /** GET /activities — paginated, filterable */
  list: (filter: ActivitiesFilter = {}): Promise<PaginatedActivities> => {
    const merged: ActivitiesFilter = { size: 20, sort: "startedAt,desc", ...filter };
    return api.get<PaginatedActivities>(`/activities${buildQuery(merged)}`);
  },

  /** GET /activities/{id} — full detail with all metrics */
  get: (id: string): Promise<ActivityDetail> =>
    api.get<ActivityDetail>(`/activities/${id}`),

  /** GET /activities/{id}/streams — time-series data */
  getStreams: (id: string): Promise<ActivityStreams> =>
    api.get<ActivityStreamsApiResponse>(`/activities/${id}/streams`).then((res) => {
      if (!res || !res.timestamps) return { points: [] };

      const heartRate = res.heartRate ?? [];
      const power = res.power ?? [];
      const cadence = res.cadence ?? [];
      const speed = res.speed ?? [];
      const altitude = res.altitude ?? [];
      const latitude = res.latitude ?? [];
      const longitude = res.longitude ?? [];
      const distance = res.distance ?? [];
      const grade = res.grade ?? [];
      const temperature = res.temperature ?? [];

      // Sentinel values used by backend to represent null in primitive arrays
      const INT_SENTINEL = -2147483648;   // Integer.MIN_VALUE
      const SHORT_SENTINEL = -32768;      // Short.MIN_VALUE

      const isSentinel = (v: number): boolean =>
        v === INT_SENTINEL || v === SHORT_SENTINEL || !Number.isFinite(v);

      const points: StreamPoint[] = [];
      const len = res.timestamps.length;
      for (let i = 0; i < len; i++) {
        const hasGps = latitude.length > i
          && longitude.length > i
          && !(latitude[i] === 0 && longitude[i] === 0)
          && !isSentinel(latitude[i])
          && !isSentinel(longitude[i]);

        const hr = heartRate.length > i && !isSentinel(heartRate[i]) ? heartRate[i] : undefined;
        const pwr = power.length > i && !isSentinel(power[i]) ? power[i] : undefined;
        const cad = cadence.length > i && !isSentinel(cadence[i]) ? cadence[i] : undefined;
        const spd = speed.length > i && !isSentinel(speed[i]) ? speed[i] : undefined;
        const alt = altitude.length > i && !isSentinel(altitude[i]) ? altitude[i] : undefined;
        const dist = distance.length > i && !isSentinel(distance[i]) ? distance[i] : undefined;
        const grd = grade.length > i && !isSentinel(grade[i]) ? grade[i] : undefined;
        const temp = temperature.length > i && !isSentinel(temperature[i]) ? temperature[i] : undefined;

        points.push({
          t: res.timestamps[i],
          hr: hr !== undefined && hr > 0 ? hr : undefined,
          power: pwr !== undefined && pwr > 0 ? pwr : undefined,
          cadence: cad !== undefined && cad > 0 ? cad : undefined,
          speed: spd,
          altitude: alt,
          lat: hasGps ? latitude[i] : undefined,
          lng: hasGps ? longitude[i] : undefined,
          distance: dist,
          grade: grd,
          temperature: temp,
        });
      }
      return { points };
    }),


  /** GET /activities/{id}/laps — laps breakdown */
  getLaps: (id: string): Promise<{ laps: ActivityLap[] }> =>
    api.get<{ laps: ActivityLap[] }>(`/activities/${id}/laps`),

  /**
   * POST /activities/upload
   * Upload a FIT/TCX/GPX file for processing.
   * Returns 201 on success, 409 DUPLICATE if activity already exists.
   */
  upload: (file: File): Promise<ActivityUploadResponse> => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload<ActivityUploadResponse>("/activities/upload", fd);
  },

  /**
   * GET /activities/{id}/download
   * Returns a pre-signed URL to download the raw file.
   */
  getDownloadUrl: (id: string): Promise<ActivityDownloadResponse> =>
    api.get<ActivityDownloadResponse>(`/activities/${id}/download`),

  /**
   * PUT /activities/{id}
   * Update editable fields: name, description, gearId.
   * Sport, start time, and power data are read-only (set by ingestion pipeline).
   */
  update: (id: string, body: ActivityUpdateRequest): Promise<ActivityDetail> =>
    api.put<ActivityDetail>(`/activities/${id}`, body),

  /** DELETE /activities/{id} */
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/activities/${id}`),
};
