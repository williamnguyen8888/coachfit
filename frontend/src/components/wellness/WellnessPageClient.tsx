"use client";
// src/components/wellness/WellnessPageClient.tsx
// Client orchestrator for the /wellness page.
// Fetches 30-day wellness history, passes today's / last known entry
// to WellnessCheckIn, and renders history below.

import React, { useState, useCallback } from "react";
import { useQuery } from "@/hooks/useQuery";
import { WellnessCheckIn } from "./WellnessCheckIn";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  SmilePlus,
  Moon,
  Zap,
  Flame,
  Dumbbell,
  Target,
} from "lucide-react";
import type { WellnessEntry } from "@/lib/types/wellness";

/* ─── Color helpers ─────────────────────────────────────────────────────── */

const MOOD_EMOJIS: Record<number, string> = { 1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😁" };

function fatigueColor(v: number): string {
  return v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--color-fatigue)" : "var(--color-form)";
}
function rpeColor(v: number): string {
  return v <= 4 ? "var(--color-form)" : v <= 6 ? "var(--color-fatigue)" : "var(--color-danger)";
}
function moodColor(v: number): string {
  return v <= 2 ? "var(--color-danger)" : v === 3 ? "var(--text-secondary)" : v === 4 ? "var(--color-form)" : "var(--color-success)";
}

/* ─── Chip ──────────────────────────────────────────────────────────────── */

function Chip({ color, label, value }: { color: string; label: string; value: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1 rounded-[var(--radius-full)] px-2 py-0.5"
      style={{
        background: `color-mix(in srgb, ${color} 12%, var(--bg-elevated))`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{label}</span>
      <span className="font-metric tabular-nums" style={{ fontSize: "var(--text-xs)", color, fontWeight: 700 }}>
        {value}
      </span>
    </div>
  );
}

/* ─── History row ────────────────────────────────────────────────────────── */

function HistoryRow({ entry }: { entry: WellnessEntry }) {
  const date = new Date(entry.date + "T00:00:00");
  const dayLabel = date.toLocaleDateString(undefined, { weekday: "short" });
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const dayNum = dateLabel.split(" ")[1];

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--bg-elevated)]"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Date */}
      <div className="flex flex-col items-center min-w-[32px]">
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {dayLabel}
        </span>
        <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
          {dayNum}
        </span>
      </div>

      {/* Mood emoji */}
      <span style={{ fontSize: 20, lineHeight: 1, marginTop: 3, minWidth: 22 }}>
        {entry.mood ? MOOD_EMOJIS[entry.mood] : <span style={{ opacity: 0.2 }}>–</span>}
      </span>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5 flex-1">
        {entry.fatigue    && <Chip color={fatigueColor(entry.fatigue)}           label="Energy"    value={`${entry.fatigue}/5`} />}
        {entry.rpe        && <Chip color={rpeColor(entry.rpe)}                   label="RPE"       value={`${entry.rpe}/10`} />}
        {entry.sleepHours && <Chip color="var(--color-fitness)"                  label="Sleep"     value={`${entry.sleepHours}h`} />}
        {entry.muscleSoreness && <Chip color={fatigueColor(entry.muscleSoreness)} label="Soreness" value={`${entry.muscleSoreness}/5`} />}
        {entry.motivation && <Chip color={moodColor(entry.motivation)}            label="Motiv."   value={`${entry.motivation}/5`} />}
      </div>

      {/* Notes snippet */}
      {entry.notes && (
        <span
          className="hidden sm:block max-w-[180px] truncate mt-1"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
          title={entry.notes}
        >
          "{entry.notes}"
        </span>
      )}
    </div>
  );
}

/* ─── Page client ─────────────────────────────────────────────────────────── */

function getDateRange() {
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  return { from, to };
}

export function WellnessPage() {
  const { from, to } = getDateRange();
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch last 30 days. Re-fetches when refreshKey increments.
  const wellnessQuery = useQuery<{ content: WellnessEntry[] }>(
    `/wellness?from=${from}&to=${to}&_k=${refreshKey}`,
  );

  const entries = wellnessQuery.data?.content ?? [];
  const today = new Date().toISOString().split("T")[0];
  const todayEntry = entries.find((e) => e.date === today) ?? null;
  const lastKnownEntry = entries.find((e) => e.date !== today) ?? null;
  const history = entries.filter((e) => e.date !== today).slice(0, 14);

  const handleSuccess = useCallback(() => setRefreshKey((k) => k + 1), []);

  return (
    <div className="px-3 lg:px-6 py-4 pb-safe max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: "var(--text-2xl)", color: "var(--text-primary)" }}
        >
          Wellness Check-in
        </h1>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginTop: 4 }}>
          Track how you feel each day. Your coach and training algorithm use this data to keep load appropriate.
        </p>
      </div>

      {/* Metric legend — desktop */}
      <div
        className="hidden sm:flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[var(--radius-md)] px-4 py-3 mb-5"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        {[
          { icon: <SmilePlus size={13} strokeWidth={1.75} />, label: "Mood", desc: "1–5" },
          { icon: <Flame size={13} strokeWidth={1.75} />,    label: "RPE", desc: "effort 1–10" },
          { icon: <Zap size={13} strokeWidth={1.75} />,      label: "Energy", desc: "5=fresh" },
          { icon: <Moon size={13} strokeWidth={1.75} />,     label: "Sleep", desc: "hours + quality" },
          { icon: <Dumbbell size={13} strokeWidth={1.75} />, label: "Soreness", desc: "5=none" },
          { icon: <Target size={13} strokeWidth={1.75} />,   label: "Motivation", desc: "1–5" },
        ].map(({ icon, label, desc }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span style={{ color: "var(--color-accent)" }}>{icon}</span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>({desc})</span>
          </div>
        ))}
      </div>

      {/* Form card */}
      <div
        className="rounded-[var(--radius-xl)] p-5 mb-6"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-surface) 0%, color-mix(in srgb, var(--color-accent) 5%, var(--bg-surface)) 100%)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        {wellnessQuery.loading ? (
          <div className="flex flex-col gap-5">
            <Skeleton height="20px" width="45%" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height="76px" className="flex-1" />)}
            </div>
            <Skeleton height="22px" />
            <Skeleton height="24px" />
            <Skeleton height="44px" />
          </div>
        ) : (
          <WellnessCheckIn
            lastEntry={todayEntry ?? lastKnownEntry}
            onSuccess={handleSuccess}
          />
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <section aria-label="Wellness history (last 14 days)">
          <h2
            className="mb-3"
            style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)" }}
          >
            Recent history
          </h2>
          <div
            className="rounded-[var(--radius-xl)] overflow-hidden"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            {history.map((entry) => (
              <HistoryRow key={entry.date} entry={entry} />
            ))}
          </div>
        </section>
      )}

      {/* Empty history */}
      {!wellnessQuery.loading && history.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 py-10 rounded-[var(--radius-xl)]"
          style={{ background: "var(--bg-surface)", border: "1px dashed var(--border-default)" }}
        >
          <span style={{ fontSize: 40 }}>📋</span>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", textAlign: "center", maxWidth: 280 }}>
            Your wellness history will appear here once you log a few check-ins.
          </p>
        </div>
      )}
    </div>
  );
}
