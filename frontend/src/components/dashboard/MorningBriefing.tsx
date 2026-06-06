"use client";
// src/components/dashboard/MorningBriefing.tsx
// Greeting card + today's workout + week progress pill.

import React from "react";
import { clsx } from "clsx";
import {
  Bike,
  Footprints,
  Waves,
  Dumbbell,
  Activity,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DashboardToday } from "@/lib/types/dashboard";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function SportIcon({ sport, size = 20 }: { sport: string; size?: number }) {
  const props = { size, strokeWidth: 1.75 };
  switch (sport) {
    case "cycling": return <Bike {...props} />;
    case "running": return <Footprints {...props} />;
    case "swimming": return <Waves {...props} />;
    case "strength": return <Dumbbell {...props} />;
    default: return <Activity {...props} />;
  }
}

function sportColor(sport: string): string {
  const map: Record<string, string> = {
    cycling: "var(--sport-cycling)",
    running: "var(--sport-running)",
    swimming: "var(--sport-swimming)",
    strength: "var(--sport-strength)",
  };
  return map[sport] ?? "var(--sport-other)";
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/* ─── WorkoutCard ─────────────────────────────────────────────────────── */

function WorkoutCard({ workout }: { workout: DashboardToday["todayWorkout"] }) {
  if (!workout) {
    return (
      <div
        className="flex items-center gap-3 rounded-[var(--radius-md)] p-4 glass-card"
        style={{ borderStyle: "dashed" }}
      >
        <div className="rounded-[var(--radius-sm)] p-2 bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          <CalendarDays size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
            No scheduled session
          </span>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
            Keep the day open for recovery or manual planning.
          </p>
        </div>
      </div>
    );
  }

  const color = sportColor(workout.sport);
  const durationMin = workout.estimatedDuration ? Math.round(workout.estimatedDuration / 60) : 60;
  const estTss = Math.round((durationMin / 60) * 65);

  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-md)] p-4 glass-card"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 rounded-[var(--radius-sm)] p-2.5 flex items-center justify-center"
            style={{ background: "var(--bg-elevated)", color }}
          >
            <SportIcon sport={workout.sport} size={18} />
          </div>
          <div className="min-w-0">
            <span style={{ fontSize: "var(--text-xs)", color, fontWeight: 600 }}>
              {workout.sport.charAt(0).toUpperCase() + workout.sport.slice(1)}
            </span>
            <h3
              className="truncate font-semibold tracking-tight mt-0.5"
              style={{ fontSize: "var(--text-base)", color: "var(--text-primary)" }}
            >
              {workout.title}
            </h3>
          </div>
        </div>

        {workout.status === "completed" ? (
          <span
            className="status-badge"
            style={{
              background: "var(--color-success-8)",
              color: "var(--color-success)",
              border: "1px solid var(--color-success-15)",
            }}
          >
            <CheckCircle2 size={11} />
            Completed
          </span>
        ) : (
          <span
            className="status-badge"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            Planned
          </span>
        )}
      </div>

      {/* Workout stats — plain text, no icons */}
      <div
        className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex flex-col">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Type</span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
            {workout.sport.charAt(0).toUpperCase() + workout.sport.slice(1)}
          </span>
        </div>
        <div className="flex items-center gap-5 flex-shrink-0">
          {workout.estimatedDuration && (
            <div className="flex flex-col items-end">
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Duration</span>
              <span className="font-metric font-semibold" style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                {formatDuration(workout.estimatedDuration)}
              </span>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Est. TSS</span>
            <span className="font-metric font-semibold" style={{ fontSize: "var(--text-sm)", color: "var(--color-fatigue)" }}>
              {estTss}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── WeekProgressBar ─────────────────────────────────────────────────── */

function WeekProgressBar({ weekProgress }: { weekProgress: DashboardToday["weekProgress"] }) {
  if (!weekProgress) return null;
  const pct = Math.min(weekProgress.percentage, 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="section-label">Weekly target</span>
        <span
          className="font-metric font-bold"
          style={{
            fontSize: "var(--text-sm)",
            color: pct >= 80 ? "var(--color-success)" : "var(--text-primary)",
          }}
        >
          {(weekProgress.completedHours ?? 0).toFixed(1)}h{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            / {(weekProgress.plannedHours ?? 0).toFixed(1)}h
          </span>
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 4, background: "var(--border-subtle)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background:
              pct >= 80
                ? "var(--color-success)"
                : pct >= 50
                ? "var(--color-accent)"
                : "var(--color-fatigue)",
          }}
        />
      </div>
      <div className="flex justify-end">
        <span style={{ fontSize: "11px", color: pct >= 80 ? "var(--color-success)" : "var(--text-muted)", fontWeight: 500 }}>
          {pct}% complete
        </span>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────── */

export function MorningBriefingSkeleton() {
  return (
    <div className="rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card">
      <div className="flex flex-col gap-1">
        <Skeleton width="45%" height="32px" />
        <Skeleton width="65%" height="16px" />
      </div>
      <Skeleton height="110px" className="rounded-[var(--radius-md)]" />
      <Skeleton height="35px" />
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

interface Props {
  data: DashboardToday;
  className?: string;
}

export function MorningBriefing({ data, className }: Props) {
  const tod = getTimeOfDay();
  const parts = (data.greeting ?? "").split(",");
  const firstName = parts.length > 1 ? (parts[1]?.trim().replace("!", "") ?? "") : "";
  const greeting = `Good ${tod}${firstName ? `, ${firstName}` : ""}`;

  return (
    <div
      className={clsx(
        "rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card",
        className
      )}
    >
      {/* Greeting */}
      <div>
        <h1
          className="font-semibold tracking-tight"
          style={{ fontSize: "var(--text-2xl)", color: "var(--text-primary)", lineHeight: 1.15 }}
        >
          {greeting}
        </h1>
        <p
          className="mt-1"
          style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 400 }}
        >
          {data.weekProgress
            ? `${data.weekProgress.percentage}% of planned volume complete this week.`
            : "Training status and today's plan are ready."}
        </p>
      </div>

      {/* Today's session */}
      <div className="flex flex-col gap-2">
        <span className="section-label">Today</span>
        <WorkoutCard workout={data.todayWorkout} />
      </div>

      {/* Weekly progress */}
      <WeekProgressBar weekProgress={data.weekProgress} />
    </div>
  );
}
