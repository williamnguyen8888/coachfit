"use client";

/**
 * ScheduleModal — date picker for scheduling a saved workout to the calendar.
 *
 * Calls POST /calendar with { workoutId, date, notes }.
 * Requires the workout to already be saved (workoutId must be set).
 */

import * as React from "react";
import { CalendarDays, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { workoutsService } from "@/lib/services/workouts";
import { toLocalDateString } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function todayIso(): string {
  return toLocalDateString(new Date());
}

/* ------------------------------------------------------------------ */
/*  Props                                                                */
/* ------------------------------------------------------------------ */

interface ScheduleModalProps {
  workoutId: string;
  workoutName: string;
  onClose: () => void;
  onSuccess: (date: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function ScheduleModal({ workoutId, workoutName, onClose, onSuccess }: ScheduleModalProps) {
  const [date, setDate] = React.useState(todayIso());
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSchedule() {
    if (!date) { setError("Please select a date."); return; }
    setLoading(true);
    setError(null);
    try {
      await workoutsService.scheduleToCalendar({ workoutId, date, notes: notes || undefined });
      onSuccess(date);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to schedule workout";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Schedule workout"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "28px",
          width: 380,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--radius-sm)",
                background: "var(--color-accent-15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-accent)",
              }}
            >
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
                Schedule to Calendar
              </h3>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: 0, marginTop: 2 }}>
                {workoutName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Date input */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="schedule-date"
            style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}
          >
            Date *
          </label>
          <input
            id="schedule-date"
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => { setDate(e.target.value); setError(null); }}
            style={{
              height: 40,
              borderRadius: "var(--radius-sm)",
              border: `1px solid ${error ? "var(--color-danger)" : "var(--border-default)"}`,
              background: "var(--bg-input)",
              color: "var(--text-primary)",
              padding: "0 12px",
              fontSize: "var(--text-base)",
              outline: "none",
              colorScheme: "dark",
            }}
          />
        </div>

        {/* Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label
            htmlFor="schedule-notes"
            style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}
          >
            Notes (optional)
          </label>
          <textarea
            id="schedule-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Focus on cadence today"
            rows={3}
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
              minHeight: 72,
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)", margin: 0 }} role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={loading}
            leftIcon={loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            onClick={handleSchedule}
          >
            Schedule
          </Button>
        </div>
      </div>
    </div>
  );
}
