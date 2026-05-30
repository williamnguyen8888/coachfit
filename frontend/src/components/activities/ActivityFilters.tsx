"use client";

/**
 * ActivityFilters — filter bar for the activities list.
 *
 * Filters:
 *  - Sport (cycling | running | swimming | strength | other | all)
 *  - Source (strava | garmin | manual | upload | all)
 *  - Date range (from / to) — free-form date pickers
 *
 * Active filters also show an "X" clear chip so users can quickly remove them.
 */

import * as React from "react";
import { X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SportDot } from "./SportIcon";
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
              ? "rgba(139,92,246,0.12)"
              : "var(--bg-elevated)",
            border: `1px solid ${isActive ? "rgba(139,92,246,0.4)" : "var(--border-default)"}`,
            borderRadius: "var(--radius-sm)",
            color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: isActive ? 600 : 400,
            padding: "6px 32px 6px 10px",
            cursor: "pointer",
            minWidth: 130,
            transition: `all var(--duration-micro) ease-out`,
            outline: "none",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLSelectElement).style.borderColor =
              "var(--color-accent)";
            (e.currentTarget as HTMLSelectElement).style.boxShadow =
              "0 0 0 2px rgba(139,92,246,0.2)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLSelectElement).style.borderColor = isActive
              ? "rgba(139,92,246,0.4)"
              : "var(--border-default)";
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
            right: 8,
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
            ? "rgba(139,92,246,0.12)"
            : "var(--bg-elevated)",
          border: `1px solid ${isActive ? "rgba(139,92,246,0.4)" : "var(--border-default)"}`,
          borderRadius: "var(--radius-sm)",
          color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
          fontSize: "var(--text-sm)",
          fontWeight: isActive ? 600 : 400,
          padding: "6px 10px",
          cursor: "pointer",
          width: 140,
          outline: "none",
          transition: `all var(--duration-micro) ease-out`,
          colorScheme: "dark",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(139,92,246,0.2)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = isActive
            ? "rgba(139,92,246,0.4)"
            : "var(--border-default)";
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
        gap: 4,
        padding: "2px 8px 2px 8px",
        borderRadius: "var(--radius-full)",
        background: "rgba(139,92,246,0.15)",
        border: "1px solid rgba(139,92,246,0.3)",
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
        <X size={11} aria-hidden="true" />
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
}

export function ActivityFilters({
  filter,
  onFilterChange,
  onReset,
  totalElements,
  loading,
}: ActivityFiltersProps) {
  const hasActiveFilters =
    !!filter.sport || !!filter.source || !!filter.from || !!filter.to;

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-primary)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* ── Filter controls ── */}
      <div className="px-4 lg:px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
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
            →
          </span>
          <DateInput
            id="filter-to"
            label="To date"
            value={filter.to ?? ""}
            onChange={(v) =>
              onFilterChange({ to: v || undefined, page: 0 })
            }
          />

          {/* Reset */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              aria-label="Clear all filters"
              leftIcon={<X size={13} />}
            >
              Clear
            </Button>
          )}

          {/* Results count */}
          {!loading && totalElements !== undefined && (
            <span
              className="ml-auto"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {totalElements.toLocaleString()} activit
              {totalElements === 1 ? "y" : "ies"}
            </span>
          )}
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {hasActiveFilters && (
        <div
          className="px-4 lg:px-6 pb-2 flex flex-wrap gap-1.5"
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
