"use client";

/**
 * ActivityFilters — compact two-row pill strip.
 *
 * Row 1: sport pills   — All · Cycling · Running · Swimming · Strength · Other
 * Row 2: date range    — All Time · This Week · This Month · Last 3 Months
 *
 * Design rules:
 *  - Entire bar sticky, blur backdrop
 *  - Each row scrolls independently, no scrollbar visible
 *  - Pills: 32px height, 44px min touch area via padding trick
 *  - Active: sport-color or accent background, white text
 *  - Inactive: transparent bg, border-subtle, text-secondary
 *  - No hardcoded hex values except white (#fff) for text on colored bg
 */

import * as React from "react";
import type { Sport, ActivitiesFilter } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Constants                                                            */
/* ------------------------------------------------------------------ */

const SPORT_PILLS: { value: Sport | ""; label: string; color: string }[] = [
  { value: "",         label: "All",      color: "var(--color-accent)" },
  { value: "cycling",  label: "Cycling",  color: "var(--sport-cycling)" },
  { value: "running",  label: "Running",  color: "var(--sport-running)" },
  { value: "swimming", label: "Swimming", color: "var(--sport-swimming)" },
  { value: "strength", label: "Strength", color: "var(--sport-strength)" },
  { value: "other",    label: "Other",    color: "var(--sport-other)" },
];

type DateRange = "all" | "week" | "month" | "3months";

const DATE_PILLS: { value: DateRange; label: string }[] = [
  { value: "all",     label: "All Time" },
  { value: "week",    label: "This Week" },
  { value: "month",   label: "This Month" },
  { value: "3months", label: "Last 3 Months" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function toYMD(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateRangeToFilter(range: DateRange): { from?: string; to?: string } {
  const now = new Date();
  if (range === "all") return { from: undefined, to: undefined };
  const start = new Date(now);
  if (range === "week")    start.setDate(now.getDate() - 7);
  if (range === "month")   start.setMonth(now.getMonth() - 1);
  if (range === "3months") start.setMonth(now.getMonth() - 3);
  return { from: toYMD(start), to: toYMD(now) };
}

function activeDateRange(filter: ActivitiesFilter): DateRange {
  if (!filter.from && !filter.to) return "all";
  if (filter.from) {
    const diffDays = Math.round(
      (Date.now() - new Date(filter.from).getTime()) / 86_400_000
    );
    if (diffDays <= 8)  return "week";
    if (diffDays <= 32) return "month";
    if (diffDays <= 95) return "3months";
  }
  return "all";
}

/* ------------------------------------------------------------------ */
/*  Shared pill CSS injected once                                        */
/* ------------------------------------------------------------------ */

const PILL_STYLE = `
  .af-strip {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    /* hide scrollbar cross-browser */
    -ms-overflow-style: none;
    scrollbar-width: none;
    /* padding so focus rings aren't clipped */
    padding: 4px 16px;
  }
  @media (min-width: 1024px) {
    .af-strip { padding-left: 24px; padding-right: 24px; }
  }
  .af-strip::-webkit-scrollbar { display: none; }

  .af-pill {
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 14px;
    border-radius: 999px;
    font-size: var(--text-sm);
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
    cursor: pointer;
    border: 1px solid var(--border-subtle);
    background: transparent;
    color: var(--text-secondary);
    transition:
      background 150ms ease,
      border-color 150ms ease,
      color 150ms ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  .af-pill:hover:not(.af-pill--active) {
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .af-pill--active {
    border-color: transparent;
    color: #ffffff;
    font-weight: 600;
  }
`;

/* ------------------------------------------------------------------ */
/*  Pill sub-component                                                   */
/* ------------------------------------------------------------------ */

interface PillProps {
  label: string;
  active: boolean;
  activeColor: string;
  onClick: () => void;
}

function Pill({ label, active, activeColor, onClick }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`af-pill${active ? " af-pill--active" : ""}`}
      style={active ? { background: activeColor } : undefined}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                       */
/* ------------------------------------------------------------------ */

export interface ActivityFiltersProps {
  filter: ActivitiesFilter;
  onFilterChange: (patch: Partial<ActivitiesFilter>) => void;
  onReset: () => void;
  totalElements?: number;
  loading?: boolean;
  /** Kept for backwards-compat — no-op */
  viewMode?: "grid" | "list";
  /** Kept for backwards-compat — no-op */
  onViewModeChange?: (mode: "grid" | "list") => void;
}

export function ActivityFilters({
  filter,
  onFilterChange,
  onReset,
  totalElements,
  loading,
}: ActivityFiltersProps) {
  const activeSport  = filter.sport ?? "";
  const activePeriod = activeDateRange(filter);
  const isFiltered   = activeSport !== "" || activePeriod !== "all";

  function handleSport(value: Sport | "") {
    onFilterChange({ sport: value === "" ? undefined : value, page: 0 });
  }

  function handleDate(range: DateRange) {
    const { from, to } = dateRangeToFilter(range);
    onFilterChange({ from, to, page: 0 });
  }

  return (
    <>
      <style>{PILL_STYLE}</style>

      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "rgba(10, 10, 15, 0.80)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        {/* ── Row 1: Sport ── */}
        <div className="af-strip" role="group" aria-label="Filter by sport">
          {SPORT_PILLS.map((p) => (
            <Pill
              key={p.value}
              label={p.label}
              active={activeSport === p.value}
              activeColor={p.color}
              onClick={() => handleSport(p.value as Sport | "")}
            />
          ))}
        </div>

        {/* ── Row 2: Date + count + clear ── */}
        <div
          className="af-strip"
          style={{ paddingBottom: 8 }}
          role="group"
          aria-label="Filter by date range"
        >
          {DATE_PILLS.map((p) => (
            <Pill
              key={p.value}
              label={p.label}
              active={activePeriod === p.value}
              activeColor="var(--color-accent)"
              onClick={() => handleDate(p.value)}
            />
          ))}

          {/* Vertical divider */}
          <span
            aria-hidden="true"
            style={{
              width: 1,
              height: 16,
              background: "var(--border-subtle)",
              flexShrink: 0,
              marginLeft: 4,
              marginRight: 4,
            }}
          />

          {/* Result count */}
          {!loading && totalElements !== undefined && (
            <span
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {totalElements.toLocaleString()}{" "}
              {totalElements === 1 ? "activity" : "activities"}
            </span>
          )}

          {/* Clear — only when filter active */}
          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Clear all filters"
              style={{
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                height: 26,
                padding: "0 10px",
                borderRadius: 999,
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                cursor: "pointer",
                border: "1px solid var(--border-subtle)",
                background: "transparent",
                color: "var(--text-muted)",
                transition: "color 150ms ease, border-color 150ms ease",
                marginLeft: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-muted)";
                e.currentTarget.style.borderColor = "var(--border-subtle)";
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </>
  );
}
