// src/lib/services/activities.ts
// API service layer for activities — wraps api.ts with typed helpers.

import { api } from "@/lib/api";
import type {
  ActivitySummary,
  ActivitiesFilter,
  PaginatedActivities,
} from "@/lib/types/activity";

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

  /** GET /activities/{id} — full detail */
  get: (id: string): Promise<ActivitySummary> =>
    api.get<ActivitySummary>(`/activities/${id}`),

  /** DELETE /activities/{id} */
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/activities/${id}`),
};
