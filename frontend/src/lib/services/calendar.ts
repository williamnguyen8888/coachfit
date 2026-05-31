// src/lib/services/calendar.ts
// API service layer for calendar — wraps api.ts with typed helpers.
// Endpoints aligned to docs/05-api-design.md § Calendar

import { api } from "@/lib/api";
import type {
  CalendarEvent,
  CreateCalendarPayload,
  UpdateCalendarPayload,
} from "@/lib/types/calendar";

export const calendarService = {
  /**
   * GET /calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns all events in the given date range (flat array, no pagination).
   */
  list: async (from: string, to: string): Promise<CalendarEvent[]> => {
    const events = await api.get<any[]>(`/calendar?from=${from}&to=${to}`);
    return events.map((e) => ({
      ...e,
      notes: e.description || null,
    }));
  },

  /**
   * POST /calendar
   * Create a new calendar event (schedule workout, rest day, etc.)
   */
  create: async (payload: CreateCalendarPayload): Promise<CalendarEvent> => {
    const { notes, ...rest } = payload;
    const body = {
      ...rest,
      description: notes,
    };
    const event = await api.post<any>("/calendar", body);
    return {
      ...event,
      notes: event.description || null,
    };
  },

  /**
   * PUT /calendar/{id}
   * Update an existing calendar event (reschedule date, change notes, etc.)
   * Returns void — backend responds 200 with no body.
   */
  update: (id: string, payload: UpdateCalendarPayload): Promise<void> => {
    const { notes, ...rest } = payload;
    const body = {
      ...rest,
      description: notes,
    };
    return api.put<void>(`/calendar/${id}`, body);
  },

  /**
   * DELETE /calendar/{id}
   * Remove a calendar event entirely.
   */
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/calendar/${id}`),

  /**
   * PUT /calendar/{id}/complete
   * Manually mark a planned event as completed.
   * Returns void — backend responds 200 with no body.
   */
  markComplete: (id: string): Promise<void> =>
    api.put<void>(`/calendar/${id}/complete`),

  /**
   * PUT /calendar/{id}/skip
   * Mark an event as skipped (user chose not to do it).
   * Returns void — backend responds 200 with no body.
   */
  markSkipped: (id: string): Promise<void> =>
    api.put<void>(`/calendar/${id}/skip`),

  /**
   * POST /calendar/reorder
   * Reorder events on the same day.
   */
  reorder: (eventIds: string[]): Promise<void> =>
    api.post<void>("/calendar/reorder", { eventIds }),

  /**
   * POST /calendar/{id}/sync-garmin
   * Push a workout calendar event to the user's Garmin Connect calendar.
   * Requires: event must have a workout, user must have Garmin connected.
   * Returns garminWorkoutId + garminScheduledId from the Garmin Training API.
   */
  syncToGarmin: (id: string): Promise<GarminSyncResult> =>
    api.post<GarminSyncResult>(`/calendar/${id}/sync-garmin`),

  /**
   * DELETE /calendar/{id}/sync-garmin
   * Remove a previously synced workout from the user's Garmin Connect calendar.
   * No-op if the event was never synced.
   */
  removeFromGarmin: (id: string): Promise<void> =>
    api.delete<void>(`/calendar/${id}/sync-garmin`),
};

/** Response from POST /calendar/{id}/sync-garmin */
export interface GarminSyncResult {
  garminWorkoutId: string;
  garminScheduledId: string;
  scheduledDate: string; // ISO date: "YYYY-MM-DD"
}
