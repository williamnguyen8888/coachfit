"use client";

/**
 * ActivityFilters — filter bar for the activities list.
 * Includes:
 *  - Sport filter (cycling | running | swimming | strength | other | all)
 *  - Source filter (strava | garmin | manual | upload | all)
 *  - Date range (from / to)
 *  - Layout view toggle (Grid / List)
 *  - Glassmorphic frosting overlay container
 */

import * as React from "react";
import { X, SlidersHorizontal, ChevronDown, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Sport, ActivitySource, ActivitiesFilter } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Constants                                                            */
/* ------------------------------------------------------------------ */

const SPORTS: { value: Sport | ""; label: string }[] = [
  { value: "", label: "All Sports" },
  { value: "cycling", label: "Cycling" },
  { value: "running", label: "Running" },
  { value: "swimming", label: "Swimming" },
  { value: "strength", label: "Strength" },
  { value: "other", label: "Other" },
];

const SOURCES: { value: ActivitySource | ""; label: string }[] = [
  { value: "", label: "All Sources" },
  { value: "strava", label: "Strava" },
  { value: "garmin", label: "Garmin" },
  { value: "manual", label: "Manual" },
  { value: "upload", label: "Upload" },
];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                       */
/* ------------------------------------------------------------------ */

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: FilterSelectProps) {
  const isActive = value !== "";

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative flex items-center">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            background: isActive
              ? "var(--color-accent-12)"
              : "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${isActive ? "var(--color-accent-40)" : "rgba(255, 255, 255, 0.08)"}`,
            borderRadius: "var(--radius-md)",
            color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: isActive ? 600 : 400,
            padding: "8px 34px 8px 12px",
            cursor: "pointer",
            minWidth: 130,
            transition: `all var(--duration-micro) ease-out`,
            outline: "none",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLSelectElement).style.borderColor =
              "var(--color-accent)";
            (e.currentTarget as HTMLSelectElement).style.boxShadow =
              "var(--color-focus-ring)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLSelectElement).style.borderColor = isActive
              ? "var(--color-accent-40)"
              : "rgba(255, 255, 255, 0.08)";
            (e.currentTarget as HTMLSelectElement).style.boxShadow = "none";
          }}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          style={{
            position: "absolute",
            right: 10,
            pointerEvents: "none",
            color: isActive ? "var(--color-accent)" : "var(--text-muted)",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

interface DateInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DateInput({ id, label, value, onChange }: DateInputProps) {
  const isActive = value !== "";
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={label}
        style={{
          background: isActive
            ? "var(--color-accent-12)"
            : "rgba(255, 255, 255, 0.02)",
          border: `1px solid ${isActive ? "var(--color-accent-40)" : "rgba(255, 255, 255, 0.08)"}`,
          borderRadius: "var(--radius-md)",
          color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
          fontSize: "var(--text-sm)",
          fontWeight: isActive ? 600 : 400,
          padding: "8px 12px",
          cursor: "pointer",
          width: 145,
          outline: "none",
          transition: `all var(--duration-micro) ease-out`,
          colorScheme: "dark",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.boxShadow = "var(--color-focus-ring)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = isActive
            ? "var(--color-accent-40)"
            : "rgba(255, 255, 255, 0.08)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active filter chips                                                  */
/* ------------------------------------------------------------------ */

interface ActiveChipProps {
  label: string;
  onRemove: () => void;
}

function ActiveChip({ label, onRemove }: ActiveChipProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: "var(--radius-full)",
        background: "var(--color-accent-15)",
        border: "1px solid var(--color-accent-30)",
        fontSize: "var(--text-xs)",
        color: "var(--color-accent)",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          color: "inherit",
          opacity: 0.7,
          lineHeight: 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
      >
        <X size={12} aria-hidden="true" />
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                       */
/* ------------------------------------------------------------------ */

export interface ActivityFiltersProps {
  filter: ActivitiesFilter;
  onFilterChange: (patch: Partial<ActivitiesFilter>) => void;
  onReset: () => void;
  /** Total results count — shown in the bar */
  totalElements?: number;
  loading?: boolean;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

export function ActivityFilters({
  filter,
  onFilterChange,
  onReset,
  totalElements,
  loading,
  viewMode,
  onViewModeChange,
}: ActivityFiltersProps) {
  const hasActiveFilters =
    !!filter.sport || !!filter.source || !!filter.from || !!filter.to;

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 10, 15, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* ── Filter controls ── */}
      <div className="px-4 lg:px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Icon label */}
            <span
              className="flex items-center gap-1.5 mr-1"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
              aria-hidden="true"
            >
              <SlidersHorizontal size={14} />
              Filters
            </span>

            {/* Sport selector */}
            <FilterSelect
              id="filter-sport"
              label="Filter by sport"
              value={filter.sport ?? ""}
              options={SPORTS}
              onChange={(v) =>
                onFilterChange({ sport: (v as Sport) || undefined, page: 0 })
              }
            />

            {/* Source selector */}
            <FilterSelect
              id="filter-source"
              label="Filter by source"
              value={filter.source ?? ""}
              options={SOURCES}
              onChange={(v) =>
                onFilterChange({
                  source: (v as ActivitySource) || undefined,
                  page: 0,
                })
              }
            />

            {/* Date range */}
            <div className="flex items-center gap-2">
              <DateInput
                id="filter-from"
                label="From date"
                value={filter.from ?? ""}
                onChange={(v) =>
                  onFilterChange({ from: v || undefined, page: 0 })
                }
              />
              <span
                style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
                aria-hidden="true"
              >
                to
              </span>
              <DateInput
                id="filter-to"
                label="To date"
                value={filter.to ?? ""}
                onChange={(v) =>
                  onFilterChange({ to: v || undefined, page: 0 })
                }
              />
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                aria-label="Clear all filters"
                leftIcon={<X size={13} />}
                className="hover:bg-[rgba(255,255,255,0.04)]"
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            {/* Results count */}
            {!loading && totalElements !== undefined && (
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
                aria-live="polite"
                aria-atomic="true"
              >
                {totalElements.toLocaleString()} activit
                {totalElements === 1 ? "y" : "ies"}
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

      {/* ── Active filter chips ── */}
      {hasActiveFilters && (
        <div
          className="px-4 lg:px-6 pb-3 flex flex-wrap gap-2"
          aria-label="Active filters"
        >
          {filter.sport && (
            <ActiveChip
              label={
                SPORTS.find((s) => s.value === filter.sport)?.label ??
                filter.sport
              }
              onRemove={() => onFilterChange({ sport: undefined, page: 0 })}
            />
          )}
          {filter.source && (
            <ActiveChip
              label={
                SOURCES.find((s) => s.value === filter.source)?.label ??
                filter.source
              }
              onRemove={() => onFilterChange({ source: undefined, page: 0 })}
            />
          )}
          {filter.from && (
            <ActiveChip
              label={`From ${filter.from}`}
              onRemove={() => onFilterChange({ from: undefined, page: 0 })}
            />
          )}
          {filter.to && (
            <ActiveChip
              label={`To ${filter.to}`}
              onRemove={() => onFilterChange({ to: undefined, page: 0 })}
            />
          )}
        </div>
      )}
    </div>
  );
}
