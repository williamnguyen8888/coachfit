"use client";

/**
 * WellnessPageClient — daily wellness check-in page.
 * Mobile-first: people log wellness in the morning, on their phone.
 * Speed and clarity are the #1 priority.
 */

import React, { useState, useCallback } from "react";
import { useQuery } from "@/hooks/useQuery";
import { WellnessCheckIn } from "./WellnessCheckIn";
import { Skeleton } from "@/components/ui/Skeleton";
import type { WellnessEntry } from "@/lib/types/wellness";
import { addLocalDays, toLocalDateString } from "@/lib/utils";

/* ─── Mood helpers ───────────────────────────────────────────────────────────── */

const MOOD_EMOJIS: Record<number, string> = { 1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😁" };
const MOOD_LABELS: Record<number, string> = { 1: "Terrible", 2: "Poor", 3: "Okay", 4: "Good", 5: "Excellent" };

function moodColor(v: number): string {
  if (v <= 2) return "var(--color-danger)";
  if (v === 3) return "var(--text-secondary)";
  if (v === 4) return "var(--color-form)";
  return "var(--color-success)";
}

/* ─── History row ─────────────────────────────────────────────────────────────
   Clean data-dense row. No glassmorphism, no translate animation.
   Left: stacked day/date. Center: mood. Right: metric chips.
─────────────────────────────────────────────────────────────────────────────── */

function HistoryRow({ entry }: { entry: WellnessEntry }) {
  const date = new Date(entry.date + "T00:00:00");
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" });
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const mood = entry.mood;
  const mc = mood ? moodColor(mood) : "var(--text-muted)";

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors duration-150 hover:border-[var(--border-default)]"
    >
      {/* Date — stacked day abbrev + date */}
      <div className="flex flex-col items-center shrink-0 w-10 text-center">
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 600,
            lineHeight: 1,
          }}
        >
          {dayLabel}
        </span>
        <span
          className="font-mono tabular-nums mt-0.5"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 600, lineHeight: 1.3 }}
        >
          {dateLabel}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-7 bg-[var(--border-subtle)] shrink-0" aria-hidden="true" />

      {/* Mood */}
      <div className="flex items-center gap-1.5 min-w-[80px]">
        <span className="text-lg leading-none">
          {mood ? MOOD_EMOJIS[mood] : <span style={{ opacity: 0.2 }}>–</span>}
        </span>
        <span
          className="font-semibold truncate"
          style={{ fontSize: "var(--text-xs)", color: mc }}
        >
          {mood ? MOOD_LABELS[mood] : "—"}
        </span>
      </div>

      {/* Right: metric chips */}
      <div className="flex items-center gap-1.5 ml-auto flex-wrap justify-end">
        {entry.sleepHours != null && (
          <MetricChip label={`${entry.sleepHours}h`} title="Sleep" />
        )}
        {entry.fatigue != null && (
          <MetricChip label={`E${entry.fatigue}`} title="Energy" />
        )}
        {entry.soreness != null && (
          <MetricChip label={`S${entry.soreness}`} title="Soreness" />
        )}
      </div>
    </div>
  );
}

function MetricChip({ label, title }: { label: string; title: string }) {
  return (
    <span
      title={title}
      className="font-mono tabular-nums shrink-0"
      style={{
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        padding: "1px 5px",
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {label}
    </span>
  );
}

/* ─── Date range helper ───────────────────────────────────────────────────────── */

function getDateRange() {
  const to = toLocalDateString(new Date());
  const from = addLocalDays(to, -30);
  return { from, to };
}

/* ─── Today's status banner ──────────────────────────────────────────────────── */

function TodayStatus({
  todayEntry,
  streakCount,
  onEdit,
}: {
  todayEntry: WellnessEntry | null;
  streakCount: number;
  onEdit: () => void;
}) {
  const today = new Date();
  const dateStr = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        {/* Page title */}
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)", lineHeight: 1.2 }}
        >
          Wellness
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{dateStr}</p>
      </div>

      {/* Streak badge — inline, no animation */}
      {streakCount > 0 && (
        <div
          className="flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-[var(--radius-full)]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            fontSize: "var(--text-xs)",
            color: "var(--text-secondary)",
            fontWeight: 600,
          }}
        >
          <span>🔥</span>
          <span className="tabular-nums">{streakCount}</span>
          <span style={{ color: "var(--text-muted)" }}>day streak</span>
        </div>
      )}
    </div>
  );
}

/* ─── Checked-in summary row ─────────────────────────────────────────────────── */

function CheckedInSummary({
  entry,
  onEdit,
}: {
  entry: WellnessEntry;
  onEdit: () => void;
}) {
  const mood = entry.mood;
  const mc = mood ? moodColor(mood) : "var(--text-muted)";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)]"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Check mark */}
      <div
        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
        style={{ background: "var(--color-success)", opacity: 0.9 }}
        aria-hidden="true"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M2 6.5L5.5 10L11 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Mood + metrics */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {mood && (
            <>
              <span className="text-base leading-none">{MOOD_EMOJIS[mood]}</span>
              <span className="font-semibold" style={{ fontSize: "var(--text-sm)", color: mc }}>
                {MOOD_LABELS[mood]}
              </span>
            </>
          )}
          {entry.sleepHours != null && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              · {entry.sleepHours}h sleep
            </span>
          )}
          {entry.fatigue != null && (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
              · Energy {entry.fatigue}/5
            </span>
          )}
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
          Check-in done ✓
        </p>
      </div>

      {/* Edit button */}
      <button
        onClick={onEdit}
        className="shrink-0 px-3 py-1.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors duration-150"
        style={{
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--text-secondary)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
          minHeight: 32,
        }}
        aria-label="Edit today's check-in"
      >
        Edit
      </button>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────────── */

export function WellnessPage() {
  const { from, to } = getDateRange();
  const [refreshKey, setRefreshKey] = useState(0);

  const wellnessQuery = useQuery<WellnessEntry[]>(
    `/wellness?from=${from}&to=${to}&_k=${refreshKey}`,
  );

  const entries = React.useMemo(() => {
    return Array.isArray(wellnessQuery.data) ? wellnessQuery.data : [];
  }, [wellnessQuery.data]);

  const today      = toLocalDateString(new Date());
  const todayEntry = entries.find((e) => e.date === today) ?? null;
  const lastKnown  = entries.find((e) => e.date !== today) ?? null;
  const history    = entries.filter((e) => e.date !== today).slice(0, 14);

  // showForm: if already checked in, default collapsed (show summary); user can expand via Edit
  const [showForm, setShowForm] = useState(false);

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setShowForm(false);
  }, []);

  // Streak count
  const [streakCount, setStreakCount] = useState(0);
  React.useEffect(() => {
    let streak = 0;
    const all = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    for (let i = 0; i < all.length; i++) {
      const expected = addLocalDays(today, -i);
      if (all[i]?.date === expected) streak++;
      else break;
    }
    setStreakCount(streak);
  }, [entries, today]);

  // Determine form visibility:
  // - Not checked in today → always show form (no button click needed)
  // - Checked in today → show summary row; form appears when Edit is clicked
  const shouldShowForm = !todayEntry || showForm;

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        paddingBottom: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      {/* Max width container, mobile-first 16px sides */}
      <div
        className="mx-auto flex flex-col gap-5"
        style={{ maxWidth: 640, padding: "20px 16px 0" }}
      >
        {/* ── Page header ── */}
        <TodayStatus
          todayEntry={todayEntry}
          streakCount={streakCount}
          onEdit={() => setShowForm(true)}
        />

        {/* ── Loading skeleton ── */}
        {wellnessQuery.loading && (
          <div className="flex flex-col gap-3">
            <Skeleton height="44px" />
            <Skeleton height="220px" />
          </div>
        )}

        {/* ── Already checked in: compact summary + optional form ── */}
        {!wellnessQuery.loading && todayEntry && (
          <div className="flex flex-col gap-3">
            <CheckedInSummary
              entry={todayEntry}
              onEdit={() => setShowForm(true)}
            />
            {showForm && (
              <div
                className="rounded-[var(--radius-md)] overflow-hidden"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {/* Form header with cancel */}
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Edit Check-in
                  </span>
                  <button
                    onClick={() => setShowForm(false)}
                    className="cursor-pointer transition-colors duration-150"
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      padding: "4px 8px",
                      minHeight: 28,
                    }}
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </button>
                </div>
                <div className="p-4">
                  <WellnessCheckIn
                    lastEntry={todayEntry ?? lastKnown}
                    onSuccess={handleSuccess}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Not checked in today: show form immediately ── */}
        {!wellnessQuery.loading && !todayEntry && (
          <div
            className="rounded-[var(--radius-md)] overflow-hidden"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <p
                className="font-semibold"
                style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}
              >
                How are you feeling today?
              </p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                Takes 30 seconds · helps your coach adjust your training load.
              </p>
            </div>
            <div className="p-4">
              <WellnessCheckIn
                lastEntry={lastKnown}
                onSuccess={handleSuccess}
              />
            </div>
          </div>
        )}

        {/* ── History ── */}
        {history.length > 0 && (
          <section aria-label="Recent wellness history" className="flex flex-col gap-2.5">
            <h2
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                paddingBottom: 4,
              }}
            >
              Recent History
            </h2>
            <div className="flex flex-col gap-2">
              {history.map((entry) => (
                <HistoryRow key={entry.date} entry={entry} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {!wellnessQuery.loading && history.length === 0 && !todayEntry && (
          <div
            className="flex flex-col items-center gap-3 py-12 rounded-[var(--radius-lg)] text-center"
            style={{
              background: "var(--bg-surface)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: 32, opacity: 0.35 }}>📋</span>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", maxWidth: 240 }}>
              Your wellness history will appear here after your first check-in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
