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
    api.get<any>(`/activities/${id}/streams`).then((res) => {
      if (!res || !res.timestamps) return { points: [] };
      const points: StreamPoint[] = [];
      const len = res.timestamps.length;
      for (let i = 0; i < len; i++) {
        points.push({
          t: res.timestamps[i],
          hr: res.heartRate && res.heartRate[i] !== 0 ? res.heartRate[i] : undefined,
          power: res.power && res.power[i] !== 0 ? res.power[i] : undefined,
          cadence: res.cadence && res.cadence[i] !== 0 ? res.cadence[i] : undefined,
          speed: res.speed ? res.speed[i] : undefined,
          altitude: res.altitude ? res.altitude[i] : undefined,
          lat: res.latitude ? res.latitude[i] : undefined,
          lng: res.longitude ? res.longitude[i] : undefined,
          distance: res.distance ? res.distance[i] : undefined,
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
