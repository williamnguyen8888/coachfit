// src/lib/services/wellness.ts
// API service layer for wellness data.
// Endpoints:
//   GET  /wellness?from=...&to=...  — returns WellnessEntry[] (raw array, NOT paginated)
//   POST /wellness                  — log today's wellness
//   PUT  /wellness/{date}           — update a specific date's entry (date in URL path)
//
// IMPORTANT: The backend returns a raw JSON array for GET /wellness,
// NOT a paginated { content: [] } envelope.

import { api } from "@/lib/api";
import { toLocalDateString } from "@/lib/utils";
import type {
  WellnessEntry,
  WellnessListResponse,
  WellnessLogRequest,
} from "@/lib/types/wellness";

export const wellnessService = {
  /**
   * GET /wellness?from=...&to=...
   * Returns WellnessEntry[] (raw array) in date range (inclusive).
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
   * Convenience: fetch just today's entry (returns null if none).
   * Handles both raw array and legacy { content: [] } shapes defensively.
   */
  getToday: (): Promise<WellnessEntry | null> => {
    const today = toLocalDateString(new Date());
    return wellnessService
      .list({ from: today, to: today })
      .then((data) => {
        // Backend returns raw array; defensive check for old envelope shape
        if (Array.isArray(data)) return data[0] ?? null;
        const obj = data as unknown as Record<string, unknown>;
        if (Array.isArray(obj.content)) return (obj.content as WellnessEntry[])[0] ?? null;
        return null;
      });
  },

  /**
   * POST /wellness
   * Log a new wellness entry.
   * The backend will 409 if an entry for that date already exists.
   * In that case, call update() instead.
   * Note: `date` is NOT part of the request body — backend uses today's date.
   */
  log: (body: WellnessLogRequest): Promise<WellnessEntry> =>
    api.post<WellnessEntry>("/wellness", body),

  /**
   * PUT /wellness/{date}
   * Update an existing entry for a specific date (YYYY-MM-DD).
   * Date is passed in the URL path, not in the request body.
   */
  update: (date: string, body: Partial<WellnessLogRequest>): Promise<WellnessEntry> =>
    api.put<WellnessEntry>(`/wellness/${date}`, body),

  /**
   * Upsert helper: tries POST first, falls back to PUT on 409 conflict.
   * Pass `date` separately so it can be included in the PUT URL path.
   */
  upsert: async (body: WellnessLogRequest, date?: string): Promise<WellnessEntry> => {
    const targetDate = date ?? toLocalDateString(new Date());
    try {
      return await wellnessService.log(body);
    } catch (e: unknown) {
      // 409 Conflict → entry already exists for this date
      const err = e as { status?: number };
      if (err?.status === 409) {
        return wellnessService.update(targetDate, body);
      }
      throw e;
    }
  },
};
