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
        // For month view we load the full calendar grid including leading/trailing days
        const from = weekStart(monthStart(anchorDate));
        // Grid is 6 weeks max = 42 days from grid start
        const to = addLocalDays(from, 41);
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
        const event = await calendarService.create(payload);
        get()._upsertEvent(event);
        return event;
      },

      updateEvent: async (id, payload) => {
        const existing = get().events.find((e) => e.id === id);
        if (!existing) return;

        // Build the full request payload for the backend.
        // It requires date, eventType, and title.
        const fullPayload: UpdateCalendarPayload = {
          date: payload.date ?? existing.date,
          eventType: payload.eventType ?? existing.eventType,
          title: payload.title ?? existing.title,
          notes: payload.notes !== undefined ? payload.notes : (existing.notes ?? undefined),
          workoutId: payload.workoutId !== undefined ? payload.workoutId : (existing.workout?.id ?? undefined),
        };

        const dateChanged = fullPayload.date !== existing.date;
        const previousEvents = get().events;
        const previousById = get().eventsByDate;

        if (dateChanged) {
          // Optimistic update for date change
          set((state) => {
            const nextEvents = state.events.map((e) => {
              if (e.id === id) {
                if (e.workout && e.activity) {
                  return {
                    ...e,
                    date: fullPayload.date!,
                    title: fullPayload.title!,
                    notes: fullPayload.notes ?? null,
                    activity: null,
                    complianceScore: null,
                    status: "planned" as const,
                  };
                }
                return {
                  ...e,
                  date: fullPayload.date!,
                  title: fullPayload.title!,
                  notes: fullPayload.notes ?? null,
                };
              }
              return e;
            });

            if (existing.workout && existing.activity) {
              const tempActivityEvent: CalendarEvent = {
                id: `activity-event-temp-${existing.activity.id}`,
                date: existing.date,
                eventType: "workout",
                title: existing.activity.name || existing.title || "Activity",
                status: "completed",
                workout: null,
                activity: existing.activity,
                complianceScore: null,
                orderIndex: 999,
                assignedBy: null,
                notes: null,
                garminWorkoutId: null,
                garminScheduledId: null,
                garminSyncedAt: null,
              };
              nextEvents.push(tempActivityEvent);
            }

            return {
              events: nextEvents,
              eventsByDate: groupByDate(nextEvents),
            };
          });
        } else {
          // Standard optimistic update
          set((state) => {
            const target = state.events.find((e) => e.id === id);
            if (!target) return {};
            const updated = {
              ...target,
              date: fullPayload.date!,
              eventType: fullPayload.eventType!,
              title: fullPayload.title!,
              notes: fullPayload.notes ?? null,
              workout: fullPayload.workoutId
                ? {
                    id: fullPayload.workoutId,
                    sport: target.workout?.sport ?? "other",
                    estimatedDuration: target.workout?.estimatedDuration ?? null,
                    estimatedTss: target.workout?.estimatedTss ?? null,
                    estimatedDistance: target.workout?.estimatedDistance ?? null,
                  }
                : null,
            };
            const next = state.events.map((e) => e.id === id ? updated : e);
            return { events: next, eventsByDate: groupByDate(next) };
          });
        }

        try {
          await calendarService.update(id, fullPayload);
          await get().fetchCurrentRange(true);
        } catch (err) {
          // Rollback on error
          set({ events: previousEvents, eventsByDate: previousById });
          set({ error: err instanceof Error ? err.message : "Failed to update calendar event" });
          throw err;
        }
      },

      deleteEvent: async (id) => {
        await calendarService.delete(id);
        get()._removeEvent(id);
      },

      markComplete: async (id) => {
        // Backend returns void — optimistically patch status in local state
        await calendarService.markComplete(id);
        set((state) => {
          const next = state.events.map((e) =>
            e.id === id ? { ...e, status: "completed" as const } : e,
          );
          return { events: next, eventsByDate: groupByDate(next) };
        });
      },

      markSkipped: async (id) => {
        // Backend returns void — optimistically patch status in local state
        await calendarService.markSkipped(id);
        set((state) => {
          const next = state.events.map((e) =>
            e.id === id ? { ...e, status: "skipped" as const } : e,
          );
          return { events: next, eventsByDate: groupByDate(next) };
        });
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
        // Snapshot for rollback
        const previousEvents = get().events;
        const previousById = get().eventsByDate;

        // Find the event
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return;
        if (event.activity && !event.workout) return;

        // Optimistic update: move event to new date with orderIndex at end of target day
        const targetDayEvents = get().eventsByDate[toDate] ?? [];
        const newOrderIndex = targetDayEvents.length;

        set((state) => {
          const nextEvents = state.events.map((e) => {
            if (e.id === eventId) {
              // If it's a workout with a linked activity, moving it unlinks the activity
              if (e.workout && e.activity) {
                return {
                  ...e,
                  date: toDate,
                  orderIndex: newOrderIndex,
                  activity: null,
                  complianceScore: null,
                  status: "planned" as const,
                };
              }
              return { ...e, date: toDate, orderIndex: newOrderIndex };
            }
            return e;
          });

          // If the moved event was a workout and had a linked activity,
          // create a temporary standalone activity event on the old date so the user
          // immediately sees the activity stay behind!
          if (event.workout && event.activity) {
            const tempActivityEvent: CalendarEvent = {
              id: `activity-event-temp-${event.activity.id}`,
              date: event.date,
              eventType: "workout",
              title: event.activity.name || event.title || "Activity",
              status: "completed",
              workout: null,
              activity: event.activity,
              complianceScore: null,
              orderIndex: 999,
              assignedBy: null,
              notes: null,
              garminWorkoutId: null,
              garminScheduledId: null,
              garminSyncedAt: null,
            };
            nextEvents.push(tempActivityEvent);
          }

          return {
            events: nextEvents,
            eventsByDate: groupByDate(nextEvents),
          };
        });

        try {
          // Backend returns void — we already applied the optimistic update.
          // We must send the full details because the backend PUT /calendar/{id} validates eventType & title.
          await calendarService.update(eventId, {
            date: toDate,
            eventType: event.eventType,
            title: event.title,
            notes: event.notes ?? undefined,
            workoutId: event.workout?.id ?? undefined,
          });
          // Fetch the updated calendar from the backend to replace temporary IDs with actuals & resolve auto-matching
          await get().fetchCurrentRange(true);
        } catch (err) {
          // Rollback
          set({ events: previousEvents, eventsByDate: previousById });
          set({ error: err instanceof Error ? err.message : "Failed to move calendar event" });
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
