"use client";

// src/components/coach/AssignWorkoutModal.tsx
// Workout assignment modal — select workout → date → assign to one or many athletes.

import { useState, useEffect, useCallback } from "react";
import { X, Dumbbell, Calendar, Search, Users } from "lucide-react";
import { assignmentService } from "@/lib/services/coach";
import { useCoachStore } from "@/stores/coach.store";
import { api } from "@/lib/api";
import type { WorkoutSummary as Workout } from "@/lib/types/workout";

interface AssignWorkoutModalProps {
  /**
   * A single athlete ID (single-assign mode).
   * When bulkAssignAthleteIds in store is set, those take priority.
   */
  athleteId?: string;
}

export function AssignWorkoutModal({ athleteId }: AssignWorkoutModalProps) {
  const {
    assignModalOpen,
    closeAssignModal,
    bulkAssignAthleteIds,
    selectedAthleteId,
  } = useCoachStore();

  const targetAthleteId = athleteId ?? selectedAthleteId ?? "";

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutsLoading, setWorkoutsLoading] = useState(false);
  const [workoutSearch, setWorkoutSearch] = useState("");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const loadWorkouts = useCallback(async () => {
    setWorkoutsLoading(true);
    try {
      const res = await api.get<{ content: Workout[] }>("/workouts?size=50");
      setWorkouts(res.content ?? []);
    } catch {
      setWorkouts([]);
    } finally {
      setWorkoutsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (assignModalOpen) loadWorkouts();
  }, [assignModalOpen, loadWorkouts]);

  const filteredWorkouts = workouts.filter((w) =>
    w.name.toLowerCase().includes(workoutSearch.toLowerCase())
  );

  const isBulk = bulkAssignAthleteIds.length > 1;

  const handleAssign = async () => {
    if (!selectedWorkout) return;
    setSubmitting(true);
    setResult(null);
    try {
      if (isBulk) {
        await assignmentService.bulkAssign({
          athleteIds: bulkAssignAthleteIds,
          workoutId: selectedWorkout.id,
          date,
          notes: notes.trim() || undefined,
        });
      } else {
        await assignmentService.assign(targetAthleteId, {
          workoutId: selectedWorkout.id,
          date,
          notes: notes.trim() || undefined,
        });
      }
      setResult("success");
      setTimeout(() => {
        closeAssignModal();
        setResult(null);
        setSelectedWorkout(null);
        setNotes("");
      }, 1500);
    } catch {
      setResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignModalOpen) return null;

  const SPORT_COLORS: Record<string, string> = {
    cycling: "#3b82f6",
    running: "#22c55e",
    swimming: "#06b6d4",
    strength: "#f97316",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeAssignModal}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Assign workout"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101,
          width: "min(560px, calc(100vw - 32px))",
          maxHeight: "85vh",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInScale 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-5) var(--space-6)",
            borderBottom: "1px solid var(--border-subtle)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center gap-2">
            <Dumbbell size={18} style={{ color: "var(--color-accent)" }} />
            <h3
              style={{
                fontSize: "var(--text-xl)",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Assign Workout
            </h3>
            {isBulk && (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: "var(--color-accent)",
                  background: "var(--color-accent-8)",
                  border: "1px solid var(--color-accent-20)",
                  borderRadius: "var(--radius-full)",
                  padding: "2px 8px",
                }}
              >
                <Users size={11} />
                {bulkAssignAthleteIds.length} athletes
              </span>
            )}
          </div>

          <button
            onClick={closeAssignModal}
            aria-label="Close"
            style={{
              width: 32, height: 32,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
              background: "transparent",
              color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-5)",
            padding: "var(--space-6)",
          }}
        >
          {/* Step 1: Pick workout */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "var(--space-3)",
              }}
            >
              1. Select Workout
            </label>

            {/* Workout search */}
            <div
              className="flex items-center gap-2"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "0 var(--space-3)",
                height: 36,
                marginBottom: "var(--space-2)",
              }}
            >
              <Search size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search workouts…"
                value={workoutSearch}
                onChange={(e) => setWorkoutSearch(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                }}
              />
            </div>

            {/* Workout list */}
            <div
              style={{
                maxHeight: 200,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-1)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {workoutsLoading ? (
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" }}>
                  Loading…
                </div>
              ) : filteredWorkouts.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-4)" }}>
                  No workouts found
                </div>
              ) : (
                filteredWorkouts.map((workout) => {
                  const isSelected = selectedWorkout?.id === workout.id;
                  const color = SPORT_COLORS[workout.sport] ?? "#8b5cf6";
                  return (
                    <button
                      key={workout.id}
                      onClick={() => setSelectedWorkout(isSelected ? null : workout)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-2) var(--space-3)",
                        borderRadius: "var(--radius-sm)",
                        border: isSelected
                          ? `1px solid ${color}44`
                          : "1px solid transparent",
                        background: isSelected ? `${color}10` : "var(--bg-input)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all var(--duration-micro)",
                        borderLeft: `3px solid ${color}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "var(--bg-input)";
                      }}
                    >
                      <Dumbbell size={13} color={color} style={{ flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            fontWeight: 500,
                            color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {workout.name}
                        </div>
                        {workout.description && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                            {workout.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span
                          style={{
                            width: 16, height: 16,
                            borderRadius: "50%",
                            background: color,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ color: "white", fontSize: 10 }}>✓</span>
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 2: Date */}
          <div>
            <label
              htmlFor="assign-date"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--text-primary)",
                marginBottom: "var(--space-2)",
              }}
            >
              2. Select Date
            </label>
            <div
              className="flex items-center gap-2"
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "0 var(--space-3)",
                height: 40,
              }}
            >
              <Calendar size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <input
                id="assign-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                }}
              />
            </div>
          </div>

          {/* Step 3: Notes */}
          <div>
            <label
              htmlFor="assign-notes"
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--text-secondary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Notes <span style={{ color: "var(--text-muted)" }}>(optional)</span>
            </label>
            <textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Focus on cadence, hold zone 3…"
              rows={2}
              style={{
                width: "100%",
                background: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                padding: "var(--space-2) var(--space-3)",
                color: "var(--text-primary)",
                fontSize: "var(--text-sm)",
                resize: "none",
                outline: "none",
                fontFamily: "Inter, system-ui, sans-serif",
                transition: "border-color var(--duration-micro)",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
              onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
            />
          </div>

          {/* Result feedback */}
          {result === "success" && (
            <div
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-success-8)",
                border: "1px solid var(--color-success-15)",
                fontSize: "var(--text-sm)",
                color: "var(--color-success)",
                textAlign: "center",
              }}
            >
              ✓ Workout assigned successfully!
            </div>
          )}
          {result === "error" && (
            <div
              style={{
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-danger-8)",
                border: "1px solid var(--color-danger-15)",
                fontSize: "var(--text-sm)",
                color: "var(--color-danger)",
                textAlign: "center",
              }}
            >
              Failed to assign workout. Please try again.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
            padding: "var(--space-4) var(--space-6)",
            borderTop: "1px solid var(--border-subtle)",
            flexShrink: 0,
            background: "var(--bg-elevated)",
          }}
        >
          <button
            onClick={closeAssignModal}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            id="confirm-assign-btn"
            onClick={handleAssign}
            disabled={!selectedWorkout || !date || submitting}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background:
                selectedWorkout && date && !submitting
                  ? "var(--color-accent)"
                  : "var(--bg-input)",
              color:
                selectedWorkout && date && !submitting
                  ? "white"
                  : "var(--text-muted)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor:
                selectedWorkout && date && !submitting ? "pointer" : "not-allowed",
              transition: "all var(--duration-micro)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Dumbbell size={13} />
            {submitting ? "Assigning…" : isBulk ? `Assign to ${bulkAssignAthleteIds.length} Athletes` : "Assign Workout"}
          </button>
        </div>
      </div>
    </>
  );
}
