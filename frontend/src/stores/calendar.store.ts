// src/stores/calendar.store.ts
// Zustand store for calendar state management.
// Handles: view mode, date navigation, event fetching, CRUD operations.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calendarService } from "@/lib/services/calendar";
import { activitiesService } from "@/lib/services/activities";
import { wellnessService } from "@/lib/services/wellness";
import { healthService } from "@/lib/services/health";
import type {
  CalendarEvent,
  CalendarViewMode,
  CreateCalendarPayload,
  UpdateCalendarPayload,
  EventsByDate,
} from "@/lib/types/calendar";
import type { WellnessEntry } from "@/lib/types/wellness";
import type { DailyHealthSummary, SleepRecord } from "@/lib/services/health";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday of the week containing the given date */
function weekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return toISODate(d);
}

/** First day of the month containing the given date */
function monthStart(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Last day of the month containing the given date */
function monthEnd(dateStr: string): string {
  const d = new Date(dateStr);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return toISODate(lastDay);
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
  fetchCurrentRange: () => Promise<void>;

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
      anchorDate: toISODate(new Date()),

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
        const to = addDays(from, 6);
        return { from, to };
      },

      getMonthRange: () => {
        const { anchorDate } = get();
        // For month view we load the full calendar grid including leading/trailing days
        const from = weekStart(monthStart(anchorDate));
        // Grid is 6 weeks max = 42 days from grid start
        const to = addDays(from, 41);
        return { from, to };
      },

      // ── Navigation ────────────────────────────────────────────────────────

      setViewMode: (mode) => set({ viewMode: mode }),

      goToToday: () =>
        set({ anchorDate: toISODate(new Date()), error: null }),

      nextPeriod: () => {
        const { viewMode, anchorDate } = get();
        if (viewMode === "week") {
          set({ anchorDate: addDays(anchorDate, 7) });
        } else {
          const d = new Date(anchorDate);
          d.setMonth(d.getMonth() + 1, 1);
          set({ anchorDate: toISODate(d) });
        }
      },

      prevPeriod: () => {
        const { viewMode, anchorDate } = get();
        if (viewMode === "week") {
          set({ anchorDate: addDays(anchorDate, -7) });
        } else {
          const d = new Date(anchorDate);
          d.setMonth(d.getMonth() - 1, 1);
          set({ anchorDate: toISODate(d) });
        }
      },

      // ── Data fetching ─────────────────────────────────────────────────────
      fetchCurrentRange: async () => {
        const { viewMode, getWeekRange, getMonthRange } = get();
        const { from, to } =
          viewMode === "week" ? getWeekRange() : getMonthRange();

        set({ isLoading: true, error: null });
        try {
          const [events, activitiesRes, wellnessRes, healthDailyRes, sleepRes] = await Promise.all([
            calendarService.list(from, to),
            activitiesService.list({ from, to, size: 100 }).catch((err) => {
              console.error("Failed to load activities for calendar:", err);
              return { content: [], page: 0, size: 100, totalElements: 0, totalPages: 0 };
            }),
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

          // Extract the IDs of activities that are already matched to a calendar event in the database
          const matchedActivityIds = new Set<string>();
          events.forEach((evt) => {
            if (evt.activity?.id) {
              matchedActivityIds.add(evt.activity.id);
            }
          });

          // Synthesize pseudo calendar events ONLY for activities that are NOT matched (standalone)
          const pseudoEvents = activitiesRes.content
            .filter((act) => !matchedActivityIds.has(act.id))
            .map((act) => {
              const dateStr = act.startedAt.split("T")[0];
              const pseudoEvent: CalendarEvent = {
                id: `activity-event-${act.id}`,
                date: dateStr,
                eventType: "workout", // route to rich cards
                title: act.name,
                status: "completed", // route to ActivityCard
                workout: null,
                activity: {
                  id: act.id,
                  tss: act.tss,
                  durationSeconds: act.durationSeconds,
                  sport: act.sport,
                  name: act.name,
                  distanceMeters: act.distanceMeters,
                  avgHeartRate: act.avgHeartRate,
                  maxHeartRate: act.avgHeartRate, // Fallback/estimation
                  avgPower: act.avgPower,
                  rpe: null,
                  source: act.source,
                },
                complianceScore: null,
                orderIndex: 999, // Render after planned workouts
                assignedBy: null,
                notes: null,
                garminWorkoutId: null,
                garminScheduledId: null,
                garminSyncedAt: null,
              };
              return pseudoEvent;
            });

          // Enrich matched activities with full summary details from activitiesRes
          const enrichedEvents = events.map((evt) => {
            if (evt.activity) {
              const matchedAct = activitiesRes.content.find((a) => a.id === evt.activity?.id);
              if (matchedAct) {
                evt.activity = {
                  ...evt.activity,
                  source: matchedAct.source,
                  sport: matchedAct.sport,
                  name: matchedAct.name,
                  distanceMeters: matchedAct.distanceMeters,
                  avgHeartRate: matchedAct.avgHeartRate,
                  maxHeartRate: matchedAct.avgHeartRate, // Fallback/estimation
                  avgPower: matchedAct.avgPower,
                };
              }
            }
            return evt;
          });

          const mergedEvents = [...enrichedEvents, ...pseudoEvents];

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
            events: mergedEvents,
            eventsByDate: groupByDate(mergedEvents),
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

        // Backend returns void — optimistically update from local state + payload
        await calendarService.update(id, fullPayload);
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

        // Optimistic update: move event to new date with orderIndex at end of target day
        const targetDayEvents = get().eventsByDate[toDate] ?? [];
        const newOrderIndex = targetDayEvents.length;

        set((state) => {
          const updated = state.events.map((e) =>
            e.id === eventId ? { ...e, date: toDate, orderIndex: newOrderIndex } : e,
          );
          return {
            events: updated,
            eventsByDate: groupByDate(updated),
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
          // No need to upsert — optimistic state is already correct
        } catch {
          // Rollback
          set({ events: previousEvents, eventsByDate: previousById });
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
