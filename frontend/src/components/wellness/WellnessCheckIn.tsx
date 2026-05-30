"use client";
// src/components/wellness/WellnessCheckIn.tsx

import React, { useState, useCallback, useEffect } from "react";
import {
  SmilePlus, Moon, Zap, Flame, Dumbbell, Target,
  FileText, Check, Loader2, RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { wellnessService } from "@/lib/services/wellness";
import type {
  WellnessEntry, WellnessLogRequest,
  MoodScore, RpeScore, FatigueScore, SleepQuality,
} from "@/lib/types/wellness";

/* ─── Mood config ─────────────────────────────────────────────────────────── */

const MOODS: { score: MoodScore; emoji: string; label: string; color: string }[] = [
  { score: 1, emoji: "😫", label: "Terrible", color: "var(--color-danger)" },
  { score: 2, emoji: "😔", label: "Poor",     color: "var(--color-fatigue)" },
  { score: 3, emoji: "😐", label: "Okay",     color: "var(--text-secondary)" },
  { score: 4, emoji: "🙂", label: "Good",     color: "var(--color-form)" },
  { score: 5, emoji: "😁", label: "Excellent",color: "var(--color-success)" },
];

/* ─── Slider config ───────────────────────────────────────────────────────── */

interface SliderDef {
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  colorFn: (v: number) => string;
}

const RPE_DEF: SliderDef = {
  min: 1, max: 10, minLabel: "Easy", maxLabel: "Max",
  colorFn: (v) => v <= 4 ? "var(--color-form)" : v <= 6 ? "var(--color-fatigue)" : v <= 8 ? "var(--color-warning)" : "var(--color-danger)",
};
const FATIGUE_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "Exhausted", maxLabel: "Fresh",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-form)",
};
const SLEEP_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "Terrible", maxLabel: "Perfect",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-fitness)",
};
const SORENESS_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "Very sore", maxLabel: "None",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-form)",
};
const MOTIVATION_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "None", maxLabel: "Pumped",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-accent)",
};

/* ─── Slider CSS ──────────────────────────────────────────────────────────── */

const SLIDER_STYLE = `
  input[type=range] { height: 20px; }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: var(--text-primary);
    border: 2px solid var(--bg-primary);
    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    cursor: pointer;
    transition: transform 120ms ease-out;
  }
  input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.25); }
  input[type=range]::-moz-range-thumb {
    width: 16px; height: 16px;
    border-radius: 50%;
    background: var(--text-primary);
    border: 2px solid var(--bg-primary);
    cursor: pointer;
  }
`;

/* ─── MoodPicker ──────────────────────────────────────────────────────────── */

function MoodPicker({ value, onChange, lastKnown }: { value: MoodScore | null; onChange: (v: MoodScore) => void; lastKnown?: MoodScore | null }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <SmilePlus size={12} strokeWidth={2} />
          How are you feeling?
        </label>
        {lastKnown && !value && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Last: {MOODS.find(m => m.score === lastKnown)?.emoji}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {MOODS.map(({ score, emoji, label, color }) => {
          const sel = value === score;
          return (
            <button
              key={score}
              type="button"
              id={`mood-${score}`}
              aria-label={label}
              aria-pressed={sel}
              onClick={() => onChange(score)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-md)] transition-all duration-150 hover:scale-105 active:scale-95"
              style={{
                background: sel ? `color-mix(in srgb, ${color} 15%, var(--bg-elevated))` : "var(--bg-elevated)",
                border: `1.5px solid ${sel ? color : "var(--border-subtle)"}`,
                boxShadow: sel ? `0 0 14px color-mix(in srgb, ${color} 22%, transparent)` : "none",
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{emoji}</span>
              <span style={{ fontSize: "var(--text-xs)", color: sel ? color : "var(--text-muted)", fontWeight: sel ? 600 : 400 }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SliderField ─────────────────────────────────────────────────────────── */

function SliderField({
  id, icon, label, def, value, onChange, lastKnown,
}: {
  id: string; icon: React.ReactNode; label: string;
  def: SliderDef; value: number | null; onChange: (v: number) => void;
  lastKnown?: number | null;
}) {
  const displayVal = value ?? def.min;
  const pct = ((displayVal - def.min) / (def.max - def.min)) * 100;
  const color = def.colorFn(displayVal);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="flex items-center gap-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <span style={{ color: "var(--text-muted)" }}>{icon}</span>
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          {lastKnown && !value && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>↩ {lastKnown}</span>
          )}
          <span
            className="font-metric tabular-nums min-w-[2rem] text-center rounded-[var(--radius-sm)] px-1.5 py-0.5"
            style={{
              fontSize: "var(--text-xs)",
              color,
              fontWeight: 700,
              background: `color-mix(in srgb, ${color} 12%, var(--bg-elevated))`,
              border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
              opacity: value ? 1 : 0.4,
            }}
          >
            {value ?? "–"}
          </span>
        </div>
      </div>

      {/* Track + input */}
      <div className="relative" style={{ height: 20 }}>
        <div className="absolute top-1/2 -translate-y-1/2 w-full rounded-full pointer-events-none" style={{ height: 5, background: "var(--bg-elevated)" }}>
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ width: `${value ? pct : 0}%`, background: color, opacity: value ? 1 : 0.25 }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={def.min}
          max={def.max}
          step={1}
          value={displayVal}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
          aria-valuenow={value ?? undefined}
        />
      </div>

      <div className="flex justify-between" style={{ marginTop: -2 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>{def.minLabel}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>{def.maxLabel}</span>
      </div>
    </div>
  );
}

/* ─── SleepHoursInput ─────────────────────────────────────────────────────── */

function SleepHoursInput({ value, onChange, lastKnown }: { value: number | null; onChange: (v: number | null) => void; lastKnown?: number | null }) {
  const hours = [4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <Moon size={12} strokeWidth={2} />
          Sleep duration
        </label>
        {lastKnown && !value && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>↩ {lastKnown}h</span>
        )}
      </div>
      <div className="flex gap-1.5">
        {hours.map((h) => {
          const sel = value === h;
          return (
            <button
              key={h}
              type="button"
              id={`sleep-hours-${h}`}
              aria-label={`${h} hours`}
              aria-pressed={sel}
              onClick={() => onChange(sel ? null : h)}
              className="flex-1 flex items-center justify-center rounded-[var(--radius-sm)] py-1.5 transition-all duration-150 hover:scale-105 active:scale-95 font-metric"
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: sel ? 700 : 400,
                background: sel ? "color-mix(in srgb, var(--color-fitness) 15%, var(--bg-elevated))" : "var(--bg-elevated)",
                border: `1.5px solid ${sel ? "var(--color-fitness)" : "var(--border-subtle)"}`,
                color: sel ? "var(--color-fitness)" : "var(--text-muted)",
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

/* ─── Divider ─────────────────────────────────────────────────────────────── */

function Divider() {
  return <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />;
}

/* ─── Section label ───────────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}>
      {children}
    </p>
  );
}

/* ─── Main form ───────────────────────────────────────────────────────────── */

export interface WellnessCheckInProps {
  lastEntry?: WellnessEntry | null;
  onSuccess?: (entry: WellnessEntry) => void;
  date?: string;
}

export function WellnessCheckIn({ lastEntry, onSuccess, date }: WellnessCheckInProps) {
  const today = date ?? new Date().toISOString().split("T")[0];
  const isTodaysEntry = lastEntry?.date === today;

  const [mood, setMood]             = useState<MoodScore | null>(isTodaysEntry ? (lastEntry?.mood ?? null) : null);
  const [rpe, setRpe]               = useState<RpeScore | null>(isTodaysEntry ? (lastEntry?.rpe ?? null) : null);
  const [fatigue, setFatigue]       = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.fatigue ?? null) : null);
  const [sleepQuality, setSleepQ]   = useState<SleepQuality | null>(isTodaysEntry ? (lastEntry?.sleepQuality ?? null) : null);
  const [sleepHours, setSleepHours] = useState<number | null>(isTodaysEntry ? (lastEntry?.sleepHours ?? null) : null);
  const [soreness, setSoreness]     = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.muscleSoreness ?? null) : null);
  const [motivation, setMotivation] = useState<MoodScore | null>(isTodaysEntry ? (lastEntry?.motivation ?? null) : null);
  const [notes, setNotes]           = useState(isTodaysEntry ? (lastEntry?.notes ?? "") : "");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  const hasAnyInput = mood || rpe || fatigue || sleepQuality || sleepHours || soreness || motivation || notes.trim();
  const last = isTodaysEntry ? null : lastEntry;

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

  return (
    <>
      <style>{SLIDER_STYLE}</style>
      <form
        onSubmit={handleSubmit}
        id="wellness-checkin-form"
        className="flex flex-col gap-4"
        aria-label="Wellness check-in form"
      >
        {/* ── Date bar ── */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
          >
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {isTodaysEntry ? "Editing today" : "Today"}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              {new Date(today + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          {hasAnyInput && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-1 transition-all duration-150 hover:bg-[var(--bg-elevated)]"
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              <RefreshCw size={10} strokeWidth={2} />
              Reset
            </button>
          )}
        </div>

        {/* ── Mood ── */}
        <MoodPicker value={mood} onChange={setMood} lastKnown={last?.mood} />

        <Divider />

        {/* ── Effort & Energy — 2-col grid ── */}
        <div>
          <SectionLabel>Effort &amp; Energy</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <SliderField
              id="rpe-slider"
              icon={<Flame size={12} strokeWidth={2} />}
              label="RPE (effort)"
              def={RPE_DEF}
              value={rpe}
              onChange={(v) => setRpe(v as RpeScore)}
              lastKnown={last?.rpe}
            />
            <SliderField
              id="fatigue-slider"
              icon={<Zap size={12} strokeWidth={2} />}
              label="Energy level"
              def={FATIGUE_DEF}
              value={fatigue}
              onChange={(v) => setFatigue(v as FatigueScore)}
              lastKnown={last?.fatigue}
            />
          </div>
        </div>

        <Divider />

        {/* ── Sleep — 2-col grid ── */}
        <div>
          <SectionLabel>Sleep</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <SliderField
              id="sleep-quality-slider"
              icon={<Moon size={12} strokeWidth={2} />}
              label="Sleep quality"
              def={SLEEP_DEF}
              value={sleepQuality}
              onChange={(v) => setSleepQ(v as SleepQuality)}
              lastKnown={last?.sleepQuality}
            />
            <SleepHoursInput value={sleepHours} onChange={setSleepHours} lastKnown={last?.sleepHours} />
          </div>
        </div>

        <Divider />

        {/* ── Recovery — 2-col grid ── */}
        <div>
          <SectionLabel>Recovery &amp; Mindset</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <SliderField
              id="soreness-slider"
              icon={<Dumbbell size={12} strokeWidth={2} />}
              label="Muscle soreness"
              def={SORENESS_DEF}
              value={soreness}
              onChange={(v) => setSoreness(v as FatigueScore)}
              lastKnown={last?.muscleSoreness}
            />
            <SliderField
              id="motivation-slider"
              icon={<Target size={12} strokeWidth={2} />}
              label="Motivation"
              def={MOTIVATION_DEF}
              value={motivation}
              onChange={(v) => setMotivation(v as MoodScore)}
              lastKnown={last?.motivation}
            />
          </div>
        </div>

        <Divider />

        {/* ── Notes ── */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="wellness-notes"
            className="flex items-center gap-1.5"
            style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7 }}
          >
            <FileText size={10} strokeWidth={2} />
            Notes (optional)
          </label>
          <textarea
            id="wellness-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any aches, illness, stress, highlights…"
            maxLength={500}
            rows={2}
            className="w-full resize-none rounded-[var(--radius-sm)] px-3 py-2 transition-all duration-150"
            style={{
              background: "var(--bg-elevated)",
              border: "1.5px solid var(--border-default)",
              color: "var(--text-primary)",
              fontSize: "var(--text-sm)",
              outline: "none",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
          />
          <div className="flex justify-end">
            <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.5 }}>{notes.length}/500</span>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            className="rounded-[var(--radius-sm)] px-3 py-2"
            style={{ background: "color-mix(in srgb, var(--color-danger) 10%, var(--bg-elevated))", border: "1px solid var(--color-danger)", fontSize: "var(--text-sm)", color: "var(--color-danger)" }}
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
            "flex items-center justify-center gap-2 w-full h-11 rounded-[var(--radius-md)] font-semibold transition-all duration-200",
            "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
          )}
          style={{
            background: saved ? "var(--color-success)" : "var(--color-accent)",
            color: "white",
            fontSize: "var(--text-sm)",
            boxShadow: saved
              ? "0 0 20px color-mix(in srgb, var(--color-success) 25%, transparent)"
              : "0 0 20px color-mix(in srgb, var(--color-accent) 20%, transparent)",
          }}
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><Check size={16} /> Saved!</>
          ) : (
            "Save check-in"
          )}
        </button>
      </form>
    </>
  );
}
