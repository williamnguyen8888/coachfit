"use client";
// src/components/wellness/WellnessPageClient.tsx

import React, { useState, useCallback } from "react";
import { useQuery } from "@/hooks/useQuery";
import { WellnessCheckIn } from "./WellnessCheckIn";
import { Skeleton } from "@/components/ui/Skeleton";
import { SmilePlus, Moon, Zap, Flame, Dumbbell, TrendingUp } from "lucide-react";
import type { WellnessEntry } from "@/lib/types/wellness";

/* ─── Color helpers ─────────────────────────────────────────────────────── */

const MOOD_EMOJIS: Record<number, string> = { 1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😁" };
const MOOD_LABELS: Record<number, string> = { 1: "Terrible", 2: "Poor", 3: "Okay", 4: "Good", 5: "Excellent" };

function fatigueColor(v: number) {
  return v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-form)";
}
function rpeColor(v: number) {
  return v <= 4 ? "var(--color-form)" : v <= 6 ? "var(--color-fatigue)" : "var(--color-danger)";
}
function moodColor(v: number) {
  return v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--text-secondary)" : v === 4 ? "var(--color-form)" : "var(--color-success)";
}

/* ─── Stat pill ─────────────────────────────────────────────────────────── */

function StatPill({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 rounded-[var(--radius-full)] px-3 py-1.5"
      style={{
        background: `color-mix(in srgb, ${color} 10%, var(--bg-elevated))`,
        border: `1px solid color-mix(in srgb, ${color} 22%, transparent)`,
      }}
    >
      <span style={{ color, opacity: 0.8 }}>{icon}</span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{label}</span>
      <span className="font-metric tabular-nums" style={{ fontSize: "var(--text-xs)", color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

/* ─── History row ─────────────────────────────────────────────────────── */

function HistoryRow({ entry, isLast }: { entry: WellnessEntry; isLast: boolean }) {
  const date = new Date(entry.date + "T00:00:00");
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" });
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const mood = entry.mood;
  const mc = mood ? moodColor(mood) : "var(--text-muted)";

  return (
    <div
      className="grid items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
      style={{
        gridTemplateColumns: "48px 28px 1fr",
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
      }}
    >
      {/* Date column */}
      <div className="flex flex-col">
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>
          {dayLabel}
        </span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 600, fontFamily: "var(--font-mono)", lineHeight: 1.4 }}>
          {dateLabel}
        </span>
      </div>

      {/* Mood emoji */}
      <span style={{ fontSize: 18, lineHeight: 1, color: mc }}>
        {mood ? MOOD_EMOJIS[mood] : <span style={{ opacity: 0.25 }}>–</span>}
      </span>

      {/* Pills */}
      <div className="flex flex-wrap gap-1.5 min-w-0">
        {entry.fatigue    && <StatPill icon={<Zap size={10} />}       label="Energy"   value={`${entry.fatigue}/5`}         color={fatigueColor(entry.fatigue)} />}
        {entry.rpe        && <StatPill icon={<Flame size={10} />}     label="RPE"      value={`${entry.rpe}/10`}            color={rpeColor(entry.rpe)} />}
        {entry.sleepHours && <StatPill icon={<Moon size={10} />}      label="Sleep"    value={`${entry.sleepHours}h`}       color="var(--color-fitness)" />}
        {entry.soreness   && <StatPill icon={<Dumbbell size={10} />}  label="Sore"     value={`${entry.soreness}/5`}        color={fatigueColor(entry.soreness)} />}
      </div>
    </div>
  );
}

/* ─── Date range helper ──────────────────────────────────────────────────── */

function getDateRange() {
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  return { from, to };
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export function WellnessPage() {
  const { from, to } = getDateRange();
  const [refreshKey, setRefreshKey] = useState(0);

  const wellnessQuery = useQuery<WellnessEntry[]>(
    `/wellness?from=${from}&to=${to}&_k=${refreshKey}`,
  );

  // Backend returns a raw array, not a paginated { content: [] } envelope
  const entries     = Array.isArray(wellnessQuery.data) ? wellnessQuery.data : [];
  const today       = new Date().toISOString().split("T")[0];
  const todayEntry  = entries.find((e) => e.date === today) ?? null;
  const lastKnown   = entries.find((e) => e.date !== today) ?? null;
  const history     = entries.filter((e) => e.date !== today).slice(0, 10);

  const handleSuccess = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* streak count */
  const streakCount = (() => {
    let streak = 0;
    const all = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    for (let i = 0; i < all.length; i++) {
      const expected = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
      if (all[i]?.date === expected) streak++;
      else break;
    }
    return streak;
  })();

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ paddingBottom: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      <div className="px-4 lg:px-6 py-5 max-w-2xl mx-auto flex flex-col gap-5">

        {/* ── Hero header ── */}
        <div
          className="relative overflow-hidden rounded-[var(--radius-xl)] p-5"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 18%, var(--bg-surface)) 0%, var(--bg-surface) 60%)",
            border: "1px solid color-mix(in srgb, var(--color-accent) 20%, var(--border-subtle))",
            boxShadow: "0 0 40px color-mix(in srgb, var(--color-accent) 8%, transparent)",
          }}
        >
          {/* bg orb */}
          <div
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 15%, transparent) 0%, transparent 70%)" }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SmilePlus size={16} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Wellness
                </span>
              </div>
              <h1
                className="font-bold tracking-tight"
                style={{ fontSize: "var(--text-2xl)", color: "var(--text-primary)", lineHeight: 1.2 }}
              >
                Daily Check-in
              </h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 4 }}>
                Track how you feel — your coach uses this to optimise load.
              </p>
            </div>

            {/* Streak badge */}
            {streakCount > 0 && (
              <div
                className="flex-shrink-0 flex flex-col items-center rounded-[var(--radius-lg)] px-3 py-2"
                style={{
                  background: "color-mix(in srgb, var(--color-success) 10%, var(--bg-elevated))",
                  border: "1px solid color-mix(in srgb, var(--color-success) 20%, transparent)",
                }}
              >
                <span style={{ fontSize: 18 }}>🔥</span>
                <span className="font-metric tabular-nums" style={{ fontSize: "var(--text-lg)", color: "var(--color-success)", fontWeight: 700, lineHeight: 1 }}>
                  {streakCount}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>streak</span>
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
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>— today</span>
            </div>
          )}
        </div>

        {/* ── Check-in form card ── */}
        <div
          className="rounded-[var(--radius-xl)] overflow-hidden"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {wellnessQuery.loading ? (
            <div className="flex flex-col gap-4 p-5">
              <Skeleton height="16px" width="40%" />
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="68px" className="flex-1" />)}
              </div>
              <Skeleton height="20px" />
              <Skeleton height="20px" />
              <Skeleton height="44px" />
            </div>
          ) : (
            <div className="p-5">
              <WellnessCheckIn
                lastEntry={todayEntry ?? lastKnown}
                onSuccess={handleSuccess}
              />
            </div>
          )}
        </div>

        {/* ── History ── */}
        {history.length > 0 && (
          <section aria-label="Recent wellness history">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} strokeWidth={1.75} style={{ color: "var(--color-accent)" }} />
              <h2 style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Recent History
              </h2>
            </div>
            <div
              className="rounded-[var(--radius-xl)] overflow-hidden"
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
            >
              {history.map((entry, i) => (
                <HistoryRow key={entry.date} entry={entry} isLast={i === history.length - 1} />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty history ── */}
        {!wellnessQuery.loading && history.length === 0 && !todayEntry && (
          <div
            className="flex flex-col items-center gap-3 py-8 rounded-[var(--radius-xl)]"
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
