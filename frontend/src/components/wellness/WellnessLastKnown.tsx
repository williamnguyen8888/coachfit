"use client";
// src/components/wellness/WellnessLastKnown.tsx
// Compact card showing the last submitted wellness entry.
// Displayed on the dashboard as a quick status overview + CTA to check in today.

import React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  SmilePlus,
  Moon,
  Zap,
  Flame,
  ChevronRight,
  PlusCircle,
  ClipboardList,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WellnessEntry } from "@/lib/types/wellness";
import { addLocalDays, toLocalDateString } from "@/lib/utils";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const MOOD_EMOJIS: Record<number, string> = { 1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😁" };
const MOOD_LABELS: Record<number, string> = { 1: "Terrible", 2: "Poor", 3: "Okay", 4: "Good", 5: "Excellent" };

function moodColor(score: number): string {
  if (score <= 1) return "var(--color-danger)";
  if (score === 2) return "var(--color-fatigue)";
  if (score === 3) return "var(--text-secondary)";
  if (score === 4) return "var(--color-form)";
  return "var(--color-success)";
}

function fatigueColor(score: number): string {
  if (score <= 2) return "var(--color-danger)";
  if (score === 3) return "var(--color-fatigue)";
  return "var(--color-success)";
}

function rpeColor(score: number): string {
  if (score <= 4) return "var(--color-success)";
  if (score <= 6) return "var(--color-fatigue)";
  if (score <= 8) return "var(--color-warning)";
  return "var(--color-danger)";
}

function formatRelativeDate(dateStr: string): string {
  const today = toLocalDateString(new Date());
  const yesterday = addLocalDays(today, -1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ─── Metric chip ────────────────────────────────────────────────────────── */

function MetricChip({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[var(--radius-lg)] px-3 py-2.5 flex-1 border transition-all duration-[var(--duration-micro)] hover:scale-[1.02]"
      style={{
        background: `linear-gradient(135deg, var(--bg-elevated) 0%, color-mix(in srgb, ${color} 6%, var(--bg-elevated)) 100%)`,
        borderColor: `color-mix(in srgb, ${color} 15%, var(--border-subtle))`,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>{label}</span>
      </div>
      <span className="font-metric tabular-nums font-bold" style={{ fontSize: "var(--text-base)", color, fontWeight: 700, marginTop: 1 }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */

export function WellnessLastKnownSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-5 flex flex-col gap-4 glass-card"
    >
      <div className="flex items-center justify-between">
        <Skeleton width="45%" height="20px" />
        <Skeleton width="20%" height="14px" />
      </div>
      <div className="flex gap-2.5">
        <Skeleton height="60px" className="flex-1 rounded-[var(--radius-lg)]" />
        <Skeleton height="60px" className="flex-1 rounded-[var(--radius-lg)]" />
        <Skeleton height="60px" className="flex-1 rounded-[var(--radius-lg)]" />
      </div>
      <Skeleton height="36px" className="rounded-[var(--radius-md)]" />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

interface WellnessLastKnownProps {
  entry: WellnessEntry | null;
  hasCheckedInToday?: boolean;
  className?: string;
}

export function WellnessLastKnown({ entry, hasCheckedInToday, className }: WellnessLastKnownProps) {
  const today = toLocalDateString(new Date());
  const isToday = entry?.date === today;

  return (
    <div
      className={clsx("rounded-[var(--radius-xl)] p-5 flex flex-col gap-4 glass-card", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
            Wellness Biofeedback
          </span>
          {entry && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase text-glow"
              style={{
                color: isToday ? "var(--color-success)" : "var(--text-muted)",
                background: isToday ? "var(--color-success-8)" : "var(--bg-elevated)",
                border: `1px solid ${isToday ? "rgba(34, 197, 94, 0.15)" : "var(--border-subtle)"}`,
              }}
            >
              {formatRelativeDate(entry.date)}
            </span>
          )}
        </div>
        {entry && (
          <span style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            {entry.source === "manual" ? "Self-Report" : entry.source}
          </span>
        )}
      </div>

      {/* No entry state */}
      {!entry ? (
        <div
          className="flex flex-col items-center gap-2 py-6 rounded-[var(--radius-lg)] border border-dashed border-[var(--border-default)]"
          style={{ background: "rgba(0,0,0,0.1)" }}
        >
          <span style={{ fontSize: 32 }} className="animate-pulse">📝</span>
          <div className="text-center">
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
              No check-in recorded today
            </span>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
              Log your mood, fatigue, and recovery to keep your coach informed.
            </p>
          </div>
        </div>
      ) : (
        /* Metric chips */
        <div className="flex gap-2.5">
          {entry.mood && (
            <MetricChip
              icon={<SmilePlus size={12} strokeWidth={2} />}
              label="Mood State"
              value={
                <span className="flex items-center gap-1.5 font-bold" style={{ fontSize: "var(--text-sm)" }}>
                  <span style={{ fontSize: "var(--text-lg)" }}>{MOOD_EMOJIS[entry.mood]}</span>
                  {MOOD_LABELS[entry.mood]}
                </span>
              }
              color={moodColor(entry.mood)}
            />
          )}
          {entry.fatigue && (
            <MetricChip
              icon={<Zap size={12} strokeWidth={2} />}
              label="Energy Level"
              value={`${entry.fatigue} / 5`}
              color={fatigueColor(entry.fatigue)}
            />
          )}
          {entry.rpe && (
            <MetricChip
              icon={<Flame size={12} strokeWidth={2} />}
              label="RPE (Stress)"
              value={`${entry.rpe} / 10`}
              color={rpeColor(entry.rpe)}
            />
          )}
          {entry.sleepHours && !entry.rpe && (
            <MetricChip
              icon={<Moon size={12} strokeWidth={2} />}
              label="Sleep Duration"
              value={`${entry.sleepHours}h`}
              color="var(--color-fitness)"
            />
          )}
        </div>
      )}

      {/* Wellness Notes Section */}
      {entry?.notes && (
        <div 
          className="rounded-[var(--radius-sm)] px-3 py-2.5 border border-[var(--border-subtle)] text-xs relative overflow-hidden" 
          style={{ background: "rgba(0,0,0,0.15)" }}
        >
          <div style={{ color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.02em" }}>
            Athlete's Log Notes
          </div>
          <p className="mt-1 font-medium" style={{ color: "var(--text-secondary)", lineHeight: 1.4 }} title={entry.notes}>
            "{entry.notes}"
          </p>
        </div>
      )}

      {/* CTA Button */}
      <Link
        href="/wellness"
        id="wellness-checkin-cta"
        className={clsx(
          "flex items-center justify-center gap-2 w-full h-10 rounded-[var(--radius-md)] font-semibold transition-all duration-200",
          "active:scale-[0.98] select-none cursor-pointer border",
        )}
        style={{
          background: hasCheckedInToday
            ? "var(--bg-elevated)"
            : "linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)",
          color: hasCheckedInToday ? "var(--text-secondary)" : "white",
          fontSize: "var(--text-sm)",
          borderColor: hasCheckedInToday ? "var(--border-subtle)" : "rgba(255,255,255,0.08)",
          boxShadow: hasCheckedInToday ? "none" : "var(--shadow-glow), 0 4px 12px rgba(124, 58, 237, 0.2)",
        }}
      >
        {hasCheckedInToday ? (
          <>
            <ChevronRight size={14} strokeWidth={2.5} />
            Modify today's check-in
          </>
        ) : (
          <>
            <PlusCircle size={14} strokeWidth={2.5} />
            Complete Wellness Check-in
          </>
        )}
      </Link>
    </div>
  );
}
