"use client";

// src/components/coach/tabs/AthleteNotesTab.tsx
// Coach notes editor — per athlete. Auto-saves on blur.

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, CheckCircle, Clock } from "lucide-react";
import { rosterService } from "@/lib/services/coach";
import { formatDistanceToNow } from "@/lib/utils/time";

interface AthleteNotesTabProps {
  athleteId: string;
  initialNotes?: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function AthleteNotesTab({ athleteId, initialNotes = "" }: AthleteNotesTabProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirty = notes !== initialNotes;

  // Auto-save on notes change (debounced)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isDirty) return;

    timerRef.current = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  const handleSave = useCallback(async () => {
    if (status === "saving") return;
    setStatus("saving");
    try {
      await rosterService.updateNotes(athleteId, notes);
      setSavedAt(new Date());
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [athleteId, notes, status]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", height: "100%" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Coaching Notes
        </span>

        <div className="flex items-center gap-3">
          {/* Save status indicator */}
          {status === "saved" && (
            <div
              className="flex items-center gap-1"
              style={{ fontSize: "var(--text-xs)", color: "var(--color-success)" }}
            >
              <CheckCircle size={12} />
              <span>Saved</span>
            </div>
          )}
          {status === "saving" && (
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              Saving…
            </span>
          )}
          {status === "error" && (
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)" }}
            >
              Save failed
            </span>
          )}
          {savedAt && status === "idle" && (
            <div
              className="flex items-center gap-1"
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              <Clock size={10} />
              <span>
                Saved{" "}
                {formatDistanceToNow(savedAt, { addSuffix: true })}
              </span>
            </div>
          )}

          {/* Manual save button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || status === "saving"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background:
                isDirty && status !== "saving"
                  ? "var(--color-accent)"
                  : "var(--bg-surface)",
              color:
                isDirty && status !== "saving"
                  ? "white"
                  : "var(--text-muted)",
              fontSize: "var(--text-xs)",
              fontWeight: 500,
              cursor: isDirty && status !== "saving" ? "pointer" : "not-allowed",
              transition: "all var(--duration-micro)",
            }}
          >
            <Save size={12} />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Notes textarea */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <textarea
          id={`athlete-notes-${athleteId}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your coaching notes for this athlete here…&#10;&#10;• Training goals&#10;• Strengths and areas to improve&#10;• Race targets&#10;• Injury history"
          style={{
            flex: 1,
            width: "100%",
            minHeight: 280,
            background: "var(--bg-input)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            color: "var(--text-primary)",
            fontSize: "var(--text-sm)",
            lineHeight: 1.7,
            resize: "vertical",
            fontFamily: "Inter, system-ui, sans-serif",
            outline: "none",
            transition: "border-color var(--duration-micro)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow = "var(--color-focus-ring)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
            e.currentTarget.style.boxShadow = "none";
            if (isDirty) handleSave();
          }}
        />
        <div
          style={{
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: "var(--space-1)",
            textAlign: "right",
          }}
        >
          {notes.length} characters · Auto-saves after 2s
        </div>
      </div>
    </div>
  );
}
