"use client";

/**
 * BuilderHeader — top section of the workout builder.
 *
 * Contains:
 *   - Workout name input (required)
 *   - Sport selector (horizontal scroll row)
 *   - Description textarea (optional, collapsed by default)
 *   - Three action buttons in the top bar: Save · Schedule · Export FIT
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
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Sport options                                                         */
/* ------------------------------------------------------------------ */

const SPORT_OPTIONS: { value: Sport; label: string; icon: React.ReactNode }[] = [
  { value: "cycling",  label: "Cycling",  icon: <Bike size={14} /> },
  { value: "running",  label: "Running",  icon: <PersonStanding size={14} /> },
  { value: "swimming", label: "Swimming", icon: <Waves size={14} /> },
  { value: "strength", label: "Strength", icon: <Dumbbell size={14} /> },
  { value: "other",    label: "Other",    icon: <Activity size={14} /> },
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
  const [descOpen, setDescOpen] = React.useState(!!description);

  // When description already exists (edit mode), keep it open
  React.useEffect(() => {
    if (description) setDescOpen(true);
  }, [description]);

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {/* ── Action bar (top strip) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
        }}
      >
        <Button
          id="builder-save-btn"
          variant="primary"
          size="sm"
          loading={saving}
          leftIcon={saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          onClick={onSave}
          aria-label="Save workout"
        >
          {savedWorkoutId ? "Save Changes" : "Save Workout"}
        </Button>

        <Button
          id="builder-schedule-btn"
          variant="secondary"
          size="sm"
          leftIcon={<CalendarDays size={13} />}
          onClick={onSchedule}
          disabled={!savedWorkoutId}
          title={!savedWorkoutId ? "Save the workout first" : "Schedule to calendar"}
          aria-label="Schedule to calendar"
        >
          Schedule
        </Button>

        <Button
          id="builder-export-btn"
          variant="secondary"
          size="sm"
          loading={exporting}
          leftIcon={exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          onClick={onExportFit}
          disabled={!savedWorkoutId}
          title={!savedWorkoutId ? "Save the workout first" : "Export as .FIT file"}
          aria-label="Export as FIT file"
        >
          Export FIT
        </Button>
      </div>

      {/* ── Name + Sport ── */}
      <div style={{ padding: "16px 16px 0" }}>
        {/* Name input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
          <label
            htmlFor="workout-name"
            style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Workout Name
          </label>
          <input
            id="workout-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Tempo Intervals"
            maxLength={120}
            style={{
              height: 42,
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${nameError ? "var(--color-danger)" : "var(--border-default)"}`,
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              padding: "0 12px",
              fontSize: "var(--text-base)",
              fontWeight: 500,
              outline: "none",
              transition: "border-color 150ms",
              width: "100%",
            }}
            onFocus={(e) => {
              if (!nameError) e.currentTarget.style.borderColor = "var(--color-accent)";
            }}
            onBlur={(e) => {
              if (!nameError) e.currentTarget.style.borderColor = "var(--border-default)";
            }}
          />
          {nameError && (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)", margin: 0 }} role="alert">
              {nameError}
            </p>
          )}
        </div>

        {/* Sport — horizontal scrollable row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          <span
            id="workout-sport-label"
            style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Activity
          </span>
          <div
            role="radiogroup"
            aria-labelledby="workout-sport-label"
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 4,
              // hide scrollbar but keep functionality
              scrollbarWidth: "none",
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
                    height: 36,
                    padding: "0 14px",
                    flexShrink: 0,
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${active ? "var(--color-accent)" : "var(--border-default)"}`,
                    background: active ? "var(--color-accent-12)" : "var(--bg-input)",
                    color: active ? "var(--color-accent)" : "var(--text-secondary)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "var(--text-sm)",
                    fontWeight: active ? 600 : 500,
                    cursor: active ? "default" : "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 150ms ease-out",
                  }}
                >
                  {option.icon}
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description — collapsible */}
        {!descOpen ? (
          <button
            type="button"
            onClick={() => setDescOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
              padding: "0 0 16px",
              transition: "color 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <Plus size={13} />
            Add description
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 16 }}>
            <label
              htmlFor="workout-description"
              style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}
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
        )}
      </div>
    </div>
  );
}
