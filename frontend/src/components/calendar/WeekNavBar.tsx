"use client";

// src/components/calendar/WeekNavBar.tsx
// Navigation bar for the week view: prev/next week, today snap, view toggle.

import { useCalendarStore } from "@/stores/calendar.store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekRange(from: string, to: string): string {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeekNavBar() {
  const { viewMode, setViewMode, prevPeriod, nextPeriod, goToToday, getWeekRange, getMonthRange, anchorDate } =
    useCalendarStore();

  const today = new Date().toISOString().split("T")[0];
  const { from, to } = viewMode === "week" ? getWeekRange() : getMonthRange();
  const isOnToday =
    viewMode === "week"
      ? anchorDate >= from && anchorDate <= to
      : anchorDate.startsWith(today.slice(0, 7));

  const label = viewMode === "week"
    ? formatWeekRange(from, to)
    : new Date(anchorDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const navBtnStyle = (disabled?: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-sm)",
    cursor: disabled ? "default" : "pointer",
    color: "var(--text-secondary)",
    fontSize: 18,
    flexShrink: 0,
    transition: "background var(--duration-micro) ease-out",
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        flexWrap: "wrap",
      }}
    >
      {/* Prev / Next */}
      <div style={{ display: "flex", gap: "var(--space-1)" }}>
        <button
          type="button"
          onClick={prevPeriod}
          aria-label="Previous period"
          style={navBtnStyle()}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)"; }}
        >
          ‹
        </button>
        <button
          type="button"
          onClick={nextPeriod}
          aria-label="Next period"
          style={navBtnStyle()}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-elevated)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)"; }}
        >
          ›
        </button>
      </div>

      {/* Date label */}
      <span
        style={{
          flex: 1,
          fontSize: "var(--text-base)",
          fontWeight: 600,
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>

      {/* Today button */}
      {!isOnToday && (
        <button
          type="button"
          onClick={goToToday}
          style={{
            padding: "var(--space-1) var(--space-3)",
            background: "transparent",
            border: "1px solid var(--color-accent)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-accent)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Today
        </button>
      )}

      {/* View toggle */}
      <div
        style={{
          display: "flex",
          background: "var(--bg-input)",
          borderRadius: "var(--radius-sm)",
          padding: 2,
          flexShrink: 0,
        }}
      >
        {(["week", "month"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            style={{
              padding: "4px 12px",
              background: viewMode === mode ? "var(--bg-elevated)" : "transparent",
              border: "none",
              borderRadius: "calc(var(--radius-sm) - 2px)",
              color: viewMode === mode ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "var(--text-sm)",
              fontWeight: viewMode === mode ? 600 : 400,
              cursor: "pointer",
              transition: "all var(--duration-micro) ease-out",
              textTransform: "capitalize",
            }}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
