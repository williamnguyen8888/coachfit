"use client";

/**
 * DurationEditor — popover-style modal for editing a step's duration.
 *
 * Supports:
 *   - time     → input as "mm:ss" (stored as total seconds)
 *   - distance → input as meters
 *   - lap_button → no value input needed
 */

import * as React from "react";
import { Clock, Ruler, MousePointerClick, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { StepDuration } from "@/lib/types/workout";

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function secondsToMmss(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function mmssToSeconds(str: string): number | null {
  const parts = str.split(":");
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(s) && s < 60) return m * 60 + s;
  }
  // plain seconds
  const n = parseInt(str, 10);
  if (!isNaN(n) && n > 0) return n;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Duration type tabs                                                   */
/* ------------------------------------------------------------------ */

const DURATION_TYPES: { type: StepDuration["type"]; label: string; icon: React.ReactNode }[] = [
  { type: "time", label: "Time", icon: <Clock size={14} /> },
  { type: "distance", label: "Distance", icon: <Ruler size={14} /> },
  { type: "lap_button", label: "Lap Button", icon: <MousePointerClick size={14} /> },
];

/* ------------------------------------------------------------------ */
/*  Props                                                                */
/* ------------------------------------------------------------------ */

interface DurationEditorProps {
  value: StepDuration;
  onSave: (d: StepDuration) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function DurationEditor({ value, onSave, onClose }: DurationEditorProps) {
  const [type, setType] = React.useState<StepDuration["type"]>(value.type);
  const [raw, setRaw] = React.useState<string>(() => {
    if (value.type === "time" && value.value != null)
      return secondsToMmss(value.value);
    if (value.value != null) return String(value.value);
    return "";
  });
  const [error, setError] = React.useState<string | null>(null);

  function handleTypeChange(t: StepDuration["type"]) {
    setType(t);
    setError(null);
    if (t === "time") setRaw("5:00");
    else if (t === "distance") setRaw("1000");
    else setRaw("");
  }

  function handleSave() {
    if (type === "lap_button") {
      onSave({ type: "lap_button", value: undefined });
      return;
    }
    const parsed = type === "time" ? mmssToSeconds(raw) : parseInt(raw, 10);
    if (!parsed || parsed <= 0) {
      setError(type === "time" ? "Enter a valid time (e.g. 5:00)" : "Enter a valid distance in meters");
      return;
    }
    onSave({ type, value: parsed });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit duration"
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
          padding: "24px",
          width: 340,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Edit Duration
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: 4,
              borderRadius: "var(--radius-sm)",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Type tabs */}
        <div style={{ display: "flex", gap: 8 }}>
          {DURATION_TYPES.map((dt) => (
            <button
              key={dt.type}
              onClick={() => handleTypeChange(dt.type)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "10px 8px",
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${type === dt.type ? "var(--color-accent)" : "var(--border-default)"}`,
                background: type === dt.type ? "rgba(139,92,246,0.12)" : "var(--bg-input)",
                color: type === dt.type ? "var(--color-accent)" : "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "var(--text-xs)",
                fontWeight: type === dt.type ? 600 : 400,
                transition: "all 150ms ease-out",
              }}
            >
              {dt.icon}
              {dt.label}
            </button>
          ))}
        </div>

        {/* Value input */}
        {type !== "lap_button" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}
              htmlFor="duration-value-input"
            >
              {type === "time" ? "Duration (mm:ss)" : "Distance (meters)"}
            </label>
            <input
              id="duration-value-input"
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={type === "time" ? "5:00" : "1000"}
              autoFocus
              style={{
                height: 40,
                borderRadius: "var(--radius-sm)",
                border: `1px solid ${error ? "var(--color-danger)" : "var(--border-default)"}`,
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                padding: "0 12px",
                fontSize: "var(--text-base)",
                fontFamily: "var(--font-mono, monospace)",
                outline: "none",
                transition: "border-color 150ms",
              }}
            />
            {error && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)", margin: 0 }} role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {type === "lap_button" && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
            Step ends when athlete presses the lap button on their device.
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Check size={14} />}
            onClick={handleSave}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
