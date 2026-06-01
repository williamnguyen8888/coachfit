"use client";

/**
 * WellnessPageClient — page for daily wellness check-ins.
 * Aggregates statistics, displays daily log streak, and shows recent logs.
 */

import React, { useState, useCallback } from "react";
import { useQuery } from "@/hooks/useQuery";
import { WellnessCheckIn } from "./WellnessCheckIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { SmilePlus, TrendingUp } from "lucide-react";
import type { WellnessEntry } from "@/lib/types/wellness";
import { addLocalDays, toLocalDateString } from "@/lib/utils";

/* ─── Color helpers ─────────────────────────────────────────────────────── */

const MOOD_EMOJIS: Record<number, string> = { 1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😁" };
const MOOD_LABELS: Record<number, string> = { 1: "Terrible", 2: "Poor", 3: "Okay", 4: "Good", 5: "Excellent" };

function moodColor(v: number) {
  return v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--text-secondary)" : v === 4 ? "var(--color-form)" : "var(--color-success)";
}

/* ─── History row ─────────────────────────────────────────────────────── */

function HistoryRow({ entry }: { entry: WellnessEntry }) {
  const date = new Date(entry.date + "T00:00:00");
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" });
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const mood = entry.mood;
  const mc = mood ? moodColor(mood) : "var(--text-muted)";

  const details: string[] = [];
  if (entry.fatigue) details.push(`Energy ${entry.fatigue}/5`);
  if (entry.sleepHours) details.push(`Sleep ${entry.sleepHours}h`);
  if (entry.soreness) details.push(`Soreness ${entry.soreness}/5`);
  if (entry.rpe) details.push(`RPE ${entry.rpe}/10`);

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-default)]"
      style={{
        background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.3) 100%)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Left side: Date & Mood */}
      <div className="flex items-center gap-3">
        {/* Date */}
        <div className="flex flex-col shrink-0 min-w-[55px]">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1, fontWeight: 600 }}>
            {dayLabel}
          </span>
          <span className="font-mono font-bold mt-1 leading-none" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {dateLabel}
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] h-6 bg-[var(--border-subtle)]" aria-hidden="true" />

        {/* Mood info */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl leading-none shrink-0">
            {mood ? MOOD_EMOJIS[mood] : <span style={{ opacity: 0.25 }}>–</span>}
          </span>
          <span 
            className="text-xs font-semibold truncate" 
            style={{ color: mc }}
          >
            {mood ? MOOD_LABELS[mood] : "No mood logged"}
          </span>
        </div>
      </div>

      {/* Right side: Minimalist text summary list */}
      {details.length > 0 && (
        <div className="font-mono text-xs tabular-nums text-[var(--text-secondary)] tracking-tight font-medium">
          {details.join("   ·   ")}
        </div>
      )}
    </div>
  );
}

/* ─── Date range helper ──────────────────────────────────────────────────── */

function getDateRange() {
  const to = toLocalDateString(new Date());
  const from = addLocalDays(to, -30);
  return { from, to };
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export function WellnessPage() {
  const { from, to } = getDateRange();
  const [refreshKey, setRefreshKey] = useState(0);

  const wellnessQuery = useQuery<WellnessEntry[]>(
    `/wellness?from=${from}&to=${to}&_k=${refreshKey}`,
  );

  // Backend returns a raw array
  const entries = React.useMemo(() => {
    return Array.isArray(wellnessQuery.data) ? wellnessQuery.data : [];
  }, [wellnessQuery.data]);

  const today       = toLocalDateString(new Date());
  const todayEntry  = entries.find((e) => e.date === today) ?? null;
  const lastKnown   = entries.find((e) => e.date !== today) ?? null;
  const history     = entries.filter((e) => e.date !== today).slice(0, 10);

  const [showForm, setShowForm] = useState(false);
  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setShowForm(false);
  }, []);

  /* streak count */
  const [streakCount, setStreakCount] = useState(0);

  React.useEffect(() => {
    let streak = 0;
    const all = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    for (let i = 0; i < all.length; i++) {
      const expected = addLocalDays(today, -i);
      if (all[i]?.date === expected) streak++;
      else break;
    }
    const t = setTimeout(() => setStreakCount(streak), 0);
    return () => clearTimeout(t);
  }, [entries, today]);

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ paddingBottom: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      <div className="px-4 lg:px-6 py-5 max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Hero header ── */}
        <div
          className="relative overflow-hidden rounded-[var(--radius-xl)] p-5 border shadow-lg"
          style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(10, 10, 15, 0.8) 100%)",
            borderColor: "rgba(139, 92, 246, 0.25)",
            boxShadow: "0 8px 32px rgba(139, 92, 246, 0.1)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {/* bg orb */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%)" }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SmilePlus size={16} strokeWidth={2} style={{ color: "var(--color-accent)" }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Wellness Check-in
                </span>
              </div>
              <h1
                className="font-bold tracking-tight"
                style={{ fontSize: "var(--text-2xl)", color: "var(--text-primary)", lineHeight: 1.2 }}
              >
                How are you today?
              </h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 4 }}>
                Track how you feel so your coach can optimize your training load.
              </p>
            </div>

            {/* Streak badge */}
            {streakCount > 0 && (
              <div
                className="flex-shrink-0 flex flex-col items-center rounded-[var(--radius-lg)] px-3 py-1.5"
                style={{
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  animation: "todayGlow 3s ease-in-out infinite",
                }}
              >
                <span style={{ fontSize: 18 }}>🔥</span>
                <span className="font-metric tabular-nums" style={{ fontSize: "var(--text-lg)", color: "var(--color-success)", fontWeight: 700, lineHeight: 1 }}>
                  {streakCount}
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>streak</span>
              </div>
            )}
          </div>

          {/* Today mood snapshot */}
          {todayEntry?.mood && (
            <div className="relative flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <span style={{ fontSize: 20 }}>{MOOD_EMOJIS[todayEntry.mood]}</span>
              <span style={{ fontSize: "var(--text-sm)", color: moodColor(todayEntry.mood), fontWeight: 600 }}>
                {MOOD_LABELS[todayEntry.mood]}
              </span>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>— logged today</span>
            </div>
          )}
        </div>

        {/* ── Check-in form card ── */}
        <div
          className="rounded-[var(--radius-xl)] overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-[var(--shadow-sm)]"
        >
          {wellnessQuery.loading ? (
            <div className="flex flex-col gap-4 p-5">
              <Skeleton height="32px" />
            </div>
          ) : !showForm ? (
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {todayEntry ? (
                <>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-[var(--text-primary)]" style={{ fontSize: "var(--text-base)" }}>
                      Today&apos;s Check-in Completed
                    </h3>
                    <p className="text-[var(--text-muted)] text-xs">
                      Mood: {MOOD_EMOJIS[todayEntry.mood ?? 3]} {MOOD_LABELS[todayEntry.mood ?? 3]}
                      {todayEntry.sleepHours ? `  ·  Sleep: ${todayEntry.sleepHours}h` : ""}
                      {todayEntry.fatigue ? `  ·  Energy: ${todayEntry.fatigue}/5` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.06)] text-[var(--text-primary)] text-xs font-semibold cursor-pointer transition-all shrink-0"
                  >
                    Edit check-in
                  </button>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-[var(--text-primary)]" style={{ fontSize: "var(--text-base)" }}>
                      Daily Wellness Check-in
                    </h3>
                    <p className="text-[var(--text-muted)] text-xs">
                      Take 30 seconds to log your mood, sleep, and energy levels.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] hover:opacity-90 text-white text-xs font-semibold cursor-pointer transition-all shadow-[0_2px_8px_rgba(139,92,246,0.2)] shrink-0"
                  >
                    Start Check-in
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider">Log Wellness</span>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <WellnessCheckIn
                lastEntry={todayEntry ?? lastKnown}
                onSuccess={handleSuccess}
              />
            </div>
          )}
        </div>

        {/* ── History ── */}
        {history.length > 0 && (
          <section aria-label="Recent wellness history" className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
              <h2 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recent History
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {history.map((entry) => (
                <HistoryRow key={entry.date} entry={entry} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty history ── */}
        {!wellnessQuery.loading && history.length === 0 && !todayEntry && (
          <div
            className="flex flex-col items-center gap-3 py-10 rounded-[var(--radius-xl)]"
            style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-default)" }}
          >
            <span style={{ fontSize: 36, opacity: 0.5 }}>📋</span>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", textAlign: "center", maxWidth: 260 }}>
              Your wellness history will appear here once you log a few check-ins.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
