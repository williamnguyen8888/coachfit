"use client";

// src/components/calendar/WeekNavBar.tsx
// Premium navigation bar for the calendar — intervals.icu inspired.
// Features:
//   - SVG arrow buttons with smooth hover states
//   - Week number badge (W23)
//   - Animated view-mode toggle with sliding indicator pill
//   - Today button with accent glow
//   - Slide animation on label when switching periods

import { useState, useEffect, useRef } from "react";
import { useCalendarStore } from "@/stores/calendar.store";
import { toLocalDateString } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekNumber(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const dayOfYear = (d: Date) => {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime() + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000;
    return Math.floor(diff / 86400000);
  };
  return Math.ceil(dayOfYear(d) / 7);
}

function formatWeekRange(from: string, to: string): string {
  const start = new Date(from + "T00:00:00");
  const end   = new Date(to + "T00:00:00");
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth   = end.toLocaleDateString("en-US", { month: "short" });
  const startDay   = start.getDate();
  const endDay     = end.getDate();
  const year       = end.getFullYear();
  if (startMonth === endMonth) return `${startMonth} ${startDay}–${endDay}, ${year}`;
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

function formatMonthLabel(anchorDate: string): string {
  return new Date(anchorDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

// ─── SVG Arrow buttons ────────────────────────────────────────────────────────

function NavArrowBtn({
  direction,
  onClick,
  label,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        background: hovered ? "var(--bg-elevated)" : "var(--bg-input)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        color: hovered ? "var(--text-primary)" : "var(--text-secondary)",
        flexShrink: 0,
        transition: "background 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out",
        borderColor: hovered ? "var(--color-accent-30)" : "var(--border-default)",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        style={{
          transform: direction === "prev" ? "none" : "rotate(180deg)",
          transition: "transform 120ms ease",
        }}
      >
        <path
          d="M9 2L4 7L9 12"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// ─── View toggle ──────────────────────────────────────────────────────────────

function ViewToggle({
  active,
  onChange,
}: {
  active: "week" | "month";
  onChange: (v: "week" | "month") => void;
}) {
  const pillRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Animate pill indicator
  useEffect(() => {
    const pill = pillRef.current;
    const wrap = wrapRef.current;
    if (!pill || !wrap) return;
    const activeBtn = wrap.querySelector(`[data-mode="${active}"]`) as HTMLElement | null;
    if (!activeBtn) return;
    pill.style.width  = `${activeBtn.offsetWidth}px`;
    pill.style.left   = `${activeBtn.offsetLeft}px`;
  }, [active]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        display: "flex",
        background: "var(--bg-input)",
        borderRadius: "var(--radius-sm)",
        padding: 3,
        flexShrink: 0,
        gap: 1,
      }}
    >
      {/* Animated pill */}
      <div
        ref={pillRef}
        aria-hidden
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          height: "calc(100% - 6px)",
          background: "var(--bg-elevated)",
          borderRadius: "calc(var(--radius-sm) - 2px)",
          boxShadow: "var(--shadow-sm)",
          transition: "left 200ms cubic-bezier(0.4,0,0.2,1), width 200ms cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: "none",
          border: "1px solid var(--border-default)",
        }}
      />

      {(["week", "month"] as const).map((mode) => (
        <button
          key={mode}
          data-mode={mode}
          type="button"
          onClick={() => onChange(mode)}
          style={{
            position: "relative",
            zIndex: 1,
            padding: "4px 14px",
            background: "transparent",
            border: "none",
            borderRadius: "calc(var(--radius-sm) - 2px)",
            color: active === mode ? "var(--text-primary)" : "var(--text-muted)",
            fontSize: "var(--text-sm)",
            fontWeight: active === mode ? 600 : 400,
            cursor: "pointer",
            transition: "color 200ms ease",
            whiteSpace: "nowrap",
          }}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ─── Date label with slide animation ─────────────────────────────────────────

function AnimatedDateLabel({ label, weekNum }: { label: string; weekNum?: number }) {
  const [displayed, setDisplayed] = useState(label);
  const [animKey, setAnimKey]     = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
    // Small delay so old label animates out before new one appears
    const t = setTimeout(() => setDisplayed(label), 80);
    return () => clearTimeout(t);
  }, [label]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: 0 }}>
      {/* Week number badge */}
      {weekNum !== undefined && (
        <span
          style={{
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 700,
            color: "var(--color-accent)",
            background: "var(--color-accent-10)",
            border: "1px solid var(--color-accent-20)",
            borderRadius: 5,
            padding: "1px 5px",
            letterSpacing: "0.03em",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          W{weekNum}
        </span>
      )}

      <span
        key={animKey}
        style={{
          fontSize: "var(--text-base)",
          fontWeight: 600,
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          animation: "weekSlideLeft 200ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {displayed}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeekNavBar() {
  const {
    viewMode,
    setViewMode,
    prevPeriod,
    nextPeriod,
    goToToday,
    getWeekRange,
    getMonthRange,
    anchorDate,
  } = useCalendarStore();

  const today     = toLocalDateString(new Date());
  const { from, to } = viewMode === "week" ? getWeekRange() : getMonthRange();

  const isOnToday =
    viewMode === "week"
      ? anchorDate >= from && anchorDate <= to
      : anchorDate.startsWith(today.slice(0, 7));

  const label   = viewMode === "week" ? formatWeekRange(from, to) : formatMonthLabel(anchorDate);
  const weekNum = viewMode === "week" ? getWeekNumber(from) : undefined;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-4)",
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        flexWrap: "wrap",
        minHeight: 52,
      }}
    >
      {/* Prev / Next */}
      <div style={{ display: "flex", gap: "var(--space-1)" }}>
        <NavArrowBtn direction="prev" onClick={prevPeriod} label="Previous period" />
        <NavArrowBtn direction="next" onClick={nextPeriod} label="Next period" />
      </div>

      {/* Animated date label + week number */}
      <AnimatedDateLabel label={label} weekNum={weekNum} />

      {/* Today button */}
      {!isOnToday && (
        <button
          type="button"
          onClick={goToToday}
          style={{
            padding: "5px 14px",
            background: "var(--color-accent-10)",
            border: "1px solid var(--color-accent-30)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-accent)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: "pointer",
            flexShrink: 0,
            transition: "background 150ms ease, box-shadow 150ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-20)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px var(--color-accent-20)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-10)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          Today
        </button>
      )}

      {/* View toggle */}
      <ViewToggle active={viewMode} onChange={setViewMode} />
    </div>
  );
}
