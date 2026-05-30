"use client";

/**
 * WorkoutFilters — sticky filter bar for the workout library.
 *
 * Controls: sport selector, source (all / mine / templates), sort.
 * Shows active filter count pill + reset button.
 */

import * as React from "react";
import { Filter, X } from "lucide-react";
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
      style={{
        display: "flex",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        padding: 2,
        gap: 2,
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
            style={{
              padding: "4px 12px",
              borderRadius: "calc(var(--radius-sm) - 2px)",
              border: "none",
              background: active ? "var(--bg-surface)" : "transparent",
              color: active ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "var(--text-sm)",
              fontWeight: active ? 600 : 400,
              cursor: active ? "default" : "pointer",
              transition: `all var(--duration-micro) ease-out`,
              whiteSpace: "nowrap",
              boxShadow: active ? "var(--shadow-sm)" : "none",
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
  { value: "all", label: "All" },
  { value: "mine", label: "My Workouts" },
  { value: "template", label: "Templates" },
];

const SORT_OPTIONS: SegmentOption<string>[] = [
  { value: "createdAt,desc", label: "Newest" },
  { value: "createdAt,asc", label: "Oldest" },
  { value: "name,asc", label: "Name A→Z" },
  { value: "estimatedDuration,asc", label: "Shortest" },
];

export interface WorkoutFiltersProps {
  filter: WorkoutsFilter;
  onFilterChange: (patch: Partial<WorkoutsFilter>) => void;
  onReset: () => void;
  totalElements?: number;
  loading?: boolean;
}

export function WorkoutFilters({
  filter,
  onFilterChange,
  onReset,
  totalElements,
  loading,
}: WorkoutFiltersProps) {
  const activeFilters = [filter.sport, filter.source !== "all" && filter.source].filter(
    Boolean
  ).length;

  return (
    <div
      style={{
        background: "var(--bg-primary)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "10px 16px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Filter icon + total count */}
      <div className="flex items-center gap-2 shrink-0">
        <Filter size={14} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
        <span
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
          aria-live="polite"
          aria-label={`Total workouts: ${totalElements ?? "loading"}`}
        >
          {loading ? "—" : totalElements?.toLocaleString() ?? "—"} workouts
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
      <div style={{ overflowX: "auto" }}>
        <SegmentControl
          label="Sport filter"
          options={SPORT_OPTIONS}
          value={filter.sport ?? ""}
          onChange={(v) => onFilterChange({ sport: v as Sport | "", page: 0 })}
        />
      </div>

      {/* ── Sort ── */}
      <div className="ml-auto flex items-center gap-2">
        <select
          aria-label="Sort workouts"
          value={filter.sort ?? "createdAt,desc"}
          onChange={(e) => onFilterChange({ sort: e.target.value, page: 0 })}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-primary)",
            fontSize: "var(--text-sm)",
            padding: "5px 10px",
            cursor: "pointer",
            outline: "none",
            height: 32,
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Reset button */}
        {activeFilters > 0 && (
          <Button
            id="workout-filters-reset"
            variant="ghost"
            size="sm"
            leftIcon={<X size={13} />}
            onClick={onReset}
            aria-label="Reset all workout filters"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
