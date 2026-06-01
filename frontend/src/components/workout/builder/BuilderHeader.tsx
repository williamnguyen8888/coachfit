"use client";

/**
 * BuilderHeader — top section of the workout builder.
 *
 * Contains:
 *   - Workout name input (required)
 *   - Sport selector
 *   - Description textarea (optional)
 *   - Three action buttons: Save · Schedule · Export FIT
 *
 * Schedule and Export FIT require an existing saved workout ID.
 * Save works in both create (POST) and edit (PUT) modes.
 */

import * as React from "react";
import {
  Save,
  CalendarDays,
  Download,
  Bike,
  PersonStanding,
  Waves,
  Dumbbell,
  Activity,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Sport options                                                         */
/* ------------------------------------------------------------------ */

const SPORT_OPTIONS: { value: Sport; label: string; icon: React.ReactNode }[] = [
  { value: "cycling", label: "Cycling", icon: <Bike size={14} /> },
  { value: "running", label: "Running", icon: <PersonStanding size={14} /> },
  { value: "swimming", label: "Swimming", icon: <Waves size={14} /> },
  { value: "strength", label: "Strength", icon: <Dumbbell size={14} /> },
  { value: "other", label: "Other", icon: <Activity size={14} /> },
];

/* ------------------------------------------------------------------ */
/*  Props                                                                */
/* ------------------------------------------------------------------ */

interface BuilderHeaderProps {
  name: string;
  sport: Sport;
  description: string;
  onNameChange: (v: string) => void;
  onSportChange: (v: Sport) => void;
  onDescriptionChange: (v: string) => void;
  /** undefined = no saved workout yet */
  savedWorkoutId: string | undefined;
  onSave: () => void;
  onSchedule: () => void;
  onExportFit: () => void;
  saving: boolean;
  exporting: boolean;
  nameError?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function BuilderHeader({
  name,
  sport,
  description,
  onNameChange,
  onSportChange,
  onDescriptionChange,
  savedWorkoutId,
  onSave,
  onSchedule,
  onExportFit,
  saving,
  exporting,
  nameError,
}: BuilderHeaderProps) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* Row 1: Name + Sport */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Name */}
        <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            htmlFor="workout-name"
            style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
          >
            Workout Name *
          </label>
          <input
            id="workout-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Tempo Intervals"
            maxLength={120}
            style={{
              height: 40,
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${nameError ? "var(--color-danger)" : "var(--border-default)"}`,
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              padding: "0 12px",
              fontSize: "var(--text-base)",
              outline: "none",
              transition: "border-color 150ms",
            }}
          />
          {nameError && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)", margin: 0 }} role="alert">
              {nameError}
            </p>
          )}
        </div>

        {/* Sport */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 300, flex: "1 1 320px" }}>
          <label
            id="workout-sport-label"
            style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
          >
            Activity
          </label>
          <div
            role="radiogroup"
            aria-labelledby="workout-sport-label"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
              gap: 6,
            }}
          >
            {SPORT_OPTIONS.map((option) => {
              const active = sport === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSportChange(option.value)}
                  style={{
                    height: 38,
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--border-default)"}`,
                    background: active ? "var(--color-accent-12)" : "var(--bg-input)",
                    color: active ? "var(--color-accent)" : "var(--text-secondary)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    fontSize: "var(--text-sm)",
                    fontWeight: active ? 600 : 500,
                    cursor: active ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 2: Description */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label
          htmlFor="workout-description"
          style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
        >
          Description
        </label>
        <textarea
          id="workout-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe this workout…"
          rows={2}
          maxLength={500}
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            padding: "8px 12px",
            fontSize: "var(--text-sm)",
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            lineHeight: 1.5,
            transition: "border-color 150ms",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
        />
      </div>

      {/* Row 3: Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          paddingTop: 4,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {/* Save */}
        <Button
          id="builder-save-btn"
          variant="primary"
          size="md"
          loading={saving}
          leftIcon={saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          onClick={onSave}
          aria-label="Save workout"
        >
          {savedWorkoutId ? "Save Changes" : "Save Workout"}
        </Button>

        {/* Schedule */}
        <Button
          id="builder-schedule-btn"
          variant="secondary"
          size="md"
          leftIcon={<CalendarDays size={15} />}
          onClick={onSchedule}
          disabled={!savedWorkoutId}
          title={!savedWorkoutId ? "Save the workout first" : "Schedule to calendar"}
          aria-label="Schedule to calendar"
        >
          Schedule
        </Button>

        {/* Export FIT */}
        <Button
          id="builder-export-btn"
          variant="secondary"
          size="md"
          loading={exporting}
          leftIcon={exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          onClick={onExportFit}
          disabled={!savedWorkoutId}
          title={!savedWorkoutId ? "Save the workout first" : "Export as .FIT file"}
          aria-label="Export as FIT file"
        >
          Export FIT
        </Button>
      </div>
    </div>
  );
}
