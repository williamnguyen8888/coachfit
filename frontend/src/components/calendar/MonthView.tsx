"use client";

// src/components/calendar/MonthView.tsx
// Full calendar month grid (7×5 or 7×6 rows).
// Shows max 3 events per cell + overflow badge.

import { useState, useCallback } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { useCalendarStore } from "@/stores/calendar.store";
import { CalendarEventChip } from "./CalendarEventChip";
import { CalendarEventModal } from "./CalendarEventModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isToday(dateStr: string): boolean {
  return dateStr === toISODate(new Date());
}

function isCurrentMonth(dateStr: string, anchorDate: string): boolean {
  return dateStr.slice(0, 7) === anchorDate.slice(0, 7);
}

/**
 * Build the grid of dates to display in the month view.
 * Always starts on Monday and ends on Sunday for a clean 7-column grid.
 */
function buildMonthGrid(anchorDate: string): string[] {
  const anchor = new Date(anchorDate + "T00:00:00");
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);

  // Find the Monday on or before the first of month
  const startDay = firstOfMonth.getDay(); // 0=Sun
  const gridStart = new Date(firstOfMonth);
  const daysBack = startDay === 0 ? 6 : startDay - 1;
  gridStart.setDate(gridStart.getDate() - daysBack);

  // Find the Sunday on or after the last of month
  const endDay = lastOfMonth.getDay(); // 0=Sun
  const gridEnd = new Date(lastOfMonth);
  const daysForward = endDay === 0 ? 0 : 7 - endDay;
  gridEnd.setDate(gridEnd.getDate() + daysForward);

  const dates: string[] = [];
  const cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    dates.push(toISODate(cursor));
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
        minWidth: 180,
      }}
    >
      {extraEvents.map((event) => (
        <CalendarEventChip
          key={event.id}
          event={event}
          compact
          onClick={(e) => {
            onEventClick(e);
            onClose();
          }}
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
}

function DayCell({ date, events, inMonth, onEventClick, onAddClick }: DayCellProps) {
  const today = isToday(date);
  const [showOverflow, setShowOverflow] = useState(false);
  const dayNum = new Date(date + "T00:00:00").getDate();

  const visibleEvents = events.slice(0, MAX_VISIBLE);
  const overflowCount = events.length - MAX_VISIBLE;
  const hasOverflow = overflowCount > 0;

  return (
    <div
      style={{
        position: "relative",
        borderRight: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
        minHeight: 100,
        display: "flex",
        flexDirection: "column",
        background: today
          ? "rgba(139,92,246,0.04)"
          : !inMonth
            ? "rgba(0,0,0,0.15)"
            : "transparent",
        transition: "background var(--duration-micro) ease-out",
      }}
      onMouseEnter={(e) => {
        if (inMonth) {
          (e.currentTarget as HTMLDivElement).style.background = today
            ? "rgba(139,92,246,0.07)"
            : "rgba(255,255,255,0.02)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = today
          ? "rgba(139,92,246,0.04)"
          : !inMonth
            ? "rgba(0,0,0,0.15)"
            : "transparent";
      }}
    >
      {/* Day number */}
      <div style={{ padding: "var(--space-1) var(--space-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-full)",
            background: today ? "var(--color-accent)" : "transparent",
            color: today ? "white" : inMonth ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontWeight: today ? 700 : inMonth ? 500 : 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {dayNum}
        </span>

        {/* Add button (appears on hover) */}
        {inMonth && (
          <button
            type="button"
            onClick={() => onAddClick(date)}
            aria-label={`Add event on ${date}`}
            title={`Add event`}
            style={{
              width: 20,
              height: 20,
              background: "transparent",
              border: "none",
              borderRadius: "var(--radius-full)",
              color: "var(--text-muted)",
              fontSize: 16,
              lineHeight: 1,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0,
              padding: 0,
              transition: "opacity var(--duration-micro) ease-out",
            }}
            className="month-add-btn"
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
          >
            +
          </button>
        )}
      </div>

      {/* Events */}
      <div style={{ flex: 1, padding: "0 var(--space-1) var(--space-1)", display: "flex", flexDirection: "column", gap: "2px" }}>
        {visibleEvents.map((event) => (
          <CalendarEventChip
            key={event.id}
            event={event}
            compact
            onClick={onEventClick}
          />
        ))}

        {/* Overflow badge */}
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setShowOverflow((v) => !v)}
            style={{
              background: "var(--bg-input)",
              border: "none",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              padding: "2px var(--space-2)",
              cursor: "pointer",
              textAlign: "left",
            }}
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
          <div style={{ height: 20, width: 20, borderRadius: "50%", background: "var(--bg-elevated)" }} />
          {i % 3 === 0 && <div style={{ height: 20, borderRadius: 4, background: "var(--bg-elevated)" }} />}
          {i % 5 === 0 && <div style={{ height: 20, borderRadius: 4, background: "var(--bg-elevated)" }} />}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MonthView() {
  const { anchorDate, eventsByDate, isLoading } = useCalendarStore();

  const [modalState, setModalState] = useState<
    | { mode: "create"; date: string }
    | { mode: "edit"; event: CalendarEvent }
    | null
  >(null);

  const closeModal = useCallback(() => setModalState(null), []);

  const gridDates = buildMonthGrid(anchorDate);

  if (isLoading) return <MonthSkeleton />;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Day-of-week header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid var(--border-default)",
          }}
        >
          {DAY_NAMES_SHORT.map((name) => (
            <div
              key={name}
              style={{
                padding: "var(--space-2)",
                textAlign: "center",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                borderRight: "1px solid var(--border-subtle)",
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            flex: 1,
          }}
        >
          {gridDates.map((date) => (
            <DayCell
              key={date}
              date={date}
              events={eventsByDate[date] ?? []}
              inMonth={isCurrentMonth(date, anchorDate)}
              onEventClick={(event) => setModalState({ mode: "edit", event })}
              onAddClick={(d) => setModalState({ mode: "create", date: d })}
            />
          ))}
        </div>
      </div>

      {/* Hover visibility for add buttons on mobile */}
      <style>{`
        @media (hover: none) {
          .month-add-btn { opacity: 0.5 !important; }
        }
        @media (hover: hover) {
          .day-cell:hover .month-add-btn { opacity: 1 !important; }
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
