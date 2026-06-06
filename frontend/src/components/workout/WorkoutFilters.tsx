"use client";

/**
 * WorkoutFilters — compact two-row pill strip.
 *
 * Row 1: Source — All Workouts · My Workouts · Templates
 * Row 2: Sport  — All Sports · Cycling · Running · Swimming · Strength · Other
 *
 * Design rules:
 *  - Sticky top, blur backdrop
 *  - Scrolls horizontally, NO visible scrollbar (cross-browser)
 *  - Pills: 32px height, clean active state
 *  - Active: var(--color-accent) bg, white text, no border
 *  - Inactive: transparent, border-subtle, text-secondary
 */

import * as React from "react";
import type { WorkoutsFilter, WorkoutSource } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Scoped pill CSS                                                      */
/* ------------------------------------------------------------------ */

const PILL_STYLE = `
  .wf-strip {
    display: flex;
    align-items: center;
    gap: 6px;
    overflow-x: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
    padding: 4px 16px;
  }
  @media (min-width: 1024px) {
    .wf-strip { padding-left: 24px; padding-right: 24px; }
  }
  .wf-strip::-webkit-scrollbar { display: none; }

  .wf-pill {
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

  .wf-pill:hover:not(.wf-pill--active) {
    border-color: var(--border-default);
    color: var(--text-primary);
  }

  .wf-pill--active {
    background: var(--color-accent);
    border-color: transparent;
    color: #ffffff;
    font-weight: 600;
  }
`;

/* ------------------------------------------------------------------ */
/*  Option lists                                                         */
/* ------------------------------------------------------------------ */

const SOURCE_OPTIONS: { value: WorkoutSource; label: string }[] = [
  { value: "all",      label: "All Workouts" },
  { value: "mine",     label: "My Workouts" },
  { value: "template", label: "Templates" },
];

const SPORT_OPTIONS: { value: Sport | ""; label: string }[] = [
  { value: "",         label: "All Sports" },
  { value: "cycling",  label: "Cycling" },
  { value: "running",  label: "Running" },
  { value: "swimming", label: "Swimming" },
  { value: "strength", label: "Strength" },
  { value: "other",    label: "Other" },
];

/* ------------------------------------------------------------------ */
/*  Pill                                                                 */
/* ------------------------------------------------------------------ */

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`wf-pill${active ? " wf-pill--active" : ""}`}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  WorkoutFilters                                                       */
/* ------------------------------------------------------------------ */

export interface WorkoutFiltersProps {
  filter: WorkoutsFilter;
  onFilterChange: (patch: Partial<WorkoutsFilter>) => void;
  onReset: () => void;
  totalElements?: number;
  loading?: boolean;
  /** Kept for API compat — no-op */
  viewMode?: "grid" | "list";
  /** Kept for API compat — no-op */
  onViewModeChange?: (mode: "grid" | "list") => void;
}

export function WorkoutFilters({
  filter,
  onFilterChange,
  onReset,
  totalElements,
  loading,
}: WorkoutFiltersProps) {
  const activeSource = filter.source ?? "all";
  const activeSport  = filter.sport  ?? "";
  const isDirty      = activeSport !== "" || activeSource !== "all";

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
        {/* ── Row 1: Source ── */}
        <div className="wf-strip" role="group" aria-label="Filter by source">
          {SOURCE_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              active={activeSource === opt.value}
              onClick={() =>
                onFilterChange({ source: opt.value as WorkoutSource, page: 0 })
              }
            />
          ))}
        </div>

        {/* ── Row 2: Sport + count + reset ── */}
        <div
          className="wf-strip"
          style={{ paddingBottom: 8 }}
          role="group"
          aria-label="Filter by sport"
        >
          {SPORT_OPTIONS.map((opt) => (
            <Pill
              key={opt.value}
              label={opt.label}
              active={activeSport === opt.value}
              onClick={() =>
                onFilterChange({ sport: opt.value as Sport | "", page: 0 })
              }
            />
          ))}

          {/* Divider */}
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

          {/* Count */}
          {!loading && totalElements !== undefined && (
            <span
              aria-live="polite"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {totalElements.toLocaleString()}
            </span>
          )}

          {/* Reset — only when dirty */}
          {isDirty && (
            <button
              type="button"
              onClick={onReset}
              aria-label="Reset all filters"
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
