"use client";

// src/components/calendar/CalendarEventModal.tsx
// Modal/sheet for creating or editing calendar events.
// Supports: workout scheduling, rest days, and free-text events.

import { useState, useEffect, useCallback } from "react";
import type { CalendarEvent, CreateCalendarPayload, UpdateCalendarPayload } from "@/lib/types/calendar";
import type { WorkoutSummary } from "@/lib/types/workout";
import { workoutsService } from "@/lib/services/workouts";
import { calendarService } from "@/lib/services/calendar";
import { useCalendarStore } from "@/stores/calendar.store";

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

interface OverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

function Overlay({ children, onClose }: OverlayProps) {
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
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 0,
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
      {/* Sheet */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          boxShadow: "var(--shadow-lg)",
          animation: "slideUp 0.3s cubic-bezier(0.4,0,0.2,1)",
          maxHeight: "92svh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>
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

  return (
    <Overlay onClose={onClose}>
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
