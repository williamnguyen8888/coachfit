"use client";

// src/components/calendar/WeekView.tsx
// 7-column week grid with swipe navigation on mobile.
// Design spec: docs/09-design-system.md § Calendar

import { useState, useRef, useCallback } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { useCalendarStore } from "@/stores/calendar.store";
import { CalendarEventChip } from "./CalendarEventChip";
import { CalendarEventModal } from "./CalendarEventModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function isSameDay(a: string, b: string) {
  return a === b;
}

function formatDayNum(dateStr: string): string {
  return String(new Date(dateStr + "T00:00:00").getDate());
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

// ─── Day column ───────────────────────────────────────────────────────────────

interface DayColumnProps {
  date: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddClick: (date: string) => void;
}

function DayColumn({ date, events, onEventClick, onAddClick }: DayColumnProps) {
  const today = isToday(date);
  const dayIndex = new Date(date + "T00:00:00").getDay();
  const dayName = DAY_NAMES[dayIndex === 0 ? 6 : dayIndex - 1]; // shift Sun→index 6

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Day header */}
      <div
        style={{
          padding: "var(--space-2) var(--space-1)",
          textAlign: "center",
          borderBottom: "1px solid var(--border-subtle)",
          background: today ? "rgba(139,92,246,0.06)" : "transparent",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: today ? "var(--color-accent)" : "var(--text-muted)",
            fontWeight: today ? 600 : 400,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {dayName}
        </div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-full)",
            background: today ? "var(--color-accent)" : "transparent",
            color: today ? "white" : "var(--text-primary)",
            fontSize: "var(--text-sm)",
            fontWeight: today ? 700 : 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "2px auto 0",
          }}
        >
          {formatDayNum(date)}
        </div>
      </div>

      {/* Events area */}
      <div
        style={{
          flex: 1,
          padding: "var(--space-1)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-1)",
          overflowY: "auto",
          minHeight: 120,
          background: today ? "rgba(139,92,246,0.02)" : "transparent",
          cursor: "default",
        }}
      >
        {events.map((event) => (
          <CalendarEventChip
            key={event.id}
            event={event}
            onClick={onEventClick}
          />
        ))}

        {/* Add button */}
        <button
          type="button"
          onClick={() => onAddClick(date)}
          aria-label={`Add event on ${date}`}
          style={{
            marginTop: "auto",
            padding: "var(--space-1)",
            background: "transparent",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            fontSize: "var(--text-xs)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2px",
            opacity: 0,
            transition: "opacity var(--duration-micro) ease-out",
          }}
          className="add-event-btn"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)"; }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WeekSkeleton() {
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 400, opacity: 0.5 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            borderRight: "1px solid var(--border-subtle)",
            padding: "var(--space-2) var(--space-1)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {/* Day header skeleton */}
          <div style={{ textAlign: "center", paddingBottom: "var(--space-2)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ height: 12, width: 32, borderRadius: 4, background: "var(--bg-elevated)", margin: "0 auto 4px" }} />
            <div style={{ height: 28, width: 28, borderRadius: "50%", background: "var(--bg-elevated)", margin: "0 auto" }} />
          </div>
          {/* Event skeleton bars */}
          {i % 3 !== 2 && (
            <div style={{ height: 28, borderRadius: 4, background: "var(--bg-elevated)" }} />
          )}
          {i % 4 === 0 && (
            <div style={{ height: 28, borderRadius: 4, background: "var(--bg-elevated)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeekView() {
  const { getWeekRange, eventsByDate, isLoading, prevPeriod, nextPeriod } =
    useCalendarStore();
  const { from } = getWeekRange();

  // Modal state
  const [modalState, setModalState] = useState<
    | { mode: "create"; date: string }
    | { mode: "edit"; event: CalendarEvent }
    | null
  >(null);

  const closeModal = useCallback(() => setModalState(null), []);

  // ── Swipe gesture handling ────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      // Only trigger if horizontal movement dominates (not a vertical scroll)
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) nextPeriod(); // swipe left → next week
        else prevPeriod(); // swipe right → prev week
      }
      touchStartX.current = null;
      touchStartY.current = null;
    },
    [nextPeriod, prevPeriod],
  );

  // Build the 7 dates in this week
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  if (isLoading) return <WeekSkeleton />;

  return (
    <>
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 400,
          userSelect: "none",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {weekDates.map((date) => (
          <DayColumn
            key={date}
            date={date}
            events={eventsByDate[date] ?? []}
            onEventClick={(event) => setModalState({ mode: "edit", event })}
            onAddClick={(d) => setModalState({ mode: "create", date: d })}
          />
        ))}
      </div>

      {/* Mobile: tap-visible add button (for touch users who can't hover) */}
      <style>{`
        @media (hover: none) {
          .add-event-btn { opacity: 0.4 !important; }
        }
      `}</style>

      {/* Modal */}
      {modalState &&
        (modalState.mode === "create" ? (
          <CalendarEventModal
            mode="create"
            initialDate={modalState.date}
            onClose={closeModal}
          />
        ) : (
          <CalendarEventModal
            mode="edit"
            event={modalState.event}
            onClose={closeModal}
          />
        ))}
    </>
  );
}
