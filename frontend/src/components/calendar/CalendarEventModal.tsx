"use client";

// src/components/calendar/CalendarEventModal.tsx
// Modal/sheet for creating or editing calendar events.
// Supports: workout scheduling, rest days, and free-text events.

import { useState, useEffect, useCallback } from "react";
import type { CalendarEvent, CreateCalendarPayload, UpdateCalendarPayload } from "@/lib/types/calendar";
import type { WorkoutSummary, WorkoutDetail, WorkoutStep } from "@/lib/types/workout";
import { workoutsService } from "@/lib/services/workouts";
import { calendarService } from "@/lib/services/calendar";
import { useCalendarStore } from "@/stores/calendar.store";
import { InteractiveWorkoutChart } from "@/components/workout/InteractiveWorkoutChart";
import { getSportHex, getEstimatedLoad } from "./calendarUtils";


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

const SPORT_ICONS: Record<string, string> = {
  cycling: "🚴",
  running: "🏃",
  swimming: "🏊",
  strength: "💪",
  other: "🏋️",
};

// ─── Overlay ──────────────────────────────────────────────────────────────────

// ─── Overlay ──────────────────────────────────────────────────────────────────

interface OverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: number | string;
}

function Overlay({ children, onClose, maxWidth = 480 }: OverlayProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />
      {/* Dialog Body */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: maxWidth,
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          animation: "scaleIn 0.2s cubic-bezier(0.4,0,0.2,1)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Extra Helpers for Workout Details ───────────────────────────────────────

const INTENSITY_FACTOR: Record<string, number> = {
  cycling: 0.8,
  running: 1.0,
  swimming: 0.9,
  strength: 0.6,
  other: 0.7,
};

const ZONE_COLORS: Record<number, string> = {
  1: "#60A5FA",
  2: "#34D399",
  3: "#FBBF24",
  4: "#FB923C",
  5: "#F87171",
  6: "#C084FC",
  7: "#F472B6",
};

function formatZoneDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  
  if (h > 0) {
    return `${h}h${m > 0 ? `${m}m` : ""}${s > 0 ? `${s}s` : ""}`;
  }
  if (m > 0) {
    return `${m}m${s > 0 ? `${s}s` : ""}`;
  }
  return `${s}s`;
}

function calculateWorkoutZoneDurations(steps: WorkoutStep[]): {
  zones: Record<number, number>;
  totalSeconds: number;
} {
  const zones: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  let totalSeconds = 0;

  function processStep(step: WorkoutStep, multiplier = 1) {
    if (step.type === "repeat" && step.steps) {
      const count = step.count ?? 1;
      for (const subStep of step.steps) {
        processStep(subStep, multiplier * count);
      }
    } else {
      const dur = step.duration?.value ?? 0;
      if (dur > 0) {
        const stepSec = dur * multiplier;
        totalSeconds += stepSec;

        let z = 2; // Default to Z2
        if (step.type === "warmup" || step.type === "cooldown" || step.type === "rest") {
          z = 1;
        }

        if (step.target) {
          if (step.target.type === "power_zone" || step.target.type === "hr_zone") {
            z = step.target.zone ?? z;
          } else if (step.target.type === "power_pct") {
            const pct = ((step.target.min ?? 0.5) + (step.target.max ?? 0.8)) / 2;
            if (pct < 0.55) z = 1;
            else if (pct < 0.75) z = 2;
            else if (pct < 0.90) z = 3;
            else if (pct < 1.05) z = 4;
            else if (pct < 1.20) z = 5;
            else if (pct < 1.50) z = 6;
            else z = 7;
          } else if (step.target.type === "pace") {
            if (step.target.min != null && step.target.max != null) {
              const mid = (step.target.min + step.target.max) / 2;
              if (mid < 0.70) z = 1;
              else if (mid < 0.85) z = 2;
              else if (mid < 0.95) z = 3;
              else if (mid < 1.05) z = 4;
              else if (mid < 1.20) z = 5;
              else z = 6;
            }
          }
        }
        
        z = Math.max(1, Math.min(7, z));
        zones[z] += stepSec;
      }
    }
  }

  for (const step of steps) {
    processStep(step);
  }

  return { zones, totalSeconds };
}



function calculateWorkoutLoad(durationSeconds: number, sport: string): number {
  const factor = INTENSITY_FACTOR[sport] ?? 0.7;
  return Math.round((durationSeconds / 60) * factor);
}

function calculateWorkoutDistance(steps: WorkoutStep[], sport: string): number {
  let totalMeters = 0;
  let hasDistanceStep = false;
  
  function process(step: WorkoutStep, mult = 1) {
    if (step.type === "repeat" && step.steps) {
      const count = step.count ?? 1;
      for (const sub of step.steps) {
        process(sub, mult * count);
      }
    } else {
      if (step.duration?.type === "distance" && step.duration.value != null) {
        totalMeters += step.duration.value * mult;
        hasDistanceStep = true;
      }
    }
  }
  
  for (const step of steps) {
    process(step);
  }
  
  if (hasDistanceStep) return totalMeters;
  
  // Heuristic
  const duration = steps.reduce((sum, s) => {
    if (s.type === "repeat" && s.steps) {
      return sum + (s.steps.reduce((a, sub) => a + (sub.duration?.value ?? 0), 0) * (s.count ?? 1));
    }
    return sum + (s.duration?.value ?? 0);
  }, 0);
  
  if (duration > 0) {
    if (sport === "swimming") return (duration / 2400) * 1400;
    if (sport === "cycling") return (duration / 3600) * 28000;
    if (sport === "running") return (duration / 2700) * 7500;
  }
  return 0;
}

function calculateWorkoutIntensity(steps: WorkoutStep[], sport: string): number {
  let totalIntensityWeighted = 0;
  let totalDuration = 0;
  
  function process(step: WorkoutStep, mult = 1) {
    if (step.type === "repeat" && step.steps) {
      const count = step.count ?? 1;
      for (const sub of step.steps) {
        process(sub, mult * count);
      }
    } else {
      const dur = step.duration?.value ?? 0;
      if (dur > 0) {
        const stepSec = dur * mult;
        totalDuration += stepSec;
        
        let intensity = 0.7;
        if (step.target) {
          if (step.target.type === "power_zone" || step.target.type === "hr_zone") {
            const z = step.target.zone ?? 2;
            intensity = z / 5.5;
          } else if (step.target.type === "power_pct") {
            intensity = ((step.target.min ?? 0.5) + (step.target.max ?? 0.8)) / 2;
          } else if (step.target.type === "pace") {
            if (step.target.min != null && step.target.max != null) {
              intensity = (step.target.min + step.target.max) / 2;
            }
          }
        }
        totalIntensityWeighted += intensity * stepSec;
      }
    }
  }
  
  for (const step of steps) {
    process(step);
  }
  
  if (totalDuration > 0) {
    return Math.round((totalIntensityWeighted / totalDuration) * 100);
  }
  
  const factor = INTENSITY_FACTOR[sport] ?? 0.7;
  return Math.round(factor * 100);
}

function formatStepToReadableText(step: WorkoutStep, sport: string): string {
  let desc = step.description || "";
  
  if (!desc) {
    if (step.type === "warmup") desc = "Warm Up";
    else if (step.type === "cooldown") desc = "Cool Down";
    else if (step.type === "rest") desc = "Recovery";
    else if (step.type === "work") desc = "Work Interval";
  }

  let durStr = "";
  if (step.duration) {
    if (step.duration.type === "time" && step.duration.value != null) {
      const val = step.duration.value;
      if (val >= 60 && val % 60 === 0) {
        durStr = `${val / 60}m`;
      } else if (val >= 60) {
        durStr = `${Math.floor(val / 60)}m${val % 60}s`;
      } else {
        durStr = `${val}s`;
      }
    } else if (step.duration.type === "distance" && step.duration.value != null) {
      const val = step.duration.value;
      if (sport === "swimming") {
        durStr = `${val}mtr`;
      } else if (val >= 1000) {
        durStr = `${(val / 1000).toFixed(1)}km`;
      } else {
        durStr = `${val}m`;
      }
    } else if (step.duration.type === "lap_button") {
      durStr = "Lap Button";
    }
  }

  let tgtStr = "";
  if (step.target) {
    if (step.target.type === "power_pct") {
      const min = step.target.min != null ? Math.round(step.target.min * 100) : null;
      const max = step.target.max != null ? Math.round(step.target.max * 100) : null;
      const metricName = sport === "cycling" ? "FTP" : "Pace";
      if (min != null && max != null) {
        tgtStr = `${min}-${max}% ${metricName}`;
      } else if (min != null) {
        tgtStr = `${min}% ${metricName}`;
      }
    } else if (step.target.type === "power_zone") {
      tgtStr = `Z${step.target.zone ?? 2}`;
    } else if (step.target.type === "hr_zone") {
      tgtStr = `HR Z${step.target.zone ?? 2}`;
    } else if (step.target.type === "pace") {
      if (step.target.min != null && step.target.max != null) {
        const minPct = Math.round(step.target.min * 100);
        const maxPct = Math.round(step.target.max * 100);
        tgtStr = `${minPct}-${maxPct}% Pace`;
      } else if (step.target.value != null) {
        tgtStr = `${step.target.value} min/km`;
      } else {
        tgtStr = "Pace";
      }
    } else if (step.target.type === "cadence") {
      tgtStr = step.target.value != null ? `${step.target.value} rpm` : "Cadence";
    }
  }

  const parts = [];
  if (desc) parts.push(desc);
  if (durStr) parts.push(durStr);
  if (tgtStr) parts.push(tgtStr);

  let text = parts.join(" ");
  if (step.type === "rest") {
    text += " intensity=rest";
  }
  return text;
}

function renderWorkoutStepInstructions(step: WorkoutStep, sport: string, index: number): React.ReactNode {
  if (step.type === "repeat" && step.steps) {
    return (
      <div key={index} style={{ marginBottom: "12px" }}>
        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px", marginBottom: "4px" }}>
          {step.count}x
        </div>
        <div style={{ paddingLeft: "12px", borderLeft: "2px solid var(--border-default)" }}>
          {step.steps.map((subStep, subIdx) => (
            <div
              key={subIdx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>•</span>
              <span>{formatStepToReadableText(subStep, sport)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      key={index}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "6px",
        fontSize: "13px",
        color: "var(--text-secondary)",
        lineHeight: "1.5",
        marginBottom: "6px",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>•</span>
      <span>{formatStepToReadableText(step, sport)}</span>
    </div>
  );
}


// ─── Workout picker ───────────────────────────────────────────────────────────

interface WorkoutPickerProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function WorkoutPicker({ selectedId, onSelect }: WorkoutPickerProps) {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    workoutsService
      .list({ size: 50, sort: "createdAt,desc" })
      .then((res) => setWorkouts(res.content))
      .catch(() => setWorkouts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = workouts.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <input
        type="text"
        placeholder="Search workouts…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          background: "var(--bg-input)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-2) var(--space-3)",
          color: "var(--text-primary)",
          fontSize: "var(--text-sm)",
          outline: "none",
          width: "100%",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border-default)";
        }}
      />
      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* None option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            background: selectedId === null ? "var(--color-accent-15)" : "transparent",
            border: selectedId === null ? "1px solid var(--color-accent)" : "1px solid transparent",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            textAlign: "left",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
          }}
        >
          <span>😴</span>
          <span>No workout (rest / note)</span>
        </button>

        {loading ? (
          <div style={{ padding: "var(--space-3)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            Loading workouts…
          </div>
        ) : (
          filtered.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onSelect(w.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: selectedId === w.id ? "var(--color-accent-15)" : "transparent",
                border: selectedId === w.id ? "1px solid var(--color-accent)" : "1px solid transparent",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span>{SPORT_ICONS[w.sport] ?? "🏋️"}</span>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ color: "var(--text-primary)", fontSize: "var(--text-sm)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {w.name}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-xs)" }}>
                  {w.sport}
                  {w.estimatedDuration ? ` · ${formatDuration(w.estimatedDuration)}` : ""}
                </div>
              </div>
              {selectedId === w.id && (
                <span style={{ color: "var(--color-accent)", fontSize: 14 }}>✓</span>
              )}
            </button>
          ))
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "var(--space-3)", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            No workouts found
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export interface CalendarEventModalProps {
  /** "create" opens an empty form, "edit" opens the form pre-filled with event data */
  mode: "create" | "edit";
  /** Pre-fill the date when creating */
  initialDate?: string;
  /** Event to edit (required when mode === "edit") */
  event?: CalendarEvent;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CalendarEventModal({
  mode,
  initialDate,
  event,
  onClose,
  onSuccess,
}: CalendarEventModalProps) {
  const { createEvent, updateEvent, deleteEvent, markComplete, markSkipped } =
    useCalendarStore();

  // Form and view state
  const [viewMode, setViewMode] = useState<"detail" | "edit">(
    mode === "edit" && event?.eventType === "workout" ? "detail" : "edit"
  );
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (viewMode === "detail" && event?.workout?.id) {
      setLoadingDetail(true);
      workoutsService
        .get(event.workout.id)
        .then((res) => setWorkoutDetail(res))
        .catch((err) => console.error("Failed to load workout details:", err))
        .finally(() => setLoadingDetail(false));
    }
  }, [viewMode, event]);

  // Form state
  const [date, setDate] = useState<string>(
    event?.date ?? initialDate ?? new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState<string>(event?.notes ?? "");
  const [title, setTitle] = useState<string>(
    // For non-workout events, allow custom title
    event?.eventType !== "workout" ? (event?.title ?? "") : "",
  );
  const [workoutId, setWorkoutId] = useState<string | null>(
    event?.workout?.id ?? null,
  );

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Garmin Training API sync state
  const [garminSyncing, setGarminSyncing]   = useState(false);
  const [garminRemoving, setGarminRemoving] = useState(false);
  const [garminError, setGarminError]       = useState<string | null>(null);
  const isSyncedToGarmin = Boolean(event?.garminWorkoutId);

  const handleGarminSync = useCallback(async () => {
    if (!event) return;
    setGarminSyncing(true);
    setGarminError(null);
    try {
      await calendarService.syncToGarmin(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setGarminError(err instanceof Error ? err.message : "Garmin sync failed");
    } finally {
      setGarminSyncing(false);
    }
  }, [event, onSuccess, onClose]);

  const handleGarminRemove = useCallback(async () => {
    if (!event) return;
    setGarminRemoving(true);
    setGarminError(null);
    try {
      await calendarService.removeFromGarmin(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setGarminError(err instanceof Error ? err.message : "Failed to remove from Garmin");
    } finally {
      setGarminRemoving(false);
    }
  }, [event, onSuccess, onClose]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        const payload: CreateCalendarPayload = {
          date,
          notes: notes || undefined,
        };
        if (workoutId) {
          payload.workoutId = workoutId;
          payload.eventType = "workout";
        } else {
          payload.eventType = title.toLowerCase().includes("rest") ? "rest" : "note";
          payload.title = title || "Rest Day";
        }
        await createEvent(payload);
      } else if (event) {
        const payload: UpdateCalendarPayload = {
          date,
          notes: notes || undefined,
          title: title || undefined,
        };
        await updateEvent(event.id, payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [mode, date, notes, title, workoutId, event, createEvent, updateEvent, onClose, onSuccess]);

  const handleDelete = useCallback(async () => {
    if (!event) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteEvent(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }, [event, deleteEvent, onClose, onSuccess]);

  const handleMarkComplete = useCallback(async () => {
    if (!event) return;
    try {
      await markComplete(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [event, markComplete, onClose, onSuccess]);

  const handleMarkSkipped = useCallback(async () => {
    if (!event) return;
    try {
      await markSkipped(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [event, markSkipped, onClose, onSuccess]);

  const isCreateMode = mode === "create";
  const canSubmit = isCreateMode ? (workoutId !== null || title.trim().length > 0) : true;

  if (viewMode === "detail" && event && event.eventType === "workout" && event.workout) {
    const sport = event.workout.sport ?? "other";
    const sportHex = getSportHex(sport);
    const dateLabel = new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    
    const steps = workoutDetail?.steps ?? [];
    
    const workoutDuration = workoutDetail?.estimatedDuration ?? event.workout.estimatedDuration ?? 0;
    const workoutDistance = workoutDetail ? calculateWorkoutDistance(steps, sport) : 0;
    const workoutLoad = workoutDetail ? calculateWorkoutLoad(workoutDuration, sport) : getEstimatedLoad(event);
    const workoutIntensity = workoutDetail ? calculateWorkoutIntensity(steps, sport) : Math.round((INTENSITY_FACTOR[sport] ?? 0.7) * 100);

    const { zones: zoneSecs, totalSeconds: totalZoneSecs } = calculateWorkoutZoneDurations(steps);
    
    const s1_sec = zoneSecs[1] + zoneSecs[2];
    const s2_sec = zoneSecs[3] + zoneSecs[4];
    const s3_sec = zoneSecs[5] + zoneSecs[6] + zoneSecs[7];
    const totalS = s1_sec + s2_sec + s3_sec;

    const s1_ratio = s1_sec / (totalS || 1);
    const s2_ratio = s2_sec / (totalS || 1);
    const s3_ratio = s3_sec / (totalS || 1);

    let tidModel = "Base";
    let polarizationIndex = 0.00;

    if (totalZoneSecs > 0) {
      if (s1_ratio > 0 && s2_ratio > 0 && s3_ratio > 0) {
        polarizationIndex = Math.log10(((s1_ratio * s3_ratio) / s2_ratio) * 100);
        if (isNaN(polarizationIndex) || !isFinite(polarizationIndex)) {
          polarizationIndex = 0;
        }
      }

      if (s2_ratio >= 0.22) {
        tidModel = "Threshold";
      } else if (s1_ratio >= 0.72 && s3_ratio >= 0.08 && s2_ratio < 0.16) {
        tidModel = "Polarized";
      } else if (s1_ratio >= 0.55 && s2_ratio >= 0.10) {
        tidModel = "Pyramidal";
      } else if (s1_ratio >= 0.85) {
        tidModel = "Base";
      } else {
        tidModel = "Pyramidal";
      }
    }

    const handleCopyText = () => {
      if (!workoutDetail) return;
      const lines: string[] = [];
      if (workoutDetail.sport === "swimming") {
        lines.push("pool length: 25m\n");
      }
      
      workoutDetail.steps.forEach((step) => {
        if (step.type === "repeat" && step.steps) {
          lines.push(`${step.count}x`);
          step.steps.forEach((sub) => {
            lines.push(`  • ${formatStepToReadableText(sub, workoutDetail.sport)}`);
          });
          lines.push("");
        } else {
          lines.push(`• ${formatStepToReadableText(step, workoutDetail.sport)}`);
        }
      });

      const fullText = lines.join("\n");
      navigator.clipboard.writeText(fullText)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy workout text:", err);
        });
    };

    const handleExportFit = async () => {
      if (!event.workout?.id) return;
      try {
        const res = await workoutsService.exportFit(event.workout.id);
        if (res && res.downloadUrl) {
          const a = document.createElement("a");
          a.href = res.downloadUrl;
          a.download = res.filename || "workout.fit";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error("Failed to export FIT file:", err);
      }
    };

    return (
      <Overlay onClose={onClose} maxWidth={680}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${sportHex.light}88 0%, ${sportHex.light}44 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${sportHex.primary}40`,
                fontSize: "24px",
              }}
            >
              <span>{SPORT_ICONS[sport] ?? "🏋️"}</span>
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: "1.3",
                }}
              >
                {event.title}
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {dateLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "24px",
              padding: "4px",
              lineHeight: "1",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            background: "var(--bg-surface)",
            padding: "12px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Duration</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutDuration > 0 ? formatDuration(workoutDuration) : "--"}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-subtle)", height: "32px", alignSelf: "center" }} />
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Distance</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutDistance > 0 ? (workoutDistance >= 1000 ? `${(workoutDistance / 1000).toFixed(1)} km` : `${Math.round(workoutDistance)} m`) : "--"}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-subtle)", height: "32px", alignSelf: "center" }} />
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Load</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutLoad}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-subtle)", height: "32px", alignSelf: "center" }} />
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Intensity</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutIntensity}%
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {loadingDetail ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0" }}>Loading steps...</div>
              ) : steps.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>No specific workout steps defined.</div>
              ) : (
                <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "16px", border: "1px solid var(--border-subtle)", maxHeight: "280px", overflowY: "auto" }}>
                  {sport === "swimming" && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", fontFamily: "var(--font-mono, monospace)" }}>
                      pool length: 25m
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {steps.map((step, idx) => renderWorkoutStepInstructions(step, sport, idx))}
                  </div>
                </div>
              )}

              {event.notes && (
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--bg-surface)",
                    borderLeft: `4px solid ${sportHex.primary}`,
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Athlete Notes</div>
                  {event.notes}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "16px", border: "1px solid var(--border-subtle)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                    Zones {tidModel}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
                    PI {polarizationIndex > 0 ? polarizationIndex.toFixed(2) : "0.00"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((zNum) => {
                    const sec = zoneSecs[zNum] || 0;
                    const pct = totalZoneSecs > 0 ? (sec / totalZoneSecs) * 100 : 0;
                    const color = ZONE_COLORS[zNum] ?? "#8B8B9E";

                    return (
                      <div key={zNum} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                        <span style={{ width: "20px", fontWeight: 600, color: "var(--text-muted)" }}>Z{zNum}</span>
                        <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, height: "8px", background: "var(--bg-input)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px" }} />
                        </div>
                        <span style={{ width: "50px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: sec > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {sec > 0 ? formatZoneDuration(sec) : "--"}
                        </span>
                        <span style={{ width: "40px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: pct > 0 ? "var(--text-secondary)" : "var(--text-muted)" }}>
                          {pct > 0 ? `${pct.toFixed(1)}%` : "0.0%"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {steps.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <InteractiveWorkoutChart steps={steps} sport={sport} />
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: "none",
                border: "none",
                cursor: deleting ? "not-allowed" : "pointer",
                color: "var(--color-danger)",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: deleting ? 0.5 : 1,
              }}
              title="Delete Workout Event"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              disabled={!workoutDetail}
              style={{
                background: "none",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: !workoutDetail ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: !workoutDetail ? 0.5 : 1,
              }}
            >
              <span>{copySuccess ? "COPIED" : "COPY"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleExportFit}
              disabled={!event.workout?.id}
              style={{
                background: "none",
                border: "none",
                cursor: !event.workout?.id ? "not-allowed" : "pointer",
                color: "var(--text-secondary)",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: !event.workout?.id ? 0.5 : 1,
              }}
              title="Download FIT file"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {event.status === "planned" && (
              <button
                type="button"
                onClick={handleMarkComplete}
                style={{
                  background: "var(--color-success-10)",
                  border: "1px solid var(--color-success-30)",
                  color: "var(--color-success)",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                MARK DONE
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode("edit")}
              style={{
                background: "var(--color-accent-10)",
                border: "1px solid var(--color-accent-30)",
                color: "var(--color-accent)",
                fontSize: "13px",
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
              }}
            >
              EDIT
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  return (
    <Overlay onClose={onClose} maxWidth={480}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {isCreateMode ? "Add to Calendar" : "Edit Event"}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {formatDateLabel(date)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "var(--bg-input)",
            border: "none",
            borderRadius: "var(--radius-full)",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        {/* Date picker */}
        <div>
          <label
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
          >
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-3)",
              color: "var(--text-primary)",
              fontSize: "var(--text-sm)",
              outline: "none",
              width: "100%",
              colorScheme: "dark",
            }}
          />
        </div>

        {/* Workout picker (create mode) */}
        {isCreateMode && (
          <div>
            <label
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
            >
              Workout
            </label>
            <WorkoutPicker selectedId={workoutId} onSelect={setWorkoutId} />
          </div>
        )}

        {/* Title (for non-workout events in create, or edit mode) */}
        {(!isCreateMode || workoutId === null) && (
          <div>
            <label
              style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
            >
              {isCreateMode ? "Label" : "Title"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isCreateMode ? "Rest Day, Race, Notes…" : "Event title"}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-2) var(--space-3)",
                color: "var(--text-primary)",
                fontSize: "var(--text-sm)",
                outline: "none",
                width: "100%",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label
            style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
          >
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Focus points, reminders…"
            rows={3}
            style={{
              background: "var(--bg-input)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "var(--space-2) var(--space-3)",
              color: "var(--text-primary)",
              fontSize: "var(--text-sm)",
              outline: "none",
              width: "100%",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
          />
        </div>

        {/* Edit mode quick actions */}
        {!isCreateMode && event && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* Status actions */}
            <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
              {event.status === "planned" && (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-success-10)",
                    border: "1px solid var(--color-success-30)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-success)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  ✓ Mark Complete
                </button>
              )}
              {(event.status === "planned" || event.status === "partial") && (
                <button
                  type="button"
                  onClick={handleMarkSkipped}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--color-danger-10)",
                    border: "1px solid var(--color-danger-30)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-danger)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  — Mark Skipped
                </button>
              )}
            </div>

            {/* Garmin Training sync — only for workout events */}
            {event.eventType === "workout" && event.workout && (
              <div
                style={{
                  padding: "var(--space-3)",
                  background: isSyncedToGarmin
                    ? "color-mix(in srgb, #009CDE 6%, var(--bg-elevated))"
                    : "var(--bg-elevated)",
                  border: `1px solid ${
                    isSyncedToGarmin
                      ? "color-mix(in srgb, #009CDE 30%, var(--border-subtle))"
                      : "var(--border-subtle)"
                  }`,
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                }}
              >
                {/* Garmin icon */}
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#009CDE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 14,
                }}>
                  ⌚
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                    Garmin Connect
                  </div>
                  <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>
                    {isSyncedToGarmin
                      ? `Synced${event.garminSyncedAt ? " · " + new Date(event.garminSyncedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}`
                      : "Push workout to your Garmin device"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                  {isSyncedToGarmin ? (
                    <>
                      <button
                        type="button"
                        onClick={handleGarminSync}
                        disabled={garminSyncing || garminRemoving}
                        title="Re-sync workout to Garmin"
                        style={{
                          padding: "4px 10px",
                          background: "color-mix(in srgb, #009CDE 12%, transparent)",
                          border: "1px solid color-mix(in srgb, #009CDE 40%, transparent)",
                          borderRadius: "var(--radius-sm)",
                          color: "#009CDE",
                          fontSize: "var(--text-xs)",
                          fontWeight: 600,
                          cursor: garminSyncing ? "not-allowed" : "pointer",
                          opacity: garminSyncing ? 0.6 : 1,
                        }}
                      >
                        {garminSyncing ? "Syncing…" : "↺ Re-sync"}
                      </button>
                      <button
                        type="button"
                        onClick={handleGarminRemove}
                        disabled={garminSyncing || garminRemoving}
                        title="Remove from Garmin calendar"
                        style={{
                          padding: "4px 10px",
                          background: "transparent",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-muted)",
                          fontSize: "var(--text-xs)",
                          fontWeight: 500,
                          cursor: garminRemoving ? "not-allowed" : "pointer",
                          opacity: garminRemoving ? 0.6 : 1,
                        }}
                      >
                        {garminRemoving ? "Removing…" : "Remove"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGarminSync}
                      disabled={garminSyncing}
                      id="garmin-sync-button"
                      style={{
                        padding: "4px 12px",
                        background: "#009CDE",
                        border: "none",
                        borderRadius: "var(--radius-sm)",
                        color: "white",
                        fontSize: "var(--text-xs)",
                        fontWeight: 600,
                        cursor: garminSyncing ? "not-allowed" : "pointer",
                        opacity: garminSyncing ? 0.7 : 1,
                      }}
                    >
                      {garminSyncing ? "Syncing…" : "⌚ Push to Garmin"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Garmin error */}
            {garminError && (
              <div
                style={{
                  padding: "var(--space-2) var(--space-3)",
                  background: "var(--color-danger-10)",
                  border: "1px solid var(--color-danger-30)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-danger)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {garminError}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--color-danger-10)",
              border: "1px solid var(--color-danger-30)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-danger)",
              fontSize: "var(--text-sm)",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-5)",
          borderTop: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        {/* Delete (edit mode only) */}
        {!isCreateMode && event && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: "var(--space-2) var(--space-3)",
              background: "transparent",
              border: "1px solid var(--color-danger-40)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-danger)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.5 : 1,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "var(--space-2) var(--space-4)",
            background: "var(--bg-input)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          style={{
            padding: "var(--space-2) var(--space-5)",
            background: submitting || !canSubmit ? "var(--color-accent-40)" : "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "white",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: submitting || !canSubmit ? "not-allowed" : "pointer",
            transition: "background var(--duration-micro) ease-out",
          }}
        >
          {submitting ? "Saving…" : isCreateMode ? "Add to Calendar" : "Save Changes"}
        </button>
      </div>
    </Overlay>
  );
}
