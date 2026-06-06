"use client";

/**
 * WellnessCheckIn — 5-step wellness log wizard.
 * Clean, mobile-first design. Low visual noise, high data clarity.
 */

import React, { useState, useCallback, useEffect } from "react";
import { Check, Loader2, ArrowLeft } from "lucide-react";
import { clsx } from "clsx";
import { wellnessService } from "@/lib/services/wellness";
import { toLocalDateString } from "@/lib/utils";
import type {
  WellnessEntry, WellnessLogRequest,
  MoodScore, RpeScore, FatigueScore, SleepQuality,
} from "@/lib/types/wellness";

/* ─── Mood config ─────────────────────────────────────────────────────────────── */

const MOODS: { score: MoodScore; emoji: string; label: string; color: string }[] = [
  { score: 1, emoji: "😫", label: "Terrible",  color: "var(--color-danger)" },
  { score: 2, emoji: "😔", label: "Poor",      color: "var(--color-fatigue)" },
  { score: 3, emoji: "😐", label: "Okay",      color: "var(--text-secondary)" },
  { score: 4, emoji: "🙂", label: "Good",      color: "var(--color-form)" },
  { score: 5, emoji: "😁", label: "Excellent", color: "var(--color-success)" },
];

/* ─── Slider config ───────────────────────────────────────────────────────────── */

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

/* ─── Slider CSS — clean, minimal ─────────────────────────────────────────────── */

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
    width: 18px;
    height: 18px;
    border-radius: 9999px;
    background: #ffffff;
    border: 2.5px solid var(--thumb-color, var(--color-accent));
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    cursor: pointer;
    transition: transform 150ms ease, border-color 150ms;
    margin-top: -7px;
  }
  input[type=range]:active::-webkit-slider-thumb {
    transform: scale(1.15);
    background: var(--thumb-color, var(--color-accent));
    border-color: #ffffff;
  }
  input[type=range]::-webkit-slider-runnable-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: transparent;
    border-radius: 9999px;
  }
  input[type=range]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 9999px;
    background: #ffffff;
    border: 2.5px solid var(--thumb-color, var(--color-accent));
    box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    cursor: pointer;
  }
  input[type=range]::-moz-range-track {
    width: 100%;
    height: 4px;
    cursor: pointer;
    background: transparent;
    border-radius: 9999px;
  }
`;

/* ─── SliderField ─────────────────────────────────────────────────────────────── */

function SliderField({
  id, label, def, value, onChange, lastKnown,
}: {
  id: string;
  label: string;
  def: SliderDef;
  value: number | null;
  onChange: (v: number) => void;
  lastKnown?: number | null;
}) {
  const displayVal = value ?? def.min;
  const pct = ((displayVal - def.min) / (def.max - def.min)) * 100;
  const color = def.colorFn(displayVal);
  const isSet = value !== null;

  return (
    <div className="flex flex-col gap-2 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="font-semibold"
          style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}
        >
          {label}
        </label>
        <div className="flex items-center gap-2">
          {lastKnown && !isSet && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              Last: {lastKnown}
            </span>
          )}
          {/* Value badge — just the number, colored text */}
          <span
            className="font-mono tabular-nums min-w-[1.75rem] text-center"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: isSet ? color : "var(--text-muted)",
              opacity: isSet ? 1 : 0.45,
            }}
          >
            {isSet ? value : "–"}
          </span>
        </div>
      </div>

      {/* Track + thumb */}
      <div className="relative" style={{ height: 24 }}>
        {/* Track background */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-full rounded-full pointer-events-none"
          style={{ height: 4, background: "var(--bg-elevated)" }}
        >
          {/* Track fill — no glow */}
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${isSet ? pct : 0}%`,
              background: color,
              opacity: isSet ? 1 : 0,
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
          } as React.CSSProperties & { [key: string]: string }}
          aria-valuenow={value ?? undefined}
        />
      </div>

      {/* Min/max labels */}
      <div className="flex justify-between" style={{ marginTop: -4 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{def.minLabel}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 500 }}>{def.maxLabel}</span>
      </div>
    </div>
  );
}

/* ─── SleepHoursInput ─────────────────────────────────────────────────────────── */

function SleepHoursInput({
  value, onChange, lastKnown,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  lastKnown?: number | null;
}) {
  const hours = [4, 5, 6, 7, 8, 9, 10];
  return (
    <div className="flex flex-col gap-2 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
      <div className="flex items-center justify-between">
        <label
          className="font-semibold"
          style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}
        >
          Sleep duration
        </label>
        {lastKnown && !value && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Last: {lastKnown}h
          </span>
        )}
      </div>
      <div className="flex gap-1.5 mt-1">
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
              className="flex-1 flex items-center justify-center rounded-[var(--radius-sm)] py-2 transition-colors duration-150 cursor-pointer font-mono"
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: sel ? 700 : 500,
                background: sel ? "var(--bg-elevated)" : "transparent",
                border: `1.5px solid ${sel ? "var(--color-fitness)" : "var(--border-subtle)"}`,
                color: sel ? "var(--color-fitness)" : "var(--text-muted)",
                minHeight: 36,
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

/* ─── Step dots progress ──────────────────────────────────────────────────────── */

function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className="rounded-full transition-all duration-150"
          style={{
            width: s === current ? 16 : 6,
            height: 6,
            background: s === current
              ? "var(--color-accent)"
              : s < current
              ? "var(--border-default)"
              : "var(--border-subtle)",
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/* ─── Success state ───────────────────────────────────────────────────────────── */

function SuccessState({
  mood, sleepHours, fatigue, soreness,
  onReset,
}: {
  mood: MoodScore | null;
  sleepHours: number | null;
  fatigue: FatigueScore | null;
  soreness: FatigueScore | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-6 text-center">
      {/* Green checkmark circle */}
      <div
        className="flex items-center justify-center w-14 h-14 rounded-full"
        style={{ background: "var(--color-success)", opacity: 0.92 }}
      >
        <Check size={26} color="white" strokeWidth={2.5} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-bold" style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}>
          Check-in saved!
        </p>
        {mood && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {MOODS.find((m) => m.score === mood)?.emoji}{" "}
            {MOODS.find((m) => m.score === mood)?.label}
            {sleepHours != null ? ` · ${sleepHours}h sleep` : ""}
            {fatigue != null ? ` · Energy ${fatigue}/5` : ""}
            {soreness != null ? ` · Soreness ${soreness}/5` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────────── */

export interface WellnessCheckInProps {
  lastEntry?: WellnessEntry | null;
  onSuccess?: (entry: WellnessEntry) => void;
  date?: string;
}

export function WellnessCheckIn({ lastEntry, onSuccess, date }: WellnessCheckInProps) {
  const today = date ?? toLocalDateString(new Date());
  const isTodaysEntry = lastEntry?.date === today;

  const [step, setStep] = useState(1);

  const [mood, setMood]             = useState<MoodScore | null>(isTodaysEntry ? (lastEntry?.mood ?? null) : null);
  const [rpe, setRpe]               = useState<RpeScore | null>(isTodaysEntry ? (lastEntry?.rpe ?? null) : null);
  const [fatigue, setFatigue]       = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.fatigue ?? null) : null);
  const [sleepQuality, setSleepQ]   = useState<SleepQuality | null>(isTodaysEntry ? (lastEntry?.sleepQuality ?? null) : null);
  const [sleepHours, setSleepHours] = useState<number | null>(isTodaysEntry ? (lastEntry?.sleepHours ?? null) : null);
  const [soreness, setSoreness]     = useState<FatigueScore | null>(isTodaysEntry ? (lastEntry?.soreness ?? null) : null);
  const [motivation, setMotivation] = useState<number | null>(null);
  const [notes, setNotes]           = useState(isTodaysEntry ? (lastEntry?.notes ?? "") : "");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const hasAnyInput = mood || rpe || fatigue || sleepQuality || sleepHours || soreness || motivation || notes.trim();
  const last = isTodaysEntry ? null : lastEntry;

  // Auto-advance on mood selection
  const handleMoodSelect = useCallback((score: MoodScore) => {
    setMood(score);
    setTimeout(() => setStep(2), 220);
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

  const TOTAL_STEPS = 5;

  // Show success state after save — don't auto-reset, let user see it
  if (saved) {
    return (
      <SuccessState
        mood={mood}
        sleepHours={sleepHours}
        fatigue={fatigue}
        soreness={soreness}
        onReset={handleReset}
      />
    );
  }

  return (
    <>
      <style>{SLIDER_STYLE}</style>
      <div className="flex flex-col gap-4">

        {/* Progress header row */}
        <div className="flex items-center justify-between">
          <StepDots total={TOTAL_STEPS} current={step} />
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
            Step {step} of {TOTAL_STEPS}
          </span>
        </div>

        {/* Step content area — fixed min-height prevents layout jumps */}
        <div className="flex flex-col" style={{ minHeight: 200 }}>

          {/* ── Step 1: Mood ── */}
          {step === 1 && (
            <div>
              <p
                className="font-semibold text-center mb-5"
                style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}
              >
                How are you feeling today?
              </p>
              <div className="flex gap-2">
                {MOODS.map(({ score, emoji, label, color }) => {
                  const sel = mood === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => handleMoodSelect(score)}
                      aria-pressed={sel}
                      className="flex-1 flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] transition-colors duration-150 cursor-pointer"
                      style={{
                        height: 60,
                        background: sel
                          ? `color-mix(in srgb, ${color} 12%, var(--bg-elevated))`
                          : "var(--bg-elevated)",
                        border: `1.5px solid ${sel ? color : "var(--border-subtle)"}`,
                      }}
                    >
                      <span className="text-2xl leading-none">{emoji}</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: sel ? color : "var(--text-muted)",
                          fontWeight: sel ? 600 : 400,
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

          {/* ── Step 2: Energy & Effort ── */}
          {step === 2 && (
            <div>
              <p
                className="font-semibold text-center mb-3"
                style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}
              >
                Energy &amp; Effort
              </p>
              <SliderField
                id="rpe-slider"
                label="RPE — yesterday's effort"
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
          )}

          {/* ── Step 3: Sleep ── */}
          {step === 3 && (
            <div>
              <p
                className="font-semibold text-center mb-3"
                style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}
              >
                Sleep
              </p>
              <SliderField
                id="sleep-quality-slider"
                label="Sleep quality"
                def={SLEEP_DEF}
                value={sleepQuality}
                onChange={(v) => setSleepQ(v as SleepQuality)}
                lastKnown={last?.sleepQuality}
              />
              <SleepHoursInput
                value={sleepHours}
                onChange={setSleepHours}
                lastKnown={last?.sleepHours}
              />
            </div>
          )}

          {/* ── Step 4: Recovery & Mindset ── */}
          {step === 4 && (
            <div>
              <p
                className="font-semibold text-center mb-3"
                style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}
              >
                Recovery &amp; Mindset
              </p>
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
          )}

          {/* ── Step 5: Notes & Submit ── */}
          {step === 5 && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p
                className="font-semibold text-center"
                style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}
              >
                Any notes for your coach?
              </p>

              <div className="flex flex-col gap-1">
                <textarea
                  id="wellness-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Aches, illness, stress, anything relevant…"
                  maxLength={500}
                  rows={3}
                  className="w-full resize-none rounded-[var(--radius-md)] px-3 py-2.5 transition-colors duration-150"
                  style={{
                    background: "var(--bg-input)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.55,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
                />
                <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6, alignSelf: "flex-end" }}>
                  {notes.length}/500
                </span>
              </div>

              {error && (
                <div
                  className="rounded-[var(--radius-sm)] px-3 py-2 text-center"
                  style={{
                    background: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                    border: "1px solid var(--color-danger)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-danger)",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !hasAnyInput}
                className={clsx(
                  "flex items-center justify-center gap-2 w-full rounded-[var(--radius-md)] font-semibold transition-opacity duration-150 cursor-pointer",
                  "disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80",
                )}
                style={{
                  height: 44,
                  background: "var(--color-accent)",
                  color: "white",
                  fontSize: "var(--text-sm)",
                }}
              >
                {saving ? (
                  <><Loader2 size={15} className="animate-spin" /> Saving…</>
                ) : (
                  "Complete Check-in"
                )}
              </button>
            </form>
          )}
        </div>

        {/* ── Navigation ── */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          {/* Back */}
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 cursor-pointer transition-colors duration-150"
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 500,
                  color: "var(--text-muted)",
                  padding: "6px 4px",
                  minHeight: 36,
                }}
              >
                <ArrowLeft size={13} />
                Back
              </button>
            ) : (
              <div /> /* spacer */
            )}
          </div>

          {/* Right side: Skip (optional steps 2-4) + Next, or nothing on step 5 */}
          {step < 5 && (
            <div className="flex items-center gap-3">
              {/* Skip — text-only for optional steps */}
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="cursor-pointer transition-colors duration-150"
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-muted)",
                    padding: "6px 4px",
                    minHeight: 36,
                  }}
                >
                  Skip
                </button>
              )}

              {/* Next — secondary style */}
              {step === 1 && mood && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors duration-150"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    padding: "6px 14px",
                    minHeight: 36,
                  }}
                >
                  Next
                </button>
              )}

              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors duration-150"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    padding: "6px 14px",
                    minHeight: 36,
                  }}
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
