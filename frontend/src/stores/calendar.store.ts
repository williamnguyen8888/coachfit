// src/stores/calendar.store.ts
// Zustand store for calendar state management.
// Handles: view mode, date navigation, event fetching, CRUD operations.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { calendarService } from "@/lib/services/calendar";
import type {
  CalendarEvent,
  CalendarViewMode,
  CreateCalendarPayload,
  UpdateCalendarPayload,
  EventsByDate,
} from "@/lib/types/calendar";

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
  updateEvent: (id: string, payload: UpdateCalendarPayload) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  markComplete: (id: string) => Promise<void>;
  markSkipped: (id: string) => Promise<void>;

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
          const events = await calendarService.list(from, to);
          set({
            events,
            eventsByDate: groupByDate(events),
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
        const event = await calendarService.update(id, payload);
        get()._upsertEvent(event);
        return event;
      },

      deleteEvent: async (id) => {
        await calendarService.delete(id);
        get()._removeEvent(id);
      },

      markComplete: async (id) => {
        const event = await calendarService.markComplete(id);
        get()._upsertEvent(event);
      },

      markSkipped: async (id) => {
        const event = await calendarService.markSkipped(id);
        get()._upsertEvent(event);
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
