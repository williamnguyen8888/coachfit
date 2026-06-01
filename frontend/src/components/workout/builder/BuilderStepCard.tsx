"use client";

/**
 * BuilderStepCard — renders a single editable step inside the builder canvas.
 *
 * Leaf step: shows type badge, duration pill, target pill, edit/delete actions.
 * Repeat step: shows repeat count control + child steps in an indented sub-list.
 *
 * Edit callbacks open DurationEditor / TargetEditor via parent state.
 */

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Trash2,
  Clock,
  Target,
  Flame,
  Zap,
  Moon,
  Wind,
  Repeat2,
  Plus,
  Pencil,
  Minus,
  TrendingUp,
  Activity,
} from "lucide-react";
import type { BuilderLeafStep, BuilderRepeatStep, BuilderStep } from "@/lib/types/builder";
import type { Sport } from "@/lib/types/activity";
import { formatDuration } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                            */
/* ------------------------------------------------------------------ */

const STEP_META: Record<
  BuilderLeafStep["type"],
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  warmup: {
    label: "Warm-up",
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.12)",
    icon: <Flame size={13} />,
  },
  work: {
    label: "Work",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.12)",
    icon: <Zap size={13} />,
  },
  rest: {
    label: "Rest",
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
    icon: <Moon size={13} />,
  },
  cooldown: {
    label: "Cool-down",
    color: "#818CF8",
    bg: "rgba(129,140,248,0.12)",
    icon: <Wind size={13} />,
  },
  ramp: {
    label: "Ramp",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    icon: <TrendingUp size={13} />,
  },
  free: {
    label: "Free",
    color: "#A3A3A3",
    bg: "rgba(163,163,163,0.12)",
    icon: <Activity size={13} />,
  },
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

function targetLabel(target?: BuilderLeafStep["target"]): string {
  if (!target || target.type === "open" || target.type === "none") return "Open";
  switch (target.type) {
    case "power_zone":
      return target.zone != null ? ZONE_NAMES[target.zone] ?? `Z${target.zone}` : "Power zone";
    case "power_pct":
      if (target.min != null && target.max != null)
        return `${Math.round(target.min * 100)}–${Math.round(target.max * 100)}% threshold`;
      return "% threshold";
    case "power_watts":
      if (target.min != null && target.max != null) return `${target.min}–${target.max} W`;
      return "Power watts";
    case "hr_zone":
      return target.zone != null ? `HR Z${target.zone}` : "HR zone";
    case "hr_pct":
      if (target.min != null && target.max != null)
        return `${Math.round(target.min * 100)}–${Math.round(target.max * 100)}% LTHR`;
      return "HR %";
    case "hr_bpm":
      if (target.min != null && target.max != null) return `${target.min}–${target.max} bpm`;
      return "HR bpm";
    case "pace_zone":
      return target.zone != null ? `Pace Z${target.zone}` : "Pace zone";
    case "pace":
      if (target.min != null && target.max != null) {
        const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
        return `${fmt(target.min)}–${fmt(target.max)} /km`;
      }
      return "Pace";
    case "speed":
      if (target.min != null && target.max != null) return `${target.min}–${target.max} km/h`;
      return "Speed";
    case "rpe":
      if (target.min != null && target.max != null) return `RPE ${target.min}–${target.max}`;
      return "RPE";
    case "cadence":
      if (target.min != null && target.max != null) return `${target.min}–${target.max} rpm`;
      return "Cadence";
    default:
      return "Open";
  }
}

function durationLabel(duration?: BuilderLeafStep["duration"]): string {
  if (!duration) return "—";
  if (duration.type === "lap_button") return "Lap btn";
  if (duration.value == null) return "—";
  if (duration.type === "time") return formatDuration(duration.value);
  return `${duration.value}m`;
}

/* ------------------------------------------------------------------ */
/*  Pill button                                                          */
/* ------------------------------------------------------------------ */

function Pill({
  icon,
  label,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-input)",
        color: "var(--text-secondary)",
        fontSize: "var(--text-xs)",
        cursor: "pointer",
        transition: "all 150ms ease-out",
        fontFamily: "var(--font-mono, monospace)",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
      }}
    >
      {icon}
      {label}
      <Pencil size={9} style={{ opacity: 0.5 }} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  LeafStepCard                                                         */
/* ------------------------------------------------------------------ */

interface LeafCardProps {
  step: BuilderLeafStep;
  onEditDuration: () => void;
  onEditTarget: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

function LeafStepCard({
  step,
  onEditDuration,
  onEditTarget,
  onDelete,
  dragHandleProps,
  isDragging,
}: LeafCardProps) {
  const meta = STEP_META[step.type];
  const dur = durationLabel(step.duration);
  const tgt = targetLabel(step.target);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderLeft: `3px solid ${meta.color}`,
        opacity: isDragging ? 0.4 : 1,
        transition: "box-shadow 150ms, opacity 150ms",
        boxShadow: isDragging ? "none" : "var(--shadow-sm)",
      }}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        aria-label="Drag to reorder"
        style={{
          display: "flex",
          alignItems: "center",
          color: "var(--text-muted)",
          cursor: "grab",
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        <GripVertical size={15} />
      </div>

      {/* Type badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 8px",
          borderRadius: "var(--radius-full)",
          background: meta.bg,
          color: meta.color,
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {meta.icon}
        {meta.label}
      </div>

      {/* Pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flex: 1 }}>
        <Pill
          icon={<Clock size={11} />}
          label={dur}
          onClick={onEditDuration}
          title="Edit duration"
        />
        <Pill
          icon={<Target size={11} />}
          label={tgt}
          onClick={onEditTarget}
          title="Edit target"
        />
      </div>

      {/* Delete */}
      <button
        onClick={onDelete}
        aria-label="Delete step"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          display: "flex",
          padding: 4,
          borderRadius: "var(--radius-sm)",
          flexShrink: 0,
          transition: "color 150ms",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  RepeatStepCard                                                       */
/* ------------------------------------------------------------------ */

interface RepeatCardProps {
  step: BuilderRepeatStep;
  sport: Sport;
  onCountChange: (n: number) => void;
  onUpdateChild: (childUid: string, patch: Partial<BuilderLeafStep>) => void;
  onDeleteChild: (childUid: string) => void;
  onAddChild: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  onEditChildDuration: (childUid: string) => void;
  onEditChildTarget: (childUid: string) => void;
}

function RepeatStepCard({
  step,
  onCountChange,
  onDelete,
  onDeleteChild,
  onAddChild,
  dragHandleProps,
  isDragging,
  onEditChildDuration,
  onEditChildTarget,
}: RepeatCardProps) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
        overflow: "hidden",
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragging ? "none" : "var(--shadow-sm)",
      }}
    >
      {/* Repeat header bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "var(--bg-elevated)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          aria-label="Drag repeat block to reorder"
          style={{ color: "var(--text-muted)", cursor: "grab", display: "flex", flexShrink: 0 }}
        >
          <GripVertical size={15} />
        </div>

        {/* Repeat icon + label */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 8px",
            borderRadius: "var(--radius-full)",
            background: "rgba(192,132,252,0.12)",
            color: "#C084FC",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
          }}
        >
          <Repeat2 size={13} />
          Repeat
        </div>

        {/* Count stepper */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
          <button
            onClick={() => onCountChange(Math.max(1, (step.count ?? 1) - 1))}
            aria-label="Decrease repeat count"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", borderRadius: 4, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <Minus size={12} />
          </button>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--text-primary)", minWidth: 24, textAlign: "center", fontFamily: "var(--font-mono, monospace)" }}>
            ×{step.count ?? 1}
          </span>
          <button
            onClick={() => onCountChange(Math.min(99, (step.count ?? 1) + 1))}
            aria-label="Increase repeat count"
            style={{ background: "var(--bg-input)", border: "1px solid var(--border-default)", borderRadius: 4, width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-secondary)" }}
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Delete repeat block */}
        <button
          onClick={onDelete}
          aria-label="Delete repeat block"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", padding: 4, borderRadius: "var(--radius-sm)", transition: "color 150ms" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)")}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Child steps */}
      <div style={{ padding: "8px 12px 8px 28px", display: "flex", flexDirection: "column", gap: 6 }}>
        {step.steps.map((child) => (
          <LeafStepCard
            key={child.uid}
            step={child}
            onEditDuration={() => onEditChildDuration(child.uid)}
            onEditTarget={() => onEditChildTarget(child.uid)}
            onDelete={() => onDeleteChild(child.uid)}
          />
        ))}

        {/* Add child step */}
        {step.steps.length < 10 && (
          <button
            onClick={onAddChild}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px dashed var(--border-default)",
              background: "transparent",
              color: "var(--text-muted)",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-accent)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            <Plus size={12} />
            Add step to repeat
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  BuilderStepCard (sortable wrapper)                                   */
/* ------------------------------------------------------------------ */

export interface BuilderStepCardProps {
  step: BuilderStep;
  sport: Sport;
  onDelete: (uid: string) => void;
  onUpdateLeaf: (uid: string, patch: Partial<BuilderLeafStep>) => void;
  onUpdateRepeat: (uid: string, patch: Partial<BuilderRepeatStep>) => void;
  onDeleteChild: (parentUid: string, childUid: string) => void;
  onAddChild: (parentUid: string) => void;
  onEditDuration: (uid: string) => void;
  onEditTarget: (uid: string) => void;
  onEditChildDuration: (parentUid: string, childUid: string) => void;
  onEditChildTarget: (parentUid: string, childUid: string) => void;
}

export function BuilderStepCard({
  step,
  sport,
  onDelete,
  onUpdateRepeat,
  onDeleteChild,
  onAddChild,
  onEditDuration,
  onEditTarget,
  onEditChildDuration,
  onEditChildTarget,
}: BuilderStepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.uid,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragHandleProps = { ...attributes, ...listeners };

  if (step.type === "repeat") {
    return (
      <div ref={setNodeRef} style={style}>
        <RepeatStepCard
          step={step}
          sport={sport}
          onCountChange={(n) => onUpdateRepeat(step.uid, { count: n })}
          onUpdateChild={() => {}} // handled by onEditChild* callbacks
          onDeleteChild={(childUid) => onDeleteChild(step.uid, childUid)}
          onAddChild={() => onAddChild(step.uid)}
          onDelete={() => onDelete(step.uid)}
          dragHandleProps={dragHandleProps}
          isDragging={isDragging}
          onEditChildDuration={(childUid) => onEditChildDuration(step.uid, childUid)}
          onEditChildTarget={(childUid) => onEditChildTarget(step.uid, childUid)}
        />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <LeafStepCard
        step={step as BuilderLeafStep}
        onEditDuration={() => onEditDuration(step.uid)}
        onEditTarget={() => onEditTarget(step.uid)}
        onDelete={() => onDelete(step.uid)}
        dragHandleProps={dragHandleProps}
        isDragging={isDragging}
      />
    </div>
  );
}
