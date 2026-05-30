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
  list: (from: string, to: string): Promise<CalendarEvent[]> =>
    api.get<CalendarEvent[]>(`/calendar?from=${from}&to=${to}`),

  /**
   * POST /calendar
   * Create a new calendar event (schedule workout, rest day, etc.)
   */
  create: (payload: CreateCalendarPayload): Promise<CalendarEvent> =>
    api.post<CalendarEvent>("/calendar", payload),

  /**
   * PUT /calendar/{id}
   * Update an existing calendar event (reschedule date, change notes, etc.)
   */
  update: (id: string, payload: UpdateCalendarPayload): Promise<CalendarEvent> =>
    api.put<CalendarEvent>(`/calendar/${id}`, payload),

  /**
   * DELETE /calendar/{id}
   * Remove a calendar event entirely.
   */
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/calendar/${id}`),

  /**
   * PUT /calendar/{id}/complete
   * Manually mark a planned event as completed.
   */
  markComplete: (id: string): Promise<CalendarEvent> =>
    api.put<CalendarEvent>(`/calendar/${id}/complete`),

  /**
   * PUT /calendar/{id}/skip
   * Mark an event as skipped (user chose not to do it).
   */
  markSkipped: (id: string): Promise<CalendarEvent> =>
    api.put<CalendarEvent>(`/calendar/${id}/skip`),

  /**
   * POST /calendar/reorder
   * Reorder events on the same day.
   */
  reorder: (eventIds: string[]): Promise<void> =>
    api.post<void>("/calendar/reorder", { eventIds }),
};
