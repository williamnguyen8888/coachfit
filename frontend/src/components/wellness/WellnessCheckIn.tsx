"use client";
// src/components/wellness/WellnessCheckIn.tsx
// Wellness check-in form: mood emoji picker, RPE slider, fatigue slider,
// sleep quality, muscle soreness, motivation, and optional notes.
//
// Shows "last known" values as greyed placeholders when editing a fresh entry.
// Submits via wellnessService.upsert() and calls onSuccess when done.

import React, { useState, useCallback, useEffect } from "react";
import {
  SmilePlus,
  Moon,
  Zap,
  Flame,
  Dumbbell,
  Target,
  FileText,
  Check,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { wellnessService } from "@/lib/services/wellness";
import type {
  WellnessEntry,
  WellnessLogRequest,
  MoodScore,
  RpeScore,
  FatigueScore,
  SleepQuality,
} from "@/lib/types/wellness";

/* ─── Mood config ────────────────────────────────────────────────────────── */

const MOODS: { score: MoodScore; emoji: string; label: string; color: string }[] = [
  { score: 1, emoji: "😫", label: "Terrible",  color: "var(--color-danger)" },
  { score: 2, emoji: "😔", label: "Poor",       color: "var(--color-fatigue)" },
  { score: 3, emoji: "😐", label: "Okay",       color: "var(--text-secondary)" },
  { score: 4, emoji: "🙂", label: "Good",       color: "var(--color-form)" },
  { score: 5, emoji: "😁", label: "Excellent",  color: "var(--color-success)" },
];

/* ─── Slider config ──────────────────────────────────────────────────────── */

interface SliderDef {
  min: number;
  max: number;
  labels: string[];
  /** Return hsl color at a given value */
  colorFn: (v: number, min: number, max: number) => string;
}

function lerpColor(from: string, to: string, t: number): string {
  // We use inline CSS gradient so we only need the track color logic
  return `color-mix(in srgb, ${to} ${Math.round(t * 100)}%, ${from})`;
}

// RPE: 1 = very light, 10 = maximal (higher = more intense = amber→red)
const RPE_DEF: SliderDef = {
  min: 1, max: 10,
  labels: ["Very light", "Light", "Moderate", "Hard", "Very hard", "Max"],
  colorFn: (v) => {
    if (v <= 4) return "var(--color-form)";
    if (v <= 6) return "var(--color-fatigue)";
    if (v <= 8) return "var(--color-warning)";
    return "var(--color-danger)";
  },
};

// Fatigue: 1 = very fatigued, 5 = completely fresh (higher = better = green)
const FATIGUE_DEF: SliderDef = {
  min: 1, max: 5,
  labels: ["Exhausted", "Tired", "Moderate", "Fresh", "Very fresh"],
  colorFn: (v) => {
    if (v <= 2) return "var(--color-danger)";
    if (v === 3) return "var(--color-fatigue)";
    return "var(--color-form)";
  },
};

// Sleep quality: 1 = very poor, 5 = excellent (higher = better = green)
const SLEEP_DEF: SliderDef = {
  min: 1, max: 5,
  labels: ["Very poor", "Poor", "Fair", "Good", "Excellent"],
  colorFn: (v) => {
    if (v <= 2) return "var(--color-danger)";
    if (v === 3) return "var(--color-fatigue)";
    return "var(--color-fitness)";
  },
};

// Muscle soreness: 1 = very sore, 5 = no soreness
const SORENESS_DEF: SliderDef = {
  min: 1, max: 5,
  labels: ["Very sore", "Sore", "Moderate", "Slight", "None"],
  colorFn: (v) => {
    if (v <= 2) return "var(--color-danger)";
    if (v === 3) return "var(--color-fatigue)";
    return "var(--color-form)";
  },
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

interface MoodPickerProps {
  value: MoodScore | null;
  onChange: (v: MoodScore) => void;
  lastKnown?: MoodScore | null;
}

function MoodPicker({ value, onChange, lastKnown }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
          <SmilePlus size={15} strokeWidth={1.75} />
          How are you feeling?
        </label>
        {lastKnown && !value && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Last: {MOODS.find((m) => m.score === lastKnown)?.emoji}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {MOODS.map(({ score, emoji, label, color }) => {
          const isSelected = value === score;
          return (
            <button
              key={score}
              type="button"
              id={`mood-${score}`}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onChange(score)}
              className={clsx(
                "flex-1 flex flex-col items-center gap-1.5 rounded-[var(--radius-md)] py-3 transition-all duration-150",
                "hover:scale-105 active:scale-95",
              )}
              style={{
                background: isSelected
                  ? `color-mix(in srgb, ${color} 18%, var(--bg-elevated))`
                  : "var(--bg-elevated)",
                border: `1.5px solid ${isSelected ? color : "var(--border-subtle)"}`,
                boxShadow: isSelected ? `0 0 12px color-mix(in srgb, ${color} 25%, transparent)` : "none",
              }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>{emoji}</span>
              <span style={{ fontSize: "var(--text-xs)", color: isSelected ? color : "var(--text-muted)", fontWeight: isSelected ? 600 : 400 }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SliderFieldProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  def: SliderDef;
  value: number | null;
  onChange: (v: number) => void;
  lastKnown?: number | null;
  className?: string;
}

function SliderField({ id, icon, label, def, value, onChange, lastKnown, className }: SliderFieldProps) {
  const displayVal = value ?? def.min;
  const pct = ((displayVal - def.min) / (def.max - def.min)) * 100;
  const color = def.colorFn(displayVal, def.min, def.max);
  const stepLabel = def.labels[Math.round((displayVal - def.min) / (def.max - def.min) * (def.labels.length - 1))];

  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-2" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
          {icon}
          {label}
        </label>
        <div className="flex items-center gap-2">
          {lastKnown && !value && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Last: {lastKnown}
            </span>
          )}
          <span
            className="font-metric tabular-nums min-w-[2.5rem] text-center rounded-[var(--radius-sm)] px-2 py-0.5"
            style={{
              fontSize: "var(--text-sm)",
              color,
              fontWeight: 700,
              background: `color-mix(in srgb, ${color} 12%, var(--bg-elevated))`,
              border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              opacity: value ? 1 : 0.4,
            }}
          >
            {value ? `${value}${def.max === 10 ? "" : ""}` : "–"}
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Track */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-full rounded-full pointer-events-none"
          style={{ height: 6, background: "var(--bg-elevated)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${value ? pct : 0}%`,
              background: color,
              opacity: value ? 1 : 0.3,
            }}
          />
        </div>

        <input
          id={id}
          type="range"
          min={def.min}
          max={def.max}
          step={1}
          value={value ?? def.min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full appearance-none bg-transparent cursor-pointer"
          style={{ height: 24, zIndex: 1 }}
          aria-valuemin={def.min}
          aria-valuemax={def.max}
          aria-valuenow={value ?? undefined}
          aria-valuetext={stepLabel}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between px-1">
        {def.labels.map((l, i) => (
          <span
            key={i}
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--text-muted)",
              opacity: value && def.labels.indexOf(stepLabel) === i ? 1 : 0.5,
              transition: "opacity 150ms",
            }}
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

interface SleepHoursInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  lastKnown?: number | null;
}

function SleepHoursInput({ value, onChange, lastKnown }: SleepHoursInputProps) {
  const hours = [4, 5, 6, 7, 8, 9, 10];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
          <Moon size={15} strokeWidth={1.75} />
          Sleep duration
        </label>
        {lastKnown && !value && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Last: {lastKnown}h
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        {hours.map((h) => {
          const isSelected = value === h;
          return (
            <button
              key={h}
              type="button"
              id={`sleep-hours-${h}`}
              aria-label={`${h} hours`}
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? null : h)}
              className="flex-1 flex items-center justify-center rounded-[var(--radius-sm)] py-2 transition-all duration-150 hover:scale-105 active:scale-95 font-metric"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: isSelected ? 700 : 400,
                background: isSelected ? "color-mix(in srgb, var(--color-fitness) 18%, var(--bg-elevated))" : "var(--bg-elevated)",
                border: `1.5px solid ${isSelected ? "var(--color-fitness)" : "var(--border-subtle)"}`,
                color: isSelected ? "var(--color-fitness)" : "var(--text-muted)",
              }}
            >
              {h}h
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Slider CSS ─────────────────────────────────────────────────────────── */

const SLIDER_GLOBAL_STYLE = `
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--text-primary);
    border: 2px solid var(--bg-primary);
    box-shadow: 0 1px 6px rgba(0,0,0,0.5);
    cursor: pointer;
    transition: transform 150ms ease-out, box-shadow 150ms;
  }
  input[type=range]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 2px 10px rgba(0,0,0,0.6);
  }
  input[type=range]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--text-primary);
    border: 2px solid var(--bg-primary);
    cursor: pointer;
  }
`;

/* ─── Main form ──────────────────────────────────────────────────────────── */

export interface WellnessCheckInProps {
  /** Pre-fill form with last known entry (or today's existing entry) */
  lastEntry?: WellnessEntry | null;
  /** Called with the saved entry on success */
  onSuccess?: (entry: WellnessEntry) => void;
  /** Today's date in YYYY-MM-DD. Defaults to client local date. */
  date?: string;
}

export function WellnessCheckIn({ lastEntry, onSuccess, date }: WellnessCheckInProps) {
  const today = date ?? new Date().toISOString().split("T")[0];

  // Determine if lastEntry is for today (editing) vs yesterday (new entry with last-known hints)
  const isTodaysEntry = lastEntry?.date === today;

  const [mood, setMood]               = useState<MoodScore | null>(isTodaysEntry ? (lastEntry?.mood ?? null) : null);
  const [rpe, setRpe]                 = useState<RpeScore | null>(isTodaysEntry ? (lastEntry?.rpe ?? null) : null);
  const [fatigue, setFatigue]         = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.fatigue ?? null) : null);
  const [sleepQuality, setSleepQ]     = useState<SleepQuality | null>(isTodaysEntry ? (lastEntry?.sleepQuality ?? null) : null);
  const [sleepHours, setSleepHours]   = useState<number | null>(isTodaysEntry ? (lastEntry?.sleepHours ?? null) : null);
  const [soreness, setSoreness]       = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.muscleSoreness ?? null) : null);
  const [motivation, setMotivation]   = useState<MoodScore | null>(isTodaysEntry ? (lastEntry?.motivation ?? null) : null);
  const [notes, setNotes]             = useState(isTodaysEntry ? (lastEntry?.notes ?? "") : "");

  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Reset saved state after 3s
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  const hasAnyInput = mood || rpe || fatigue || sleepQuality || sleepHours || soreness || motivation || notes.trim();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyInput) return;

    setSaving(true);
    setError(null);

    const body: WellnessLogRequest = {
      date: today,
      ...(mood         && { mood }),
      ...(rpe          && { rpe }),
      ...(fatigue      && { fatigue }),
      ...(sleepQuality && { sleepQuality }),
      ...(sleepHours   && { sleepHours }),
      ...(soreness     && { muscleSoreness: soreness }),
      ...(motivation   && { motivation }),
      ...(notes.trim() && { notes: notes.trim() }),
    };

    try {
      const entry = await wellnessService.upsert(body);
      setSaved(true);
      onSuccess?.(entry);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [today, mood, rpe, fatigue, sleepQuality, sleepHours, soreness, motivation, notes, hasAnyInput, onSuccess]);

  const handleReset = useCallback(() => {
    setMood(null); setRpe(null); setFatigue(null); setSleepQ(null);
    setSleepHours(null); setSoreness(null); setMotivation(null); setNotes("");
    setSaved(false); setError(null);
  }, []);

  // last-known hints (only shown when not editing today)
  const last = isTodaysEntry ? null : lastEntry;

  return (
    <>
      <style>{SLIDER_GLOBAL_STYLE}</style>

      <form
        onSubmit={handleSubmit}
        id="wellness-checkin-form"
        className="flex flex-col gap-5"
        aria-label="Wellness check-in form"
      >
        {/* ── Date badge ── */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 rounded-[var(--radius-full)] px-3 py-1"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {isTodaysEntry ? "Editing today's check-in" : "Today"}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              {new Date(today + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          {hasAnyInput && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 transition-all duration-150 hover:bg-[var(--bg-elevated)]"
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              <RefreshCw size={11} strokeWidth={2} />
              Reset
            </button>
          )}
        </div>

        {/* ── Mood ── */}
        <MoodPicker value={mood} onChange={setMood} lastKnown={last?.mood} />

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "var(--border-subtle)" }} />

        {/* ── RPE ── */}
        <SliderField
          id="rpe-slider"
          icon={<Flame size={15} strokeWidth={1.75} />}
          label="Yesterday's effort (RPE)"
          def={RPE_DEF}
          value={rpe}
          onChange={(v) => setRpe(v as RpeScore)}
          lastKnown={last?.rpe}
        />

        {/* ── Fatigue ── */}
        <SliderField
          id="fatigue-slider"
          icon={<Zap size={15} strokeWidth={1.75} />}
          label="Energy & fatigue"
          def={FATIGUE_DEF}
          value={fatigue}
          onChange={(v) => setFatigue(v as FatigueScore)}
          lastKnown={last?.fatigue}
        />

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "var(--border-subtle)" }} />

        {/* ── Sleep quality ── */}
        <SliderField
          id="sleep-quality-slider"
          icon={<Moon size={15} strokeWidth={1.75} />}
          label="Sleep quality"
          def={SLEEP_DEF}
          value={sleepQuality}
          onChange={(v) => setSleepQ(v as SleepQuality)}
          lastKnown={last?.sleepQuality}
        />

        {/* ── Sleep hours ── */}
        <SleepHoursInput value={sleepHours} onChange={setSleepHours} lastKnown={last?.sleepHours} />

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "var(--border-subtle)" }} />

        {/* ── Muscle soreness ── */}
        <SliderField
          id="soreness-slider"
          icon={<Dumbbell size={15} strokeWidth={1.75} />}
          label="Muscle soreness"
          def={SORENESS_DEF}
          value={soreness}
          onChange={(v) => setSoreness(v as FatigueScore)}
          lastKnown={last?.muscleSoreness}
        />

        {/* ── Motivation ── */}
        <SliderField
          id="motivation-slider"
          icon={<Target size={15} strokeWidth={1.75} />}
          label="Motivation to train"
          def={{
            min: 1, max: 5,
            labels: ["None", "Low", "Moderate", "High", "Pumped"],
            colorFn: (v) => {
              if (v <= 2) return "var(--color-danger)";
              if (v === 3) return "var(--color-fatigue)";
              return "var(--color-accent)";
            },
          }}
          value={motivation}
          onChange={(v) => setMotivation(v as MoodScore)}
          lastKnown={last?.motivation}
        />

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "var(--border-subtle)" }} />

        {/* ── Notes ── */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="wellness-notes"
            className="flex items-center gap-2"
            style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}
          >
            <FileText size={15} strokeWidth={1.75} />
            Notes (optional)
          </label>
          <textarea
            id="wellness-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="How are you feeling? Any aches, illness, stress…"
            maxLength={500}
            rows={3}
            className="w-full resize-none rounded-[var(--radius-sm)] px-3 py-2.5 transition-all duration-150"
            style={{
              background: "var(--bg-input)",
              border: "1.5px solid var(--border-default)",
              color: "var(--text-primary)",
              fontSize: "var(--text-sm)",
              outline: "none",
              fontFamily: "var(--font-sans)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
          />
          <div className="flex justify-end">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {notes.length}/500
            </span>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            className="rounded-[var(--radius-sm)] px-3 py-2.5"
            style={{ background: "color-mix(in srgb, var(--color-danger) 12%, var(--bg-elevated))", border: "1px solid var(--color-danger)", fontSize: "var(--text-sm)", color: "var(--color-danger)" }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          id="wellness-submit-btn"
          disabled={saving || !hasAnyInput}
          className={clsx(
            "flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-md)] font-semibold transition-all duration-150",
            "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
          )}
          style={{
            background: saved
              ? "var(--color-success)"
              : "var(--color-accent)",
            color: "white",
            fontSize: "var(--text-base)",
            boxShadow: saved ? "0 0 20px color-mix(in srgb, var(--color-success) 30%, transparent)" : "var(--shadow-glow)",
          }}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check size={18} /> Saved!</>
          ) : (
            "Save check-in"
          )}
        </button>
      </form>
    </>
  );
}
