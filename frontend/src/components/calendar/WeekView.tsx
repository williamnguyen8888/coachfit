"use client";

// src/components/calendar/WeekView.tsx
// Premium 7-column week grid inspired by intervals.icu
//
// Features:
//   - Weekly summary sidebar (left): total duration, completion%, load
//   - Day load bar at bottom of each column
//   - HTML5 drag-and-drop between day columns (desktop)
//   - Same-day reorder with drop-line indicator
//   - Touch long-press drag (mobile)
//   - Swipe left/right navigation (mobile)
//   - Inline ✓/× quick actions on chips
//   - Horizontal scroll + snap for narrow screens (<480px)

import { useState, useRef, useCallback } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { useCalendarStore } from "@/stores/calendar.store";
import { useDragDrop } from "@/hooks/useDragDrop";
import { CalendarEventChip } from "./CalendarEventChip";
import { CalendarEventModal } from "./CalendarEventModal";
import {
  getSportMeta,
  getEstimatedLoad,
  formatDuration,
  computeWeekStats,
  type WeekStats,
} from "./calendarUtils";

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

// ─── Drop line ────────────────────────────────────────────────────────────────

function DropLine() {
  return (
    <div
      style={{
        height: 2,
        borderRadius: 1,
        background: "var(--color-accent)",
        margin: "1px 0",
        boxShadow: "0 0 6px var(--color-accent-60)",
        animation: "dropLinePulse 0.8s ease-in-out infinite alternate",
      }}
    />
  );
}

// ─── Weekly Summary Sidebar ───────────────────────────────────────────────────

function WeeklySidebar({ stats }: { stats: WeekStats }) {
  const total   = stats.completedCount + stats.plannedCount + stats.skippedCount;
  const ringPct = stats.completionPct;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash  = (ringPct / 100) * circ;

  const ringColor = ringPct >= 80
    ? "var(--color-success)"
    : ringPct >= 50
    ? "var(--color-warning)"
    : "var(--color-danger)";

  return (
    <div
      style={{
        width: "var(--cal-weekly-sidebar-w)",
        minWidth: "var(--cal-weekly-sidebar-w)",
        flexShrink: 0,
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "var(--space-3) var(--space-2)",
        gap: "var(--space-3)",
        background: "var(--bg-surface)",
      }}
    >
      {/* Completion ring */}
      <div
        title={`${stats.completedCount}/${total} workouts completed`}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
      >
        <svg width={38} height={38} viewBox="0 0 38 38">
          <circle cx={19} cy={19} r={r} fill="none" stroke="var(--border-default)" strokeWidth={3} />
          {ringPct > 0 && (
            <circle
              cx={19} cy={19} r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={3}
              strokeDasharray={`${dash} ${circ}`}
              strokeLinecap="round"
              transform="rotate(-90 19 19)"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          )}
          <text
            x="19" y="22"
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill={total > 0 ? ringColor : "var(--text-muted)"}
            fontFamily="inherit"
          >
            {total > 0 ? `${ringPct}%` : "–"}
          </text>
        </svg>
        <span style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.2 }}>
          Done
        </span>
      </div>

      {/* Total duration */}
      {stats.totalDurationSec > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-primary)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {formatDuration(stats.totalDurationSec)}
          </span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Total</span>
        </div>
      )}

      {/* Load */}
      {stats.totalLoad > 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-accent)",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {stats.totalLoad}
          </span>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Load</span>
        </div>
      )}

      {/* Count pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
        {stats.completedCount > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "2px 4px",
              background: "var(--color-success-8)",
              borderRadius: 4,
              fontSize: 9,
            }}
          >
            <span style={{ color: "var(--color-success)" }}>✓</span>
            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>{stats.completedCount}</span>
          </div>
        )}
        {stats.skippedCount > 0 && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "2px 4px",
              background: "var(--color-danger-6)",
              borderRadius: 4,
              fontSize: 9,
            }}
          >
            <span style={{ color: "var(--color-danger)" }}>—</span>
            <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>{stats.skippedCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day load bar ─────────────────────────────────────────────────────────────

function DayLoadBar({ events, maxLoad }: { events: CalendarEvent[]; maxLoad: number }) {
  if (maxLoad === 0) return null;

  const dayLoad = events.reduce((sum, e) => sum + getEstimatedLoad(e), 0);
  const pct = maxLoad > 0 ? (dayLoad / maxLoad) * 100 : 0;

  // Color based on load intensity
  const barColor = dayLoad === 0
    ? "transparent"
    : pct > 75
    ? "var(--zone-5-color)"
    : pct > 50
    ? "var(--zone-4-color)"
    : pct > 25
    ? "var(--zone-2-color)"
    : "var(--zone-1-color)";

  return (
    <div
      title={dayLoad > 0 ? `Load: ${dayLoad}` : "Rest"}
      style={{
        height: 3,
        background: "var(--border-subtle)",
        borderRadius: 2,
        overflow: "hidden",
        margin: "0 var(--space-1) var(--space-1)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: barColor,
          borderRadius: 2,
          transition: "width 0.5s ease",
          animation: pct > 0 ? "loadBarFill 0.5s ease" : "none",
        }}
      />
    </div>
  );
}

// ─── Day column ───────────────────────────────────────────────────────────────

interface DayColumnProps {
  date: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onAddClick: (date: string) => void;
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
  maxWeekLoad: number;
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
  maxWeekLoad,
}: DayColumnProps) {
  const today    = isToday(date);
  const dayIndex = new Date(date + "T00:00:00").getDay();
  const dayName  = DAY_NAMES[dayIndex === 0 ? 6 : dayIndex - 1];
  const dayNum   = formatDayNum(date);
  const isWeekend = dayIndex === 0 || dayIndex === 6;

  // Hover state for interactive day column
  const [colHovered, setColHovered] = useState(false);

  const colBg = isDragOver
    ? "var(--color-accent-8)"
    : today
    ? "var(--color-accent-4)"
    : isWeekend
    ? "color-mix(in srgb, var(--bg-elevated) 40%, var(--bg-primary))"
    : "transparent";

  return (
    <div
      {...dropZoneProps}
      data-drop-date={date}
      className="day-col"
      onMouseEnter={() => setColHovered(true)}
      onMouseLeave={() => setColHovered(false)}
      style={{
        flex: 1,
        minWidth: 80,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border-subtle)",
        transition: "background 150ms ease-out",
        background: colHovered && !isDragOver
          ? today
            ? "var(--color-accent-8)"
            : isWeekend
            ? "color-mix(in srgb, var(--bg-elevated) 60%, var(--bg-primary))"
            : "var(--bg-elevated)"
          : colBg,
        outline: isDragOver ? "1.5px dashed var(--color-accent-50)" : "none",
        outlineOffset: -2,
        animation: isDragOver ? "calDropPulse 1.5s ease-in-out infinite" : "none",
        cursor: colHovered ? "pointer" : "default",
      }}
    >
      {/* ── Clickable day header ──────────────────────────────────── */}
      <button
        type="button"
        onClick={() => onAddClick(date)}
        aria-label={`Add event on ${date}`}
        style={{
          padding: "var(--space-2) var(--space-1)",
          textAlign: "center",
          background: today
            ? "linear-gradient(180deg, var(--color-accent-8) 0%, var(--color-accent-4) 100%)"
            : "transparent",
          flexShrink: 0,
          minHeight: "var(--cal-day-header-h)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          border: "none",
          borderBottom: "1px solid var(--border-subtle)",
          cursor: "pointer",
          width: "100%",
          position: "relative",
          transition: "background 150ms ease",
        }}
        className="day-header-btn"
        onMouseEnter={(e) => {
          if (!today)
            (e.currentTarget as HTMLButtonElement).style.background =
              "var(--color-accent-6)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = today
            ? "linear-gradient(180deg, var(--color-accent-8) 0%, var(--color-accent-4) 100%)"
            : "transparent";
        }}
      >
        {/* Day name */}
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: today ? "var(--color-accent)" : isWeekend ? "var(--text-secondary)" : "var(--text-muted)",
            fontWeight: today ? 700 : 500,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {dayName}
        </div>

        {/* Date number circle */}
        <div
          className="day-num-circle"
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--radius-full)",
            background: today ? "var(--color-accent)" : "transparent",
            color: today ? "white" : isWeekend ? "var(--text-secondary)" : "var(--text-primary)",
            fontSize: "var(--text-sm)",
            fontWeight: today ? 700 : 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: today ? "0 0 0 3px var(--color-accent-20), 0 0 12px var(--color-accent-30)" : "none",
            transition: "background 150ms ease, color 150ms ease, box-shadow 150ms ease",
          }}
        >
          {dayNum}
        </div>

        {/* Sport dots */}
        {events.length > 0 && (
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center", maxWidth: 48 }}>
            {events.slice(0, 4).map((e) => {
              const m = getSportMeta(e.workout?.sport ?? "other", e.eventType);
              return (
                <div
                  key={e.id}
                  style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, opacity: e.status === "skipped" ? 0.3 : 0.85 }}
                />
              );
            })}
          </div>
        )}

        {/* '+' add hint — appears on header hover */}
        <div
          className="day-add-hint"
          style={{
            position: "absolute",
            top: 4,
            right: 5,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--color-accent-15)",
            border: "1px solid var(--color-accent-30)",
            color: "var(--color-accent)",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 150ms ease",
            lineHeight: 1,
          }}
        >
          +
        </div>
      </button>

      {/* ── Events area (click empty space to add) ─────────────── */}
      <div
        role="button"
        tabIndex={0}
        aria-label={`Add event on ${date}`}
        onClick={(e) => {
          // Don't trigger if clicking on a chip
          if ((e.target as HTMLElement).closest(".cal-chip-wrapper")) return;
          onAddClick(date);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAddClick(date);
          }
        }}
        style={{
          flex: 1,
          padding: "var(--space-1)",
          display: "flex",
          flexDirection: "column",
          gap: 0,
          overflowY: "auto",
          minHeight: 120,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {/* Empty day placeholder — clickable visual hint */}
        {events.length === 0 && !isDragOver && (
          <div className="day-empty-hint">
            <div className="day-empty-plus">+</div>
          </div>
        )}

        {/* Events list */}
        {events.map((event, idx) => {
          const chipDragProps = getChipDragProps(event.id, date);
          const touchProps    = getTouchDragProps(event.id, date);
          return (
            <div key={event.id} style={{ display: "flex", flexDirection: "column" }}>
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

        {isSameDay && reorderDropIndex === events.length && <DropLine />}

        {/* Add more button — appears in filled days on hover */}
        {events.length > 0 && (
          <div
            className="day-add-more"
            style={{
              marginTop: "auto",
              padding: "4px var(--space-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              color: "var(--color-accent)",
              fontSize: 10,
              fontWeight: 600,
              opacity: 0,
              transition: "opacity 150ms ease",
              borderRadius: "var(--radius-sm)",
              background: "var(--color-accent-8)",
              border: "1px dashed var(--color-accent-25)",
            }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>+</span> Add
          </div>
        )}
      </div>

      {/* Day load bar */}
      <DayLoadBar events={events} maxLoad={maxWeekLoad} />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function WeekSkeleton() {
  return (
    <div style={{ display: "flex", flex: 1, minHeight: 400, opacity: 0.45 }}>
      {/* Sidebar skeleton */}
      <div
        style={{
          width: "var(--cal-weekly-sidebar-w)",
          minWidth: "var(--cal-weekly-sidebar-w)",
          borderRight: "1px solid var(--border-subtle)",
          padding: "var(--space-3) var(--space-2)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-3)",
          background: "var(--bg-surface)",
        }}
      >
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--bg-elevated)" }} />
        <div style={{ width: 40, height: 14, borderRadius: 4, background: "var(--bg-elevated)" }} />
        <div style={{ width: 32, height: 12, borderRadius: 4, background: "var(--bg-elevated)" }} />
      </div>

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
            <div style={{ height: 10, width: 28, borderRadius: 4, background: "var(--bg-elevated)", margin: "0 auto 5px" }} />
            <div style={{ height: 30, width: 30, borderRadius: "50%", background: "var(--bg-elevated)", margin: "0 auto" }} />
          </div>
          {i % 3 !== 2 && <div style={{ height: 54, borderRadius: 4, background: "var(--bg-elevated)" }} />}
          {i % 4 === 0 && <div style={{ height: 54, borderRadius: 4, background: "var(--bg-elevated)" }} />}
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

  // Swipe gesture (mobile)
  const touchStartX   = useRef<number | null>(null);
  const touchStartY   = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;
  const LONG_PRESS_MS   = 490;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current    = e.touches[0].clientX;
    touchStartY.current    = e.touches[0].clientY;
    touchStartTime.current = Date.now();
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null || touchStartTime.current === null) return;
      const elapsed = Date.now() - touchStartTime.current;
      if (elapsed >= LONG_PRESS_MS) {
        touchStartX.current = touchStartY.current = touchStartTime.current = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx < 0) nextPeriod();
        else prevPeriod();
      }
      touchStartX.current = touchStartY.current = touchStartTime.current = null;
    },
    [nextPeriod, prevPeriod],
  );

  // DnD hook
  const { dragState, getChipDragProps, getDropZoneProps, reorderDropIndex, onChipDragOver, getTouchDragProps } =
    useDragDrop({
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

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(from, i));

  // Compute weekly stats
  const allWeekEvents = weekDates.flatMap((d) => eventsByDate[d] ?? []);
  const weekStats     = computeWeekStats(allWeekEvents);

  // Max per-day load for load bar scaling
  const maxWeekLoad = Math.max(
    ...weekDates.map((d) =>
      (eventsByDate[d] ?? []).reduce((sum, e) => sum + getEstimatedLoad(e), 0),
    ),
    1,
  );

  if (isLoading) return <WeekSkeleton />;

  return (
    <>
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 400,
          userSelect: "none",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Weekly summary sidebar */}
        <WeeklySidebar stats={weekStats} />

        {/* Day columns */}
        {weekDates.map((date) => {
          const isDragOver      = dragState.dragOverDate === date;
          const isSameDayReorder = isDragOver && dragState.dragFromDate === date;

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
              maxWeekLoad={maxWeekLoad}
            />
          );
        })}
      </div>

      {/* Scoped styles */}
      <style>{`
        /* ── Desktop hover interactions ─────────────────────────── */
        @media (hover: hover) {

          /* Entire day header shows '+' hint on hover */
          .day-header-btn:hover .day-add-hint { opacity: 1 !important; }

          /* Date number circle: scale + accent bg on header hover */
          .day-header-btn:hover .day-num-circle {
            background: var(--color-accent) !important;
            color: white !important;
            box-shadow: 0 0 0 3px var(--color-accent-20) !important;
          }

          /* Empty day: show centered '+' on column hover */
          .day-col:hover .day-empty-hint {
            opacity: 1;
          }
          .day-col:hover .day-empty-plus {
            transform: scale(1.1);
          }

          /* Filled day: show 'Add more' row at bottom on hover */
          .day-col:hover .day-add-more { opacity: 1; }
        }

        /* ── Empty day hint (base) ───────────────────────────────── */
        .day-empty-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 1;
          min-height: 80px;
          opacity: 0;
          transition: opacity 150ms ease;
        }
        .day-empty-plus {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--color-accent-10);
          border: 1.5px dashed var(--color-accent-30);
          color: var(--color-accent);
          font-size: 18px;
          font-weight: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 150ms ease, background 150ms ease, border-color 150ms ease;
          line-height: 1;
        }
        .day-empty-plus:hover {
          background: var(--color-accent-20);
          border-color: var(--color-accent-50);
          transform: scale(1.15);
        }

        /* ── Mobile ─────────────────────────────────────────────── */
        @media (hover: none) {
          .day-empty-hint  { opacity: 0.4; }
          .day-add-more    { opacity: 0.5 !important; min-height: 44px !important; }
          .day-header-btn  { min-height: 56px !important; }
        }

        /* ── Narrow screen snap ─────────────────────────────────── */
        @media (max-width: 480px) {
          [data-drop-date] { scroll-snap-align: start; }
        }

        /* ── Drop line pulse ────────────────────────────────────── */
        @keyframes dropLinePulse {
          from { opacity: 0.5; }
          to   { opacity: 1; }
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
