// src/stores/calendar.store.ts
// Zustand store for calendar state management.
// Handles: view mode, date navigation, event fetching, CRUD operations.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calendarService } from "@/lib/services/calendar";
import { wellnessService } from "@/lib/services/wellness";
import { healthService } from "@/lib/services/health";
import {
  addLocalDays,
  parseLocalDateString,
  toLocalDateString,
} from "@/lib/utils";
import type {
  CalendarEvent,
  CalendarViewMode,
  CreateCalendarPayload,
  UpdateCalendarPayload,
  EventsByDate,
} from "@/lib/types/calendar";
import type { WellnessEntry } from "@/lib/types/wellness";
import type { DailyHealthSummary, SleepRecord } from "@/lib/services/health";

/** Monday of the week containing the given date */
function weekStart(dateStr: string): string {
  const d = parseLocalDateString(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return toLocalDateString(d);
}

/** First day of the month containing the given date */
function monthStart(dateStr: string): string {
  const d = parseLocalDateString(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Group a flat array of events by their date string */
function groupByDate(events: CalendarEvent[]): EventsByDate {
  return events.reduce<EventsByDate>((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    // Sort by orderIndex within each day
    acc[event.date].sort((a, b) => a.orderIndex - b.orderIndex);
    return acc;
  }, {});
}

// ─── Store types ──────────────────────────────────────────────────────────────

interface CalendarState {
  // View
  viewMode: CalendarViewMode;
  /** Anchor date — the week/month currently in view is calculated from this */
  anchorDate: string; // "YYYY-MM-DD"

  // Data
  events: CalendarEvent[];
  eventsByDate: EventsByDate;
  wellnessByDate: Record<string, WellnessEntry>;
  healthSummaryByDate: Record<string, DailyHealthSummary>;
  sleepByDate: Record<string, SleepRecord>;
  loadedFrom: string | null;
  loadedTo: string | null;

  // UI
  isLoading: boolean;
  error: string | null;

  // Derived range helpers (computed from anchorDate)
  getWeekRange: () => { from: string; to: string };
  getMonthRange: () => { from: string; to: string };

  // Navigation
  setViewMode: (mode: CalendarViewMode) => void;
  goToToday: () => void;
  nextPeriod: () => void;
  prevPeriod: () => void;

  // Data fetching
  fetchCurrentRange: (silent?: boolean) => Promise<void>;

  // CRUD
  createEvent: (payload: CreateCalendarPayload) => Promise<CalendarEvent>;
  updateEvent: (id: string, payload: UpdateCalendarPayload) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  markComplete: (id: string) => Promise<void>;
  markSkipped: (id: string) => Promise<void>;

  /**
   * Reorder events within the same day.
   * Optimistically updates local state, then syncs to POST /calendar/reorder.
   */
  reorderEvents: (date: string, orderedIds: string[]) => Promise<void>;

  /**
   * Move an event to a different date.
   * Optimistically updates local state, then syncs to PUT /calendar/{id}.
   */
  moveEvent: (eventId: string, toDate: string) => Promise<void>;

  /**
   * Manually link an activity to a workout calendar event.
   * Calls PUT /calendar/{id}/link-activity?activityId=... then re-fetches.
   */
  linkActivity: (eventId: string, activityId: string) => Promise<void>;

  /**
   * Manually unlink an activity from a calendar event.
   * Calls PUT /calendar/{id}/unlink-activity then re-fetches.
   */
  unlinkActivity: (eventId: string) => Promise<void>;

  // Internal helpers
  _upsertEvent: (event: CalendarEvent) => void;
  _removeEvent: (id: string) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      viewMode: "week",
      anchorDate: toLocalDateString(new Date()),

      events: [],
      eventsByDate: {},
      wellnessByDate: {},
      healthSummaryByDate: {},
      sleepByDate: {},
      loadedFrom: null,
      loadedTo: null,

      isLoading: false,
      error: null,

      // ── Derived range helpers ──────────────────────────────────────────────

      getWeekRange: () => {
        const { anchorDate } = get();
        const from = weekStart(anchorDate);
        const to = addLocalDays(from, 6);
        return { from, to };
      },

      getMonthRange: () => {
        const { anchorDate } = get();
        // ISSUE-07: Compute the actual grid boundaries dynamically.
        // Month view starts on Monday of the week containing the 1st of the month,
        // and ends on Sunday of the week containing the last day of the month.
        const d = parseLocalDateString(anchorDate);
        const firstOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const lastOfMonth  = new Date(d.getFullYear(), d.getMonth() + 1, 0);

        // Grid start: Monday on or before the 1st
        const startDayOfWeek = firstOfMonth.getDay();
        const daysBack = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
        const gridStart = new Date(firstOfMonth);
        gridStart.setDate(gridStart.getDate() - daysBack);

        // Grid end: Sunday on or after the last day
        const endDayOfWeek = lastOfMonth.getDay();
        const daysForward = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
        const gridEnd = new Date(lastOfMonth);
        gridEnd.setDate(gridEnd.getDate() + daysForward);

        const from = toLocalDateString(gridStart);
        const to   = toLocalDateString(gridEnd);
        return { from, to };
      },

      // ── Navigation ────────────────────────────────────────────────────────

      setViewMode: (mode) => set({ viewMode: mode }),

      goToToday: () =>
        set({ anchorDate: toLocalDateString(new Date()), error: null }),

      nextPeriod: () => {
        const { viewMode, anchorDate } = get();
        if (viewMode === "week") {
          set({ anchorDate: addLocalDays(anchorDate, 7) });
        } else {
          const d = parseLocalDateString(anchorDate);
          d.setMonth(d.getMonth() + 1, 1);
          set({ anchorDate: toLocalDateString(d) });
        }
      },

      prevPeriod: () => {
        const { viewMode, anchorDate } = get();
        if (viewMode === "week") {
          set({ anchorDate: addLocalDays(anchorDate, -7) });
        } else {
          const d = parseLocalDateString(anchorDate);
          d.setMonth(d.getMonth() - 1, 1);
          set({ anchorDate: toLocalDateString(d) });
        }
      },

      // ── Data fetching ─────────────────────────────────────────────────────
      fetchCurrentRange: async (silent = false) => {
        const { viewMode, getWeekRange, getMonthRange } = get();
        const { from, to } =
          viewMode === "week" ? getWeekRange() : getMonthRange();

        if (!silent) {
          set({ isLoading: true, error: null });
        } else {
          set({ error: null });
        }
        try {
          const [events, wellnessRes, healthDailyRes, sleepRes] = await Promise.all([
            calendarService.list(from, to),
            wellnessService.list({ from, to }).catch((err) => {
              console.error("Failed to load wellness for calendar:", err);
              return [];
            }),
            healthService.listDaily({ from, to }).catch((err) => {
              console.error("Failed to load daily health summaries for calendar:", err);
              return [];
            }),
            healthService.listSleep({ from, to }).catch((err) => {
              console.error("Failed to load sleep records for calendar:", err);
              return [];
            }),
          ]);

          // Map wellness entries by date
          const wellnessByDate: Record<string, WellnessEntry> = {};
          wellnessRes.forEach((entry) => {
            if (entry.date) wellnessByDate[entry.date] = entry;
          });

          // Map health summaries by date
          const healthSummaryByDate: Record<string, DailyHealthSummary> = {};
          healthDailyRes.forEach((summary) => {
            if (summary.date) healthSummaryByDate[summary.date] = summary;
          });

          // Map sleep records by date
          const sleepByDate: Record<string, SleepRecord> = {};
          sleepRes.forEach((record) => {
            if (record.date) sleepByDate[record.date] = record;
          });

          set({
            events,
            eventsByDate: groupByDate(events),
            wellnessByDate,
            healthSummaryByDate,
            sleepByDate,
            loadedFrom: from,
            loadedTo: to,
            isLoading: false,
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to load calendar";
          set({ isLoading: false, error: message });
        }
      },
      // ── CRUD ──────────────────────────────────────────────────────────────

      createEvent: async (payload) => {
        // Backend creates the event AND may auto-link an existing activity.
        // Re-fetch to get the actual state (including any auto-link side-effects).
        const event = await calendarService.create(payload);
        await get().fetchCurrentRange(true);
        return event;
      },

      updateEvent: async (id, payload) => {
        // Build full payload (backend requires date + eventType + title every time).
        const existing = get().events.find((e) => e.id === id);
        if (!existing) return;

        const fullPayload: UpdateCalendarPayload = {
          date: payload.date ?? existing.date,
          eventType: payload.eventType ?? existing.eventType,
          title: payload.title ?? existing.title,
          notes: payload.notes !== undefined ? payload.notes : (existing.notes ?? undefined),
          workoutId: payload.workoutId !== undefined ? payload.workoutId : (existing.workout?.id ?? undefined),
        };

        // Backend is source of truth: call API, then re-fetch.
        // Backend handles: unlink/re-link activity, auto-link on reschedule, status transitions.
        try {
          await calendarService.update(id, fullPayload);
          await get().fetchCurrentRange(true);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to update calendar event" });
          throw err;
        }
      },

      deleteEvent: async (id) => {
        try {
          await calendarService.delete(id);
          // Re-fetch instead of local remove: backend may have cleaned up linked events.
          await get().fetchCurrentRange(true);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to delete calendar event" });
          throw err;
        }
      },

      markComplete: async (id) => {
        // No frontend guard — backend enforces state machine (only partial → completed).
        // Backend returns 409 if the current status does not allow this transition.
        try {
          await calendarService.markComplete(id);
          await get().fetchCurrentRange(true);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to complete calendar event" });
          throw err;
        }
      },

      markSkipped: async (id) => {
        // No frontend guard — backend enforces state machine (only planned → skipped).
        try {
          await calendarService.markSkipped(id);
          await get().fetchCurrentRange(true);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to skip calendar event" });
          throw err;
        }
      },

      reorderEvents: async (date, orderedIds) => {
        // Snapshot for rollback
        const previousEvents = get().events;
        const previousById = get().eventsByDate;

        // Optimistic update: reorder local events for this date
        set((state) => {
          const updatedEvents = state.events.map((e) => {
            if (e.date !== date) return e;
            const newIndex = orderedIds.indexOf(e.id);
            if (newIndex === -1) return e;
            return { ...e, orderIndex: newIndex };
          });
          return {
            events: updatedEvents,
            eventsByDate: groupByDate(updatedEvents),
          };
        });

        try {
          await calendarService.reorder(orderedIds);
        } catch {
          // Rollback
          set({ events: previousEvents, eventsByDate: previousById });
        }
      },

      moveEvent: async (eventId, toDate) => {
        // Find the event
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;

        // Snapshot for visual rollback
        const previousEvents = get().events;
        const previousById   = get().eventsByDate;

        // Optimistic: ONLY move the visual position. Do NOT touch activity/status/complianceScore.
        // Backend decides what happens to the link (unlink? auto-relink? keep?). We'll re-fetch
        // to get the true state. The card shows a loading shimmer while we wait.
        set((state) => {
          const targetDayEvents = state.eventsByDate[toDate] ?? [];
          const newOrderIndex = targetDayEvents.length;
          const nextEvents = state.events.map((e) =>
            e.id === eventId ? { ...e, date: toDate, orderIndex: newOrderIndex } : e
          );
          return { events: nextEvents, eventsByDate: groupByDate(nextEvents) };
        });

        try {
          await calendarService.update(eventId, {
            date: toDate,
            eventType: event.eventType,
            title: event.title,
            notes: event.notes ?? undefined,
            workoutId: event.workout?.id ?? undefined,
          });
          // Re-fetch to resolve the true state (backend may have auto-relinked, unlinked, etc.)
          await get().fetchCurrentRange(true);
        } catch (err) {
          // Rollback visual move
          set({ events: previousEvents, eventsByDate: previousById });
          set({ error: err instanceof Error ? err.message : "Failed to move calendar event" });
          throw err;
        }
      },

      linkActivity: async (eventId, activityId) => {
        try {
          await calendarService.linkActivity(eventId, activityId);
          await get().fetchCurrentRange(true);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to link activity" });
          throw err;
        }
      },

      unlinkActivity: async (eventId) => {
        try {
          await calendarService.unlinkActivity(eventId);
          await get().fetchCurrentRange(true);
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Failed to unlink activity" });
          throw err;
        }
      },

      // ── Internal helpers ──────────────────────────────────────────────────

      _upsertEvent: (event) => {
        set((state) => {
          const filtered = state.events.filter((e) => e.id !== event.id);
          const next = [...filtered, event];
          return {
            events: next,
            eventsByDate: groupByDate(next),
          };
        });
      },

      _removeEvent: (id) => {
        set((state) => {
          const next = state.events.filter((e) => e.id !== id);
          return {
            events: next,
            eventsByDate: groupByDate(next),
          };
        });
      },
    }),
    {
      name: "coachfit-calendar",
      // Only persist view preference, not data (re-fetch on mount)
      partialize: (state) => ({
        viewMode: state.viewMode,
        anchorDate: state.anchorDate,
      }),
    },
  ),
);
