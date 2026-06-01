"use client";

/**
 * WorkoutStepList — renders a structured workout step tree.
 *
 * Shows warmup / work / rest / cooldown / repeat steps with
 * zone/target labels and duration. Repeat groups are visually nested.
 *
 * No visual builder — read-only display for the detail page.
 */

import * as React from "react";
import { Clock, Repeat, Target } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { WorkoutStep, StepType } from "@/lib/types/workout";

/* ------------------------------------------------------------------ */
/*  Step type → display                                                  */
/* ------------------------------------------------------------------ */

const STEP_TYPE_LABEL: Record<StepType, string> = {
  warmup: "Warm-up",
  work: "Work",
  rest: "Rest",
  cooldown: "Cool-down",
  ramp: "Ramp",
  free: "Free",
  repeat: "Repeat",
  other: "Step",
};

const STEP_TYPE_COLOR: Record<StepType, string> = {
  warmup: "#60A5FA",   // zone 1 – light blue
  work: "#FB923C",     // zone 4 – orange
  rest: "#34D399",     // zone 2 – green
  cooldown: "#60A5FA", // zone 1 – light blue
  ramp: "#F59E0B",
  free: "var(--text-muted)",
  repeat: "var(--text-muted)",
  other: "var(--text-muted)",
};

/* ------------------------------------------------------------------ */
/*  Target label                                                         */
/* ------------------------------------------------------------------ */

const ZONE_NAMES: Record<number, string> = {
  1: "Z1 Recovery",
  2: "Z2 Endurance",
  3: "Z3 Tempo",
  4: "Z4 Threshold",
  5: "Z5 VO₂max",
  6: "Z6 Anaerobic",
  7: "Z7 Neuro",
};

function targetLabel(target?: WorkoutStep["target"]): string | null {
  if (!target || target.type === "none" || target.type === "open") return null;

  switch (target.type) {
    case "power_zone":
      return target.zone != null ? ZONE_NAMES[target.zone] ?? `Zone ${target.zone}` : "Power zone";
    case "power_pct":
      if (target.min != null && target.max != null) {
        return `${Math.round(target.min * 100)}–${Math.round(target.max * 100)}% threshold`;
      }
      return "% threshold";
    case "power_watts":
      if (target.min != null && target.max != null) {
        return `${target.min}–${target.max} W`;
      }
      return "Power watts";
    case "hr_zone":
      return target.zone != null ? `HR Zone ${target.zone}` : "HR zone";
    case "hr_pct":
      if (target.min != null && target.max != null) {
        return `${Math.round(target.min * 100)}–${Math.round(target.max * 100)}% LTHR`;
      }
      return "HR %";
    case "hr_bpm":
      if (target.min != null && target.max != null) {
        return `${target.min}–${target.max} bpm`;
      }
      return "HR bpm";
    case "pace_zone":
      return target.zone != null ? `Pace Zone ${target.zone}` : "Pace zone";
    case "pace":
      if (target.min != null && target.max != null) {
        const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
        return `${fmt(target.min)}–${fmt(target.max)} /km`;
      }
      return target.value != null ? `${target.value} sec/km` : "Pace";
    case "speed":
      if (target.min != null && target.max != null) {
        return `${target.min}–${target.max} km/h`;
      }
      return "Speed";
    case "rpe":
      if (target.min != null && target.max != null) {
        return `RPE ${target.min}–${target.max}`;
      }
      return "RPE";
    case "cadence":
      if (target.min != null && target.max != null) {
        return `${target.min}–${target.max} rpm`;
      }
      return target.value != null ? `${target.value} rpm` : "Cadence";
    default:
      return null;
  }
}

function durationLabel(duration?: WorkoutStep["duration"]): string | null {
  if (!duration) return null;
  if (duration.type === "lap_button") return "Lap button";
  if (duration.value == null) return null;
  if (duration.type === "time") return formatDuration(duration.value);
  if (duration.type === "distance") return `${(duration.value / 1000).toFixed(1)} km`;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Single step row                                                      */
/* ------------------------------------------------------------------ */

interface StepRowProps {
  step: WorkoutStep;
  depth?: number;
  index: number;
}

function StepRow({ step, depth = 0, index }: StepRowProps) {
  const color = STEP_TYPE_COLOR[step.type];
  const label = STEP_TYPE_LABEL[step.type];
  const dur = durationLabel(step.duration);
  const tgt = targetLabel(step.target);

  if (step.type === "repeat" && step.steps) {
    return (
      <li>
        {/* Repeat header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            marginBottom: 4,
          }}
        >
          <Repeat size={13} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            Repeat × {step.count ?? "?"}
          </span>
        </div>

        {/* Nested steps */}
        <ol
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            paddingLeft: 16,
            borderLeft: "2px solid var(--border-default)",
            marginLeft: 16,
            marginBottom: 4,
          }}
          aria-label={`Repeat group ${index + 1}`}
        >
          {step.steps.map((sub, subIdx) => (
            <StepRow key={subIdx} step={sub} depth={depth + 1} index={subIdx} />
          ))}
        </ol>
      </li>
    );
  }

  return (
    <li>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderRadius: "var(--radius-sm)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderLeft: `3px solid ${color}`,
        }}
      >
        {/* Step type dot */}
        <div
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />

        {/* Step type */}
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color,
            minWidth: 80,
            flexShrink: 0,
          }}
        >
          {label}
        </span>

        {/* Duration */}
        {dur && (
          <div className="flex items-center gap-1">
            <Clock size={12} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
            <span
              className="tabular-nums"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-primary)",
              }}
            >
              {dur}
            </span>
          </div>
        )}

        {/* Target */}
        {tgt && (
          <div className="flex items-center gap-1 ml-auto">
            <Target size={12} aria-hidden="true" style={{ color: "var(--text-muted)" }} />
            <span
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--text-secondary)",
              }}
            >
              {tgt}
            </span>
          </div>
        )}

        {/* Description */}
        {step.description && (
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              marginLeft: "auto",
              textAlign: "right",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {step.description}
          </span>
        )}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  WorkoutStepList                                                      */
/* ------------------------------------------------------------------ */

export interface WorkoutStepListProps {
  steps: WorkoutStep[];
}

export function WorkoutStepList({ steps }: WorkoutStepListProps) {
  if (steps.length === 0) {
    return (
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-muted)",
          textAlign: "center",
          padding: "24px 0",
        }}
      >
        No steps defined for this workout.
      </p>
    );
  }

  return (
    <ol
      className="flex flex-col gap-2"
      aria-label="Workout steps"
    >
      {steps.map((step, idx) => (
        <StepRow key={idx} step={step} index={idx} />
      ))}
    </ol>
  );
}
