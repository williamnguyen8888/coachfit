"use client";

/**
 * WellnessCheckIn — premium 5-step wellness log wizard.
 * Solves viewport stretching and cluttering.
 */

import React, { useState, useCallback, useEffect } from "react";
import { Check, Loader2, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
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
  min: 1, max: 10, minLabel: "Easy", maxLabel: "Max Effort",
  colorFn: (v) => v <= 4 ? "var(--color-form)" : v <= 6 ? "var(--color-fatigue)" : v <= 8 ? "var(--color-warning)" : "var(--color-danger)",
};
const FATIGUE_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "Exhausted", maxLabel: "Fully Fresh",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-form)",
};
const SLEEP_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "Restless", maxLabel: "Perfect",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-fitness)",
};
const SORENESS_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "Very Sore", maxLabel: "No Soreness",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-form)",
};
const MOTIVATION_DEF: SliderDef = {
  min: 1, max: 5, minLabel: "None", maxLabel: "Pumped",
  colorFn: (v) => v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-accent)",
};

/* ─── Slider CSS ──────────────────────────────────────────────────────────── */

const SLIDER_STYLE = `
  input[type=range] { 
    height: 24px; 
    -webkit-appearance: none;
    background: transparent;
  }
  input[type=range]:focus {
    outline: none;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px; 
    height: 20px;
    border-radius: var(--radius-full);
    background: #ffffff;
    border: 3px solid var(--thumb-color, var(--color-accent));
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), 0 0 10px var(--thumb-glow, rgba(139, 92, 246, 0.3));
    cursor: pointer;
    transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1), background 150ms, border-color 150ms;
    margin-top: -7px;
  }
  input[type=range]:active::-webkit-slider-thumb { 
    transform: scale(1.25); 
    background: var(--thumb-color, var(--color-accent));
    border-color: #ffffff;
  }
  input[type=range]::-webkit-slider-runnable-track {
    width: 100%;
    height: 6px;
    cursor: pointer;
    background: transparent;
    border-radius: var(--radius-full);
  }
  input[type=range]::-moz-range-thumb {
    width: 16px; 
    height: 16px;
    border-radius: var(--radius-full);
    background: #ffffff;
    border: 3px solid var(--thumb-color, var(--color-accent));
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }
  input[type=range]::-moz-range-track {
    width: 100%;
    height: 6px;
    cursor: pointer;
    background: transparent;
    border-radius: var(--radius-full);
  }
`;

/* ─── SliderField ─────────────────────────────────────────────────────────── */

function SliderField({
  id, label, def, value, onChange, lastKnown,
}: {
  id: string; label: string;
  def: SliderDef; value: number | null; onChange: (v: number) => void;
  lastKnown?: number | null;
}) {
  const displayVal = value ?? def.min;
  const pct = ((displayVal - def.min) / (def.max - def.min)) * 100;
  const color = def.colorFn(displayVal);

  return (
    <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)]">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[var(--text-secondary)] font-semibold" style={{ fontSize: "var(--text-sm)" }}>
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          {lastKnown && !value && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>↩ {lastKnown}</span>
          )}
          <span
            className="font-metric tabular-nums min-w-[2rem] text-center rounded-[var(--radius-md)] px-2 py-0.5"
            style={{
              fontSize: "var(--text-xs)",
              color,
              fontWeight: 700,
              background: `color-mix(in srgb, ${color} 12%, rgba(255, 255, 255, 0.02))`,
              border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
              boxShadow: value ? `0 0 10px color-mix(in srgb, ${color} 15%, transparent)` : "none",
              opacity: value ? 1 : 0.4,
            }}
          >
            {value ?? "–"}
          </span>
        </div>
      </div>

      {/* Track + input */}
      <div className="relative mt-2" style={{ height: 24 }}>
        <div className="absolute top-1/2 -translate-y-1/2 w-full rounded-full pointer-events-none" style={{ height: 6, background: "rgba(255, 255, 255, 0.04)" }}>
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{ 
              width: `${value ? pct : 0}%`, 
              background: color, 
              opacity: value ? 1 : 0.25,
              boxShadow: value ? `0 0 8px ${color}60` : "none" 
            }}
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
          style={{
            "--thumb-color": color,
            "--thumb-glow": `${color}50`,
          } as React.CSSProperties & { [key: string]: string }}
          aria-valuenow={value ?? undefined}
        />
      </div>

      <div className="flex justify-between" style={{ marginTop: -2 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.5, fontWeight: 500 }}>{def.minLabel}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.5, fontWeight: 500 }}>{def.maxLabel}</span>
      </div>
    </div>
  );
}

/* ─── SleepHoursInput ─────────────────────────────────────────────────────── */

function SleepHoursInput({ value, onChange, lastKnown }: { value: number | null; onChange: (v: number | null) => void; lastKnown?: number | null }) {
  const hours = [4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)]">
      <div className="flex items-center justify-between">
        <label className="text-[var(--text-secondary)] font-semibold" style={{ fontSize: "var(--text-sm)" }}>
          Sleep duration
        </label>
        {lastKnown && !value && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>↩ {lastKnown}h</span>
        )}
      </div>
      <div className="flex gap-1.5 mt-2">
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
              className="flex-1 flex items-center justify-center rounded-[var(--radius-md)] py-2.5 transition-all duration-300 cursor-pointer font-metric hover:-translate-y-0.5"
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: sel ? 700 : 500,
                background: sel 
                  ? "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(59, 130, 246, 0.08) 100%)" 
                  : "rgba(255, 255, 255, 0.02)",
                border: `1.5px solid ${sel ? "var(--color-fitness)" : "rgba(255, 255, 255, 0.06)"}`,
                color: sel ? "var(--color-fitness)" : "var(--text-muted)",
                boxShadow: sel ? "0 4px 12px rgba(59, 130, 246, 0.2)" : "none",
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

/* ─── Main form ───────────────────────────────────────────────────────────── */

export interface WellnessCheckInProps {
  lastEntry?: WellnessEntry | null;
  onSuccess?: (entry: WellnessEntry) => void;
  date?: string;
}

export function WellnessCheckIn({ lastEntry, onSuccess, date }: WellnessCheckInProps) {
  const today = date ?? new Date().toISOString().split("T")[0];
  const isTodaysEntry = lastEntry?.date === today;

  // Active wizard step (1 to 5)
  const [step, setStep] = useState(1);

  const [mood, setMood]             = useState<MoodScore | null>(isTodaysEntry ? (lastEntry?.mood ?? null) : null);
  const [rpe, setRpe]               = useState<RpeScore | null>(isTodaysEntry ? (lastEntry?.rpe ?? null) : null);
  const [fatigue, setFatigue]       = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.fatigue ?? null) : null);
  const [sleepQuality, setSleepQ]   = useState<SleepQuality | null>(isTodaysEntry ? (lastEntry?.sleepQuality ?? null) : null);
  const [sleepHours, setSleepHours] = useState<number | null>(isTodaysEntry ? (lastEntry?.sleepHours ?? null) : null);
  const [soreness, setSoreness]     = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.soreness ?? null) : null);
  const [motivation, setMotivation] = useState<number | null>(isTodaysEntry ? null : null);
  const [notes, setNotes]           = useState(isTodaysEntry ? (lastEntry?.notes ?? "") : "");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => {
      setSaved(false);
      setStep(1); // Reset to first step on save
    }, 2000);
    return () => clearTimeout(t);
  }, [saved]);

  const hasAnyInput = mood || rpe || fatigue || sleepQuality || sleepHours || soreness || motivation || notes.trim();
  const last = isTodaysEntry ? null : lastEntry;

  // Auto advance on mood selection
  const handleMoodSelect = useCallback((score: MoodScore) => {
    setMood(score);
    // Slight delay for smooth visual feedback before transition
    setTimeout(() => {
      setStep(2);
    }, 250);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAnyInput) return;
    setSaving(true);
    setError(null);
    const body: WellnessLogRequest = {
      ...(mood         && { mood }),
      ...(rpe          && { rpe }),
      ...(fatigue      && { fatigue }),
      ...(sleepQuality && { sleepQuality }),
      ...(sleepHours   && { sleepHours }),
      ...(soreness     && { soreness }),
      ...(notes.trim() && { notes: notes.trim() }),
    };
    try {
      const entry = await wellnessService.upsert(body, today);
      setSaved(true);
      onSuccess?.(entry);
    } catch (err: unknown) {
      const errorMsg = err as { message?: string };
      setError(errorMsg?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [today, mood, rpe, fatigue, sleepQuality, sleepHours, soreness, notes, hasAnyInput, onSuccess]);

  const handleReset = useCallback(() => {
    setMood(null); setRpe(null); setFatigue(null); setSleepQ(null);
    setSleepHours(null); setSoreness(null); setMotivation(null); setNotes("");
    setSaved(false); setError(null);
    setStep(1);
  }, []);

  return (
    <>
      <style>{SLIDER_STYLE}</style>
      <div className="flex flex-col gap-4">
        {/* Progress header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 rounded-[var(--radius-full)] px-3 py-1 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              {isTodaysEntry ? "Edit Check-in" : "Daily Check-in"}
            </span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {new Date(today + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>

          {hasAnyInput && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] transition-all duration-200 cursor-pointer hover:bg-[rgba(255,255,255,0.06)]"
              style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}
            >
              <RefreshCw size={10} strokeWidth={2} />
              Reset
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[rgba(255,255,255,0.04)] h-1 rounded-full overflow-hidden mt-1">
          <div 
            className="h-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Step container to prevent layout shifting */}
        <div className="min-h-[220px] flex flex-col justify-center py-2">
          {/* Step 1: Mood */}
          {step === 1 && (
            <div className="animate-fadeInScale" style={{ animationDuration: "300ms" }}>
              <p className="text-[var(--text-primary)] font-semibold text-center mb-6" style={{ fontSize: "var(--text-base)" }}>
                How are you feeling today?
              </p>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {MOODS.map(({ score, emoji, label, color }) => {
                  const sel = mood === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleMoodSelect(score)}
                      className="flex flex-col items-center justify-center gap-1 py-4 rounded-[var(--radius-lg)] transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
                      style={{
                        background: sel 
                          ? `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, var(--bg-surface)) 0%, color-mix(in srgb, ${color} 5%, var(--bg-elevated)) 100%)` 
                          : "rgba(255, 255, 255, 0.02)",
                        border: `1.5px solid ${sel ? color : "rgba(255, 255, 255, 0.06)"}`,
                        boxShadow: sel ? `0 8px 20px -4px color-mix(in srgb, ${color} 30%, transparent)` : "none",
                      }}
                    >
                      <span className="text-2xl sm:text-3xl leading-none transition-transform duration-200 hover:scale-110 active:scale-95">{emoji}</span>
                      <span 
                        className="text-[10px] sm:text-[11px] font-medium" 
                        style={{ 
                          color: sel ? color : "var(--text-muted)", 
                          fontWeight: sel ? 600 : 400,
                          marginTop: 2 
                        }}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Energy & Effort */}
          {step === 2 && (
            <div className="animate-fadeInScale flex flex-col gap-4" style={{ animationDuration: "300ms" }}>
              <p className="text-[var(--text-primary)] font-semibold text-center mb-2" style={{ fontSize: "var(--text-base)" }}>
                Energy &amp; Effort
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SliderField
                  id="rpe-slider"
                  label="RPE (effort today)"
                  def={RPE_DEF}
                  value={rpe}
                  onChange={(v) => setRpe(v as RpeScore)}
                  lastKnown={last?.rpe}
                />
                <SliderField
                  id="fatigue-slider"
                  label="Energy level (freshness)"
                  def={FATIGUE_DEF}
                  value={fatigue}
                  onChange={(v) => setFatigue(v as FatigueScore)}
                  lastKnown={last?.fatigue}
                />
              </div>
            </div>
          )}

          {/* Step 3: Sleep */}
          {step === 3 && (
            <div className="animate-fadeInScale flex flex-col gap-4" style={{ animationDuration: "300ms" }}>
              <p className="text-[var(--text-primary)] font-semibold text-center mb-2" style={{ fontSize: "var(--text-base)" }}>
                Sleep quality &amp; duration
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SliderField
                  id="sleep-quality-slider"
                  label="Sleep quality"
                  def={SLEEP_DEF}
                  value={sleepQuality}
                  onChange={(v) => setSleepQ(v as SleepQuality)}
                  lastKnown={last?.sleepQuality}
                />
                <SleepHoursInput value={sleepHours} onChange={setSleepHours} lastKnown={last?.sleepHours} />
              </div>
            </div>
          )}

          {/* Step 4: Recovery & Mindset */}
          {step === 4 && (
            <div className="animate-fadeInScale flex flex-col gap-4" style={{ animationDuration: "300ms" }}>
              <p className="text-[var(--text-primary)] font-semibold text-center mb-2" style={{ fontSize: "var(--text-base)" }}>
                Recovery &amp; Mindset
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SliderField
                  id="soreness-slider"
                  label="Muscle soreness"
                  def={SORENESS_DEF}
                  value={soreness}
                  onChange={(v) => setSoreness(v as FatigueScore)}
                  lastKnown={last?.soreness}
                />
                <SliderField
                  id="motivation-slider"
                  label="Motivation level"
                  def={MOTIVATION_DEF}
                  value={motivation}
                  onChange={(v) => setMotivation(v as MoodScore)}
                  lastKnown={undefined}
                />
              </div>
            </div>
          )}

          {/* Step 5: Notes & Submit */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="animate-fadeInScale flex flex-col gap-4" style={{ animationDuration: "300ms" }}>
              <p className="text-[var(--text-primary)] font-semibold text-center mb-2" style={{ fontSize: "var(--text-base)" }}>
                Any extra notes for your coach?
              </p>
              <div className="flex flex-col gap-1.5">
                <textarea
                  id="wellness-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe any aches, soreness, illness, stress..."
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] px-4 py-3 transition-all duration-200"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1.5px solid rgba(255, 255, 255, 0.06)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)")}
                />
                <div className="flex justify-between items-center px-1">
                  <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.5 }}>{notes.length}/500</span>
                </div>
              </div>

              {error && (
                <div
                  className="rounded-[var(--radius-md)] px-3 py-2 text-center"
                  style={{ 
                    background: "rgba(239, 68, 68, 0.1)", 
                    border: "1px solid var(--color-danger)", 
                    fontSize: "var(--text-xs)", 
                    color: "var(--color-danger)" 
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              {/* Submit button inside form */}
              <button
                type="submit"
                id="wellness-submit-btn"
                disabled={saving || !hasAnyInput}
                className={clsx(
                  "flex items-center justify-center gap-2 w-full h-11 rounded-[var(--radius-md)] font-semibold transition-all duration-300 cursor-pointer",
                  "active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
                )}
                style={{
                  background: saved ? "var(--color-success)" : "var(--color-accent)",
                  color: "white",
                  fontSize: "var(--text-sm)",
                  boxShadow: saved
                    ? "0 4px 14px rgba(34, 197, 94, 0.3)"
                    : "0 4px 14px rgba(139, 92, 246, 0.3)",
                }}
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving…</>
                ) : saved ? (
                  <><Check size={16} /> Saved!</>
                ) : (
                  "Complete Check-in"
                )}
              </button>
            </form>
          )}
        </div>

        {/* Wizard Controls */}
        {step < 5 && (
          <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div>
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.02)] transition-all cursor-pointer"
                  style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer"
              style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
