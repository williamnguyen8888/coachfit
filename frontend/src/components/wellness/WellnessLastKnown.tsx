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
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WellnessEntry } from "@/lib/types/wellness";

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
  return "var(--color-form)";
}

function rpeColor(score: number): string {
  if (score <= 4) return "var(--color-form)";
  if (score <= 6) return "var(--color-fatigue)";
  if (score <= 8) return "var(--color-warning)";
  return "var(--color-danger)";
}

function formatRelativeDate(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
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
      className="flex flex-col gap-1 rounded-[var(--radius-sm)] px-3 py-2 flex-1"
      style={{
        background: `color-mix(in srgb, ${color} 8%, var(--bg-elevated))`,
        border: `1px solid color-mix(in srgb, ${color} 20%, var(--border-subtle))`,
      }}
    >
      <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
        {icon}
        <span style={{ fontSize: "var(--text-xs)" }}>{label}</span>
      </div>
      <span className="font-metric tabular-nums" style={{ fontSize: "var(--text-lg)", color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */

export function WellnessLastKnownSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <Skeleton width="45%" height="18px" />
        <Skeleton width="20%" height="14px" />
      </div>
      <div className="flex gap-2">
        <Skeleton height="56px" className="flex-1" />
        <Skeleton height="56px" className="flex-1" />
        <Skeleton height="56px" className="flex-1" />
      </div>
      <Skeleton height="36px" />
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

interface WellnessLastKnownProps {
  entry: WellnessEntry | null;
  /** True when today already has an entry */
  hasCheckedInToday?: boolean;
  className?: string;
}

export function WellnessLastKnown({ entry, hasCheckedInToday, className }: WellnessLastKnownProps) {
  const today = new Date().toISOString().split("T")[0];
  const isToday = entry?.date === today;

  return (
    <div
      className={clsx("rounded-[var(--radius-xl)] p-4 flex flex-col gap-3", className)}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SmilePlus size={16} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
            Wellness
          </span>
          {entry && (
            <span
              className="rounded-[var(--radius-full)] px-2 py-0.5"
              style={{
                fontSize: "var(--text-xs)",
                color: isToday ? "var(--color-success)" : "var(--text-muted)",
                background: isToday ? "color-mix(in srgb, var(--color-success) 12%, var(--bg-elevated))" : "var(--bg-elevated)",
                border: `1px solid ${isToday ? "color-mix(in srgb, var(--color-success) 25%, transparent)" : "var(--border-subtle)"}`,
              }}
            >
              {formatRelativeDate(entry.date)}
            </span>
          )}
        </div>
        {entry && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {entry.source === "manual" ? "Manual" : entry.source}
          </span>
        )}
      </div>

      {/* No entry state */}
      {!entry ? (
        <div
          className="flex flex-col items-center gap-2 py-4 rounded-[var(--radius-md)]"
          style={{ background: "var(--bg-elevated)", border: "1px dashed var(--border-default)" }}
        >
          <span style={{ fontSize: 28 }}>📋</span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            No wellness data yet
          </span>
        </div>
      ) : (
        /* Metric chips */
        <div className="flex gap-2">
          {entry.mood && (
            <MetricChip
              icon={<SmilePlus size={11} strokeWidth={1.75} />}
              label="Mood"
              value={
                <span style={{ fontSize: "var(--text-xl)" }}>
                  {MOOD_EMOJIS[entry.mood]}
                </span>
              }
              color={moodColor(entry.mood)}
            />
          )}
          {entry.fatigue && (
            <MetricChip
              icon={<Zap size={11} strokeWidth={1.75} />}
              label="Energy"
              value={`${entry.fatigue}/5`}
              color={fatigueColor(entry.fatigue)}
            />
          )}
          {entry.rpe && (
            <MetricChip
              icon={<Flame size={11} strokeWidth={1.75} />}
              label="RPE"
              value={`${entry.rpe}/10`}
              color={rpeColor(entry.rpe)}
            />
          )}
          {entry.sleepHours && !entry.rpe && (
            <MetricChip
              icon={<Moon size={11} strokeWidth={1.75} />}
              label="Sleep"
              value={`${entry.sleepHours}h`}
              color="var(--color-fitness)"
            />
          )}
        </div>
      )}

      {/* Mood label row */}
      {entry?.mood && (
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            Feeling:
          </span>
          <span style={{ fontSize: "var(--text-xs)", color: moodColor(entry.mood), fontWeight: 500 }}>
            {MOOD_LABELS[entry.mood]}
          </span>
          {entry.notes && (
            <>
              <span style={{ color: "var(--border-default)" }}>·</span>
              <span
                className="truncate"
                style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", maxWidth: "60%" }}
                title={entry.notes}
              >
                {entry.notes}
              </span>
            </>
          )}
        </div>
      )}

      {/* CTA */}
      <Link
        href="/wellness"
        id="wellness-checkin-cta"
        className={clsx(
          "flex items-center justify-center gap-2 w-full h-9 rounded-[var(--radius-md)] font-medium transition-all duration-150",
          "hover:brightness-110 active:scale-[0.98]",
        )}
        style={{
          background: hasCheckedInToday
            ? "var(--bg-elevated)"
            : "var(--color-accent)",
          color: hasCheckedInToday ? "var(--text-secondary)" : "white",
          fontSize: "var(--text-sm)",
          border: hasCheckedInToday ? "1px solid var(--border-subtle)" : "none",
          boxShadow: hasCheckedInToday ? "none" : "var(--shadow-glow)",
        }}
      >
        {hasCheckedInToday ? (
          <>
            <ChevronRight size={14} strokeWidth={2} />
            Edit today's check-in
          </>
        ) : (
          <>
            <PlusCircle size={14} strokeWidth={2} />
            Check in now
          </>
        )}
      </Link>
    </div>
  );
}
