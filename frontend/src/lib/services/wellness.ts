// src/lib/services/wellness.ts
// API service layer for wellness data.
// Endpoints:
//   GET  /wellness?from=...&to=...  — paginated history
//   POST /wellness                  — log today's wellness
//   PUT  /wellness/{date}           — update a specific date's entry

import { api } from "@/lib/api";
import type {
  WellnessEntry,
  WellnessListResponse,
  WellnessLogRequest,
} from "@/lib/types/wellness";

export const wellnessService = {
  /**
   * GET /wellness?from=...&to=...
   * Returns wellness entries in date range (inclusive).
   * If from/to omitted, backend returns last 30 days.
   */
  list: (params?: { from?: string; to?: string }): Promise<WellnessListResponse> => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to)   qs.set("to", params.to);
    const q = qs.toString();
    return api.get<WellnessListResponse>(`/wellness${q ? `?${q}` : ""}`);
  },

  /**
   * GET /wellness?from={today}&to={today}
   * Convenience: fetch just today's entry.
   */
  getToday: (): Promise<WellnessEntry | null> => {
    const today = new Date().toISOString().split("T")[0];
    return wellnessService
      .list({ from: today, to: today })
      .then((r) => r.content[0] ?? null);
  },

  /**
   * POST /wellness
   * Log a new wellness entry.
   * The backend will 409 if an entry for that date already exists.
   * In that case, call update() instead.
   */
  log: (body: WellnessLogRequest): Promise<WellnessEntry> =>
    api.post<WellnessEntry>("/wellness", body),

  /**
   * PUT /wellness/{date}
   * Update an existing entry for a specific date (YYYY-MM-DD).
   */
  update: (date: string, body: Partial<WellnessLogRequest>): Promise<WellnessEntry> =>
    api.put<WellnessEntry>(`/wellness/${date}`, body),

  /**
   * Upsert helper: tries POST first, falls back to PUT on 409 conflict.
   */
  upsert: async (body: WellnessLogRequest): Promise<WellnessEntry> => {
    try {
      return await wellnessService.log(body);
    } catch (e: unknown) {
      // 409 Conflict → entry already exists for this date
      const err = e as { status?: number };
      if (err?.status === 409) {
        const date = body.date ?? new Date().toISOString().split("T")[0];
        return wellnessService.update(date, body);
      }
      throw e;
    }
  },
};
