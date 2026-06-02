"use client";

// src/components/calendar/MonthView.tsx
// Full calendar month grid (7×5 or 7×6 rows) — intervals.icu polished.
// Supports:
//   - HTML5 drag-and-drop between day cells (move; no same-cell reorder in compact)
//   - Touch long-press drag (mobile)
//   - Inline quick actions on chips
//   - Out-of-month cells reject drops
//   - Today cell with glow ring
//   - Drag-over cell with pulsing animation
//   - Overflow "+N more" badge in accent style

import { useState, useCallback } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { getSportMeta } from "./calendarUtils";
import type { CalendarEvent } from "@/lib/types/calendar";
import { useCalendarStore } from "@/stores/calendar.store";
import { useDragDrop } from "@/hooks/useDragDrop";
import { CalendarEventChip } from "./CalendarEventChip";
import { CalendarEventModal } from "./CalendarEventModal";
import { DailyWellnessSummary } from "./DailyWellnessSummary";
import { WeeklySummaryColumn } from "./WeeklySummaryColumn";
import { parseLocalDateString, toLocalDateString } from "@/lib/utils";
import type { WellnessEntry } from "@/lib/types/wellness";
import type { DailyHealthSummary, SleepRecord } from "@/lib/services/health";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
}

function isToday(dateStr: string): boolean {
  return dateStr === toLocalDateString(new Date());
}

function isCurrentMonth(dateStr: string, anchorDate: string): boolean {
  return dateStr.slice(0, 7) === anchorDate.slice(0, 7);
}

function buildMonthGrid(anchorDate: string): string[] {
  const anchor      = parseLocalDateString(anchorDate);
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth  = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  const startDay  = firstOfMonth.getDay();
  const gridStart = new Date(firstOfMonth);
  const daysBack  = startDay === 0 ? 6 : startDay - 1;
  gridStart.setDate(gridStart.getDate() - daysBack);

  const endDay     = lastOfMonth.getDay();
  const gridEnd    = new Date(lastOfMonth);
  const daysForward = endDay === 0 ? 0 : 7 - endDay;
  gridEnd.setDate(gridEnd.getDate() + daysForward);

  const dates: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    dates.push(toLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// ─── Day overflow popover ─────────────────────────────────────────────────────

const MAX_VISIBLE = 3;

interface DayCellOverflowProps {
  extraEvents: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onClose: () => void;
}

function DayCellOverflowPopover({ extraEvents, onEventClick, onClose }: DayCellOverflowProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        zIndex: 20,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        padding: "var(--space-2)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-1)",
        minWidth: 220,
      }}
    >
      {extraEvents.map((event) => (
        <CalendarEventChip
          key={event.id}
          event={event}
          onClick={(e) => { onEventClick(e); onClose(); }}
        />
      ))}
      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: "var(--space-1)",
          padding: "2px",
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          fontSize: "var(--text-xs)",
          cursor: "pointer",
          textAlign: "center",
        }}
      >
        Close
      </button>
    </div>
  );
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: string;
  events: CalendarEvent[];
  inMonth: boolean;
  onEventClick: (event: CalendarEvent) => void;
  onAddClick: (date: string) => void;
  isDragOver: boolean;
  draggingId: string | null;
  dropZoneProps: ReturnType<ReturnType<typeof useDragDrop>["getDropZoneProps"]>;
  getChipDragProps: ReturnType<typeof useDragDrop>["getChipDragProps"];
  getTouchDragProps: ReturnType<typeof useDragDrop>["getTouchDragProps"];
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  wellness?: WellnessEntry;
  health?: DailyHealthSummary;
  sleep?: SleepRecord;
}

function DayCell({
  date,
  events,
  inMonth,
  onEventClick,
  onAddClick,
  isDragOver,
  draggingId,
  dropZoneProps,
  getChipDragProps,
  getTouchDragProps,
  onComplete,
  onSkip,
  wellness,
  health,
  sleep,
}: DayCellProps) {
  const today = isToday(date);
  const [showOverflow, setShowOverflow] = useState(false);
  const dayNum = new Date(date + "T00:00:00").getDate();

  const visibleEvents = events;
  const overflowCount = 0;
  const hasOverflow   = false;

  // Background
  let baseBg = "transparent";
  if (!inMonth) baseBg = "color-mix(in srgb, black 20%, var(--bg-primary))";
  if (today)    baseBg = "var(--color-accent-6)";
  if (isDragOver && inMonth) baseBg = "var(--color-accent-10)";

  return (
    <div
      {...(inMonth ? dropZoneProps : {})}
      data-drop-date={inMonth ? date : undefined}
      className="day-cell"
      role={inMonth ? "button" : undefined}
      tabIndex={inMonth ? 0 : -1}
      aria-label={`Day ${dayNum}, ${inMonth ? "Click to add event" : "Outside range"}`}
      onClick={(e) => {
        // Don't fire if clicking a chip
        if ((e.target as HTMLElement).closest(".cal-chip-wrapper")) return;
        if (inMonth) onAddClick(date);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && inMonth) {
          e.preventDefault();
          onAddClick(date);
        }
      }}
      style={{
        position: "relative",
        borderRight: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        background: baseBg,
        cursor: inMonth ? "pointer" : "default",
        outline: isDragOver && inMonth
          ? "1.5px dashed var(--color-accent-50)"
          : today
          ? "1px solid var(--color-accent-20)"
          : "none",
        outlineOffset: -1,
        transition: "background 150ms ease-out",
        boxShadow: today ? "inset 0 0 0 1px var(--color-accent-15)" : "none",
        animation: isDragOver && inMonth ? "calDropPulse 1.5s ease-in-out infinite" : "none",
      }}
      onMouseEnter={(e) => {
        if (inMonth && !isDragOver) {
          (e.currentTarget as HTMLDivElement).style.background = today
            ? "var(--color-accent-10)"
            : "var(--bg-elevated)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = baseBg;
      }}
    >
      <div
        style={{
          padding: "var(--space-1) var(--space-2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          userSelect: "none",
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "var(--radius-full)",
            background: today ? "var(--color-accent)" : "transparent",
            color: today ? "white" : inMonth ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontWeight: today ? 700 : inMonth ? 500 : 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: today ? "0 0 0 3px var(--color-accent-20)" : "none",
            flexShrink: 0,
            transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease",
          }}
          className="month-day-num"
        >
          {dayNum}
        </span>

        {/* '+' icon appears on hover */}
        {inMonth && (
          <span
            className="month-add-btn"
            aria-hidden
            style={{
              width: 20, height: 20,
              borderRadius: "50%",
              background: "var(--color-accent-12)",
              border: "1px solid var(--color-accent-25)",
              color: "var(--color-accent)",
              fontSize: 14, lineHeight: 1, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              opacity: 0,
              transition: "opacity 150ms ease",
            }}
          >
            +
          </span>
        )}
      </div>

      {/* Wellness Summary */}
      {inMonth && (
        <DailyWellnessSummary
          wellness={wellness}
          health={health}
          sleep={sleep}
          compact={true}
        />
      )}

      {/* Events */}
      <div
        style={{
          flex: 1,
          padding: "0 var(--space-1) var(--space-1)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {visibleEvents.map((event) => {
          const chipDragProps = getChipDragProps(event.id, date);
          const touchProps    = getTouchDragProps(event.id, date);
          return (
            <CalendarEventChip
              key={event.id}
              event={event}
              onClick={onEventClick}
              draggable={inMonth}
              onDragStart={chipDragProps.onDragStart}
              onDragEnd={chipDragProps.onDragEnd}
              onTouchStart={touchProps.onTouchStart}
              onTouchMove={touchProps.onTouchMove}
              onTouchEnd={touchProps.onTouchEnd}
              isDragging={draggingId === event.id}
              onComplete={() => onComplete(event.id)}
              onSkip={() => onSkip(event.id)}
              sleep={sleep}
              health={health}
            />
          );
        })}

        {/* Overflow badge */}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setShowOverflow((v) => !v)}
            style={{
              background: "var(--color-accent-10)",
              border: "1px solid var(--color-accent-20)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-accent)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              padding: "2px var(--space-2)",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-20)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-10)"; }}
          >
            +{overflowCount} more
          </button>
        )}
      </div>

      {/* Overflow popover */}
      {showOverflow && hasOverflow && (
        <>
          <div
            onClick={() => setShowOverflow(false)}
            style={{ position: "fixed", inset: 0, zIndex: 19 }}
          />
          <DayCellOverflowPopover
            extraEvents={events.slice(MAX_VISIBLE)}
            onEventClick={onEventClick}
            onClose={() => setShowOverflow(false)}
          />
        </>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MonthSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", opacity: 0.4 }}>
      {Array.from({ length: 35 }).map((_, i) => (
        <div
          key={i}
          style={{
            minHeight: 100,
            borderRight: "1px solid var(--border-subtle)",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-1)",
          }}
        >
          <div style={{ height: 22, width: 22, borderRadius: "50%", background: "var(--bg-elevated)" }} />
          {i % 3 === 0 && <div style={{ height: 36, borderRadius: 4, background: "var(--bg-elevated)" }} />}
          {i % 5 === 0 && <div style={{ height: 36, borderRadius: 4, background: "var(--bg-elevated)" }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MonthView() {
  const isMobile = useIsMobile();
  const {
    anchorDate,
    eventsByDate,
    isLoading,
    markComplete,
    markSkipped,
    moveEvent,
    reorderEvents,
    wellnessByDate,
    healthSummaryByDate,
    sleepByDate,
  } = useCalendarStore();

  const today = toLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [prevAnchorDate, setPrevAnchorDate] = useState(anchorDate);

  if (anchorDate !== prevAnchorDate) {
    setPrevAnchorDate(anchorDate);
    const anchorYm = anchorDate.slice(0, 7);
    const todayYm = today.slice(0, 7);
    setSelectedDate(anchorYm === todayYm ? today : `${anchorYm}-01`);
  }

  const [modalState, setModalState] = useState<
    | { mode: "create"; date: string }
    | { mode: "edit"; event: CalendarEvent }
    | null
  >(null);
  const closeModal = useCallback(() => setModalState(null), []);

  const eventIdsByDate: Record<string, string[]> = {};
  for (const [date, evts] of Object.entries(eventsByDate)) {
    eventIdsByDate[date] = evts.map((e) => e.id);
  }

  const { dragState, getChipDragProps, getDropZoneProps, getTouchDragProps } = useDragDrop({
    onMove:    (eventId, toDate) => moveEvent(eventId, toDate),
    onReorder: (date, orderedIds) => reorderEvents(date, orderedIds),
    eventIdsByDate,
  });

  const handleComplete = useCallback(
    async (id: string) => { try { await markComplete(id); } catch { /* surfaced via store */ } },
    [markComplete],
  );
  const handleSkip = useCallback(
    async (id: string) => { try { await markSkipped(id); } catch { /* surfaced via store */ } },
    [markSkipped],
  );

  const gridDates = buildMonthGrid(anchorDate);
  const weeks: string[][] = [];
  for (let i = 0; i < gridDates.length; i += 7) {
    weeks.push(gridDates.slice(i, i + 7));
  }

  if (isLoading) return <MonthSkeleton />;

  const selectedWeek = weeks.find((week) => week.includes(selectedDate));
  const selectedWeekEvents = selectedWeek ? selectedWeek.flatMap((d) => eventsByDate[d] ?? []) : [];
  const selectedWeekNumber = selectedWeek ? getWeekNumber(selectedWeek[0]) : 0;

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 16, padding: "12px" }}>
        {/* Miniature Month Date Picker Grid */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "12px 8px" }}>
          {/* Header Row (M T W T F S S) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8, textAlign: "center" }}>
            {DAY_NAMES_SHORT.map((name) => (
              <span key={name} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
                {name.charAt(0)}
              </span>
            ))}
          </div>

          {/* Date Circles Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px 4px" }}>
            {gridDates.map((date) => {
              const inMonth = isCurrentMonth(date, anchorDate);
              const dayNum = new Date(date + "T00:00:00").getDate();
              const isSel = date === selectedDate;
              const today = isToday(date);
              const dayEvents = eventsByDate[date] ?? [];

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "4px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    outline: "none",
                    opacity: inMonth ? 1 : 0.4,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: isSel || today ? 700 : 500,
                      background: isSel
                        ? "var(--color-accent)"
                        : today
                        ? "var(--color-accent-15)"
                        : "transparent",
                      color: isSel
                        ? "white"
                        : today
                        ? "var(--color-accent)"
                        : "var(--text-primary)",
                      boxShadow: today && !isSel ? "inset 0 0 0 1px var(--color-accent-30)" : "none",
                      transition: "all 120ms ease",
                    }}
                  >
                    {dayNum}
                  </div>
                  
                  {/* Event sport dots */}
                  <div style={{ display: "flex", gap: 2, height: 4, marginTop: 4, justifyContent: "center" }}>
                    {dayEvents.slice(0, 3).map((e) => {
                      const m = getSportMeta(e.workout?.sport ?? "other", e.eventType);
                      return (
                        <div
                          key={e.id}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: m.color,
                          }}
                        />
                      );
                    })}
                  </div>
                 </button>
              );
            })}
          </div>
        </div>

        {/* Weekly Summary for Selected Date's Week */}
        {selectedWeek && (
          <WeeklySummaryColumn
            events={selectedWeekEvents}
            weekNumber={selectedWeekNumber}
            style={{
              minWidth: "auto",
              borderRight: "none",
              borderBottom: "none",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          />
        )}

        {/* Selected Date Details Area */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>

          {/* Daily Wellness Summary for Selected Date */}
          <DailyWellnessSummary
            wellness={wellnessByDate?.[selectedDate]}
            health={healthSummaryByDate?.[selectedDate]}
            sleep={sleepByDate?.[selectedDate]}
            compact={false}
          />

          {/* List of events */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(eventsByDate[selectedDate] ?? []).length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                No planned workouts or synced activities.
              </div>
            ) : (
              (eventsByDate[selectedDate] ?? []).map((event) => (
                <CalendarEventChip
                  key={event.id}
                  event={event}
                  onClick={(e) => setModalState({ mode: "edit", event: e })}
                  onComplete={() => handleComplete(event.id)}
                  onSkip={() => handleSkip(event.id)}
                  sleep={sleepByDate?.[selectedDate]}
                  health={healthSummaryByDate?.[selectedDate]}
                />
              ))
            )}
          </div>

          {/* Inline Add Action */}
          <button
            type="button"
            onClick={() => setModalState({ mode: "create", date: selectedDate })}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "12px",
              background: "var(--color-accent-10)",
              border: "1.5px dashed var(--color-accent-30)",
              borderRadius: "var(--radius-md)",
              color: "var(--color-accent)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-10)";
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700 }}>+</span> Add Workout or Activity
          </button>
        </div>

        {/* Modal */}
        {modalState &&
          (modalState.mode === "create" ? (
            <CalendarEventModal mode="create" initialDate={modalState.date} onClose={closeModal} />
          ) : (
            <CalendarEventModal mode="edit" event={modalState.event} onClose={closeModal} />
          ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Day-of-week header row */}
        <div
          className="month-grid-container"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr)) 240px",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          {DAY_NAMES_SHORT.map((name, i) => {
            const isWeekend = i >= 5;
            return (
              <div
                key={name}
                style={{
                  padding: "var(--space-2)",
                  textAlign: "center",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: isWeekend ? "var(--text-secondary)" : "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  borderRight: "1px solid var(--border-subtle)",
                  background: isWeekend ? "color-mix(in srgb, var(--bg-elevated) 30%, transparent)" : "transparent",
                }}
              >
                {name}
              </div>
            );
          })}
          <div
            className="month-summary-header"
            style={{
              padding: "var(--space-2)",
              textAlign: "center",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              borderRight: "1px solid var(--border-subtle)",
              background: "var(--bg-elevated)",
            }}
          >
            Summary
          </div>
        </div>

        {/* Day grid */}
        <div
          className="month-grid-container month-day-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr)) 240px",
            gridAutoRows: "minmax(140px, auto)",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {weeks.map((weekDates, weekIdx) => {
            const dayCells = weekDates.map((date) => {
              const inMonth   = isCurrentMonth(date, anchorDate);
              const isDragOver = dragState.dragOverDate === date;

              return (
                <DayCell
                  key={date}
                  date={date}
                  events={eventsByDate[date] ?? []}
                  inMonth={inMonth}
                  onEventClick={(event) => setModalState({ mode: "edit", event })}
                  onAddClick={(d) => setModalState({ mode: "create", date: d })}
                  isDragOver={isDragOver}
                  draggingId={dragState.draggingId}
                  dropZoneProps={getDropZoneProps(date, inMonth)}
                  getChipDragProps={getChipDragProps}
                  getTouchDragProps={getTouchDragProps}
                  onComplete={handleComplete}
                  onSkip={handleSkip}
                  wellness={wellnessByDate?.[date]}
                  health={healthSummaryByDate?.[date]}
                  sleep={sleepByDate?.[date]}
                />
              );
            });

            const allWeekEvents = weekDates.flatMap((d) => eventsByDate[d] ?? []);

            return [
              ...dayCells,
              <WeeklySummaryColumn
                key={`summary-${weekIdx}`}
                events={allWeekEvents}
                weekNumber={getWeekNumber(weekDates[0])}
              />
            ];
          })}
        </div>
      </div>

      {/* Scoped CSS */}
      <style>{`
        .month-grid-container {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr)) 240px;
        }
        .month-day-grid {
          grid-auto-rows: minmax(140px, auto);
        }
        @media (max-width: 1200px) {
          .month-grid-container {
            grid-template-columns: repeat(7, minmax(0, 1fr)) !important;
          }
          .month-summary-header,
          .weekly-summary-column {
            display: none !important;
          }
        }
        @media (hover: hover) {
          /* Show '+' and highlight day number on cell hover */
          .day-cell:hover .month-add-btn { opacity: 1; }
          .day-cell:hover .month-day-num {
            background: var(--color-accent) !important;
            color: white !important;
            box-shadow: 0 0 0 3px var(--color-accent-20) !important;
          }
        }
        @media (hover: none) {
          .month-add-btn { opacity: 0.6 !important; min-height: 44px !important; min-width: 44px !important; }
        }
      `}</style>

      {/* Modal */}
      {modalState &&
        (modalState.mode === "create" ? (
          <CalendarEventModal mode="create" initialDate={modalState.date} onClose={closeModal} />
        ) : (
          <CalendarEventModal mode="edit" event={modalState.event} onClose={closeModal} />
        ))}
    </>
  );
}
