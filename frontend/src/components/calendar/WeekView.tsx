"use client";

// src/components/calendar/WeekView.tsx
// 7-column week grid with:
//   - HTML5 drag-and-drop between day columns (desktop)
//   - Same-day reorder with drop-line indicator
//   - Touch long-press drag (mobile)
//   - Swipe left/right navigation (mobile) — preserved from v1
//   - Inline ✓/× quick actions on chips
//   - Horizontal scroll + snap for narrow screens (<480px)
//
// Design spec: docs/09-design-system.md § Calendar, Animation & Transitions

import { useState, useRef, useCallback } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { useCalendarStore } from "@/stores/calendar.store";
import { useDragDrop } from "@/hooks/useDragDrop";
import { CalendarEventChip } from "./CalendarEventChip";
import { CalendarEventModal } from "./CalendarEventModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDayNum(dateStr: string): string {
  return String(new Date(dateStr + "T00:00:00").getDate());
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split("T")[0];
}

// ─── Drop line indicator ───────────────────────────────────────────────────────

function DropLine() {
  return (
    <div
      style={{
        height: 2,
        borderRadius: 1,
        background: "var(--color-accent)",
        margin: "1px 0",
        boxShadow: "0 0 6px rgba(139,92,246,0.6)",
        animation: "dropLinePulse 0.8s ease-in-out infinite alternate",
      }}
    />
  );
}

// ─── Day column ───────────────────────────────────────────────────────────────

interface DayColumnProps {
  date: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddClick: (date: string) => void;
  // DnD
  isDragOver: boolean;
  isSameDay: boolean;
  draggingId: string | null;
  reorderDropIndex: number | null;
  dropZoneProps: ReturnType<ReturnType<typeof useDragDrop>["getDropZoneProps"]>;
  getChipDragProps: ReturnType<typeof useDragDrop>["getChipDragProps"];
  onChipDragOver: ReturnType<typeof useDragDrop>["onChipDragOver"];
  getTouchDragProps: ReturnType<typeof useDragDrop>["getTouchDragProps"];
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}

function DayColumn({
  date,
  events,
  onEventClick,
  onAddClick,
  isDragOver,
  isSameDay,
  draggingId,
  reorderDropIndex,
  dropZoneProps,
  getChipDragProps,
  onChipDragOver,
  getTouchDragProps,
  onComplete,
  onSkip,
}: DayColumnProps) {
  const today = isToday(date);
  const dayIndex = new Date(date + "T00:00:00").getDay();
  const dayName = DAY_NAMES[dayIndex === 0 ? 6 : dayIndex - 1];

  return (
    <div
      {...dropZoneProps}
      data-drop-date={date}
      className="day-col"
      style={{
        flex: 1,
        minWidth: 80, // allows horizontal scroll on narrow screens
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border-subtle)",
        transition: "background var(--duration-micro) ease-out, box-shadow var(--duration-micro) ease-out",
        background: isDragOver
          ? "rgba(139,92,246,0.06)"
          : today
            ? "rgba(139,92,246,0.02)"
            : "transparent",
        outline: isDragOver
          ? "1px dashed rgba(139,92,246,0.5)"
          : "none",
        outlineOffset: -1,
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
          gap: 0, // gap managed by drop lines
          overflowY: "auto",
          minHeight: 120,
        }}
      >
        {events.map((event, idx) => {
          const chipDragProps = getChipDragProps(event.id, date);
          const touchProps = getTouchDragProps(event.id, date);

          return (
            <div key={event.id} style={{ display: "flex", flexDirection: "column" }}>
              {/* Drop line above this chip (same-day reorder) */}
              {isSameDay && reorderDropIndex === idx && <DropLine />}

              <div style={{ padding: "1px 0" }}>
                <CalendarEventChip
                  event={event}
                  onClick={onEventClick}
                  draggable
                  onDragStart={chipDragProps.onDragStart}
                  onDragEnd={chipDragProps.onDragEnd}
                  onChipDragOver={(e) => onChipDragOver(e, date, idx)}
                  onTouchStart={touchProps.onTouchStart}
                  onTouchMove={touchProps.onTouchMove}
                  onTouchEnd={touchProps.onTouchEnd}
                  isDragging={draggingId === event.id}
                  onComplete={() => onComplete(event.id)}
                  onSkip={() => onSkip(event.id)}
                />
              </div>
            </div>
          );
        })}

        {/* Drop line at the end of the list */}
        {isSameDay && reorderDropIndex === events.length && <DropLine />}

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
            // Mobile: expanded touch target
            minHeight: 36,
          }}
          className="add-event-btn"
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)";
          }}
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
            minWidth: 80,
            borderRight: "1px solid var(--border-subtle)",
            padding: "var(--space-2) var(--space-1)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div style={{ textAlign: "center", paddingBottom: "var(--space-2)", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ height: 12, width: 32, borderRadius: 4, background: "var(--bg-elevated)", margin: "0 auto 4px" }} />
            <div style={{ height: 28, width: 28, borderRadius: "50%", background: "var(--bg-elevated)", margin: "0 auto" }} />
          </div>
          {i % 3 !== 2 && (
            <div style={{ height: 32, borderRadius: 4, background: "var(--bg-elevated)" }} />
          )}
          {i % 4 === 0 && (
            <div style={{ height: 32, borderRadius: 4, background: "var(--bg-elevated)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeekView() {
  const {
    getWeekRange,
    eventsByDate,
    isLoading,
    prevPeriod,
    nextPeriod,
    markComplete,
    markSkipped,
    moveEvent,
    reorderEvents,
  } = useCalendarStore();
  const { from } = getWeekRange();

  // Build event IDs by date for reorder calculation
  const eventIdsByDate: Record<string, string[]> = {};
  for (const [date, evts] of Object.entries(eventsByDate)) {
    eventIdsByDate[date] = evts.map((e) => e.id);
  }

  // Modal state
  const [modalState, setModalState] = useState<
    | { mode: "create"; date: string }
    | { mode: "edit"; event: CalendarEvent }
    | null
  >(null);
  const closeModal = useCallback(() => setModalState(null), []);

  // ── Swipe gesture handling (mobile) ───────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;
  const LONG_PRESS_MS = 490; // slightly less than hook's 500ms so swipe wins

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (
        touchStartX.current === null ||
        touchStartY.current === null ||
        touchStartTime.current === null
      )
        return;
      const elapsed = Date.now() - touchStartTime.current;
      // Don't treat a long-press (drag initiation) as a swipe
      if (elapsed >= LONG_PRESS_MS) {
        touchStartX.current = null;
        touchStartY.current = null;
        touchStartTime.current = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) nextPeriod();
        else prevPeriod();
      }
      touchStartX.current = null;
      touchStartY.current = null;
      touchStartTime.current = null;
    },
    [nextPeriod, prevPeriod],
  );

  // ── DnD hook ──────────────────────────────────────────────────────────────
  const { dragState, getChipDragProps, getDropZoneProps, reorderDropIndex, onChipDragOver, getTouchDragProps } =
    useDragDrop({
      onMove: (eventId, toDate) => moveEvent(eventId, toDate),
      onReorder: (date, orderedIds) => reorderEvents(date, orderedIds),
      eventIdsByDate,
    });

  // Quick action callbacks
  const handleComplete = useCallback(
    async (id: string) => {
      try { await markComplete(id); } catch { /* error surfaced via store */ }
    },
    [markComplete],
  );
  const handleSkip = useCallback(
    async (id: string) => {
      try { await markSkipped(id); } catch { /* error surfaced via store */ }
    },
    [markSkipped],
  );

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  if (isLoading) return <WeekSkeleton />;

  return (
    <>
      {/* Outer wrapper with swipe handlers */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 400,
          userSelect: "none",
          // Horizontal scroll on narrow screens with snap
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {weekDates.map((date) => {
          const isDragOver = dragState.dragOverDate === date;
          const isSameDayReorder =
            isDragOver && dragState.dragFromDate === date;

          return (
            <DayColumn
              key={date}
              date={date}
              events={eventsByDate[date] ?? []}
              onEventClick={(event) => setModalState({ mode: "edit", event })}
              onAddClick={(d) => setModalState({ mode: "create", date: d })}
              isDragOver={isDragOver}
              isSameDay={isSameDayReorder}
              draggingId={dragState.draggingId}
              reorderDropIndex={isSameDayReorder ? reorderDropIndex : null}
              dropZoneProps={getDropZoneProps(date)}
              getChipDragProps={getChipDragProps}
              onChipDragOver={onChipDragOver}
              getTouchDragProps={getTouchDragProps}
              onComplete={handleComplete}
              onSkip={handleSkip}
            />
          );
        })}
      </div>

      {/* Global styles */}
      <style>{`
        /* Desktop: show add button when hovering anywhere in the column */
        @media (hover: hover) {
          .add-event-btn { opacity: 0; transition: opacity 150ms ease-out; }
          .day-col:hover .add-event-btn { opacity: 1; }
        }
        /* Mobile: always visible, larger touch target */
        @media (hover: none) {
          .add-event-btn { opacity: 0.5 !important; min-height: 44px !important; }
        }
        /* Narrow: each day column snaps */
        @media (max-width: 480px) {
          [data-drop-date] { scroll-snap-align: start; }
        }
        @keyframes dropLinePulse {
          from { opacity: 0.6; }
          to   { opacity: 1;   }
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
