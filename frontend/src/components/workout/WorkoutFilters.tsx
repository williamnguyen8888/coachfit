"use client";

/**
 * WorkoutFilters — sticky filter bar for the workout library.
 * Includes:
 *  - Sport filter (cycling | running | swimming | strength | other | all)
 *  - Source filter (all | mine | template)
 *  - Sort options
 *  - Layout view toggle (Grid / List)
 *  - Glassmorphic frosting container
 */

import * as React from "react";
import { Filter, X, LayoutGrid, List, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { WorkoutsFilter, WorkoutSource } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Segment control helper                                               */
/* ------------------------------------------------------------------ */

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="scrollbar-none"
      style={{
        display: "flex",
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "var(--radius-md)",
        padding: 3,
        gap: 2,
        overflowX: "auto",
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className="cursor-pointer"
            style={{
              padding: "6px 12px",
              borderRadius: "calc(var(--radius-md) - 2px)",
              border: "none",
              background: active ? "var(--color-accent)" : "transparent",
              color: active ? "#ffffff" : "var(--text-muted)",
              fontSize: "var(--text-sm)",
              fontWeight: active ? 600 : 400,
              cursor: active ? "default" : "pointer",
              transition: `all var(--duration-micro) ease-out`,
              whiteSpace: "nowrap",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  WorkoutFilters                                                       */
/* ------------------------------------------------------------------ */

const SPORT_OPTIONS: SegmentOption<Sport | "">[] = [
  { value: "", label: "All Sports" },
  { value: "cycling", label: "Cycling" },
  { value: "running", label: "Running" },
  { value: "swimming", label: "Swimming" },
  { value: "strength", label: "Strength" },
];

const SOURCE_OPTIONS: SegmentOption<WorkoutSource>[] = [
  { value: "all", label: "All Workouts" },
  { value: "mine", label: "My Workouts" },
  { value: "template", label: "Templates" },
];

const SORT_OPTIONS: SegmentOption<string>[] = [
  { value: "createdAt,desc", label: "Newest First" },
  { value: "createdAt,asc", label: "Oldest First" },
  { value: "name,asc", label: "Name A→Z" },
  { value: "estimatedDuration,asc", label: "Shortest First" },
];

export interface WorkoutFiltersProps {
  filter: WorkoutsFilter;
  onFilterChange: (patch: Partial<WorkoutsFilter>) => void;
  onReset: () => void;
  totalElements?: number;
  loading?: boolean;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function WorkoutFilters({
  filter,
  onFilterChange,
  onReset,
  totalElements,
  loading,
  viewMode,
  onViewModeChange,
}: WorkoutFiltersProps) {
  const activeFilters = [filter.sport, filter.source !== "all" && filter.source].filter(
    Boolean
  ).length;

  return (
    <div
      style={{
        background: "rgba(10, 10, 15, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div className="px-4 lg:px-6 py-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter icon + total count */}
            <div className="flex items-center gap-2 shrink-0 mr-2">
              <Filter size={14} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                Filters
              </span>
              {activeFilters > 0 && (
                <span
                  style={{
                    background: "var(--color-accent)",
                    color: "white",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 700,
                    padding: "1px 6px",
                    lineHeight: 1.6,
                  }}
                  aria-label={`${activeFilters} active filter${activeFilters > 1 ? "s" : ""}`}
                >
                  {activeFilters}
                </span>
              )}
            </div>

            {/* ── Source segment ── */}
            <SegmentControl
              label="Workout source"
              options={SOURCE_OPTIONS}
              value={filter.source ?? "all"}
              onChange={(v) => onFilterChange({ source: v as WorkoutSource, page: 0 })}
            />

            {/* ── Sport filter ── */}
            <SegmentControl
              label="Sport filter"
              options={SPORT_OPTIONS}
              value={filter.sport ?? ""}
              onChange={(v) => onFilterChange({ sport: v as Sport | "", page: 0 })}
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            {/* Sort & Reset */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <select
                  aria-label="Sort workouts"
                  value={filter.sort ?? "createdAt,desc"}
                  onChange={(e) => onFilterChange({ sort: e.target.value, page: 0 })}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-secondary)",
                    fontSize: "var(--text-sm)",
                    padding: "8px 30px 8px 12px",
                    cursor: "pointer",
                    outline: "none",
                    height: 36,
                    transition: "all 0.2s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-accent)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  }}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  style={{
                    position: "absolute",
                    right: 10,
                    pointerEvents: "none",
                    color: "var(--text-muted)",
                  }}
                  aria-hidden="true"
                />
              </div>

              {/* Reset button */}
              {activeFilters > 0 && (
                <Button
                  id="workout-filters-reset"
                  variant="ghost"
                  size="sm"
                  leftIcon={<X size={13} />}
                  onClick={onReset}
                  aria-label="Reset all workout filters"
                  className="hover:bg-[rgba(255,255,255,0.04)]"
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Results count & view mode */}
            <div className="flex items-center gap-3">
              {!loading && totalElements !== undefined && (
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--text-muted)",
                    fontWeight: 500,
                  }}
                  aria-live="polite"
                >
                  {totalElements.toLocaleString()} workouts
                </span>
              )}

              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.02)] p-1 rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.08)]">
                <button
                  onClick={() => onViewModeChange("list")}
                  className={`p-2 sm:p-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[var(--color-accent)] text-white shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                  title="List View"
                  aria-label="Switch to list view"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => onViewModeChange("grid")}
                  className={`p-2 sm:p-1.5 rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[var(--color-accent)] text-white shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                  title="Grid View"
                  aria-label="Switch to grid view"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
