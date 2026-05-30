"use client";
// src/components/dashboard/MorningBriefing.tsx
// Greeting card + today's workout + week progress pill.
// Mobile: full-width hero. Desktop: stays compact, no duplication.

import React from "react";
import { clsx } from "clsx";
import {
  Bike,
  Footprints,
  Waves,
  Dumbbell,
  Activity,
  CheckCircle2,
  Clock,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DashboardToday } from "@/lib/types/dashboard";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function SportIcon({ sport, size = 20 }: { sport: string; size?: number }) {
  const props = { size, strokeWidth: 1.75 };
  switch (sport) {
    case "cycling":
      return <Bike {...props} />;
    case "running":
      return <Footprints {...props} />;
    case "swimming":
      return <Waves {...props} />;
    case "strength":
      return <Dumbbell {...props} />;
    default:
      return <Activity {...props} />;
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

/* ─── sub-components ─────────────────────────────────────────────────── */

function WorkoutPill({
  workout,
}: {
  workout: DashboardToday["todayWorkout"];
}) {
  if (!workout) {
    return (
      <div
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <CalendarDays
          size={15}
          style={{ color: "var(--text-muted)" }}
          strokeWidth={1.75}
        />
        <span
          style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}
        >
          Rest day — no workout scheduled
        </span>
      </div>
    );
  }

  const color = sportColor(workout.sport);

  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 transition-all duration-[var(--duration-micro)] hover:brightness-110 cursor-pointer"
      style={{
        background: "var(--bg-elevated)",
        border: `1px solid var(--border-subtle)`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        className="flex-shrink-0 rounded-[var(--radius-sm)] p-1.5"
        style={{ background: `${color}22`, color }}
      >
        <SportIcon sport={workout.sport} size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="truncate font-medium"
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-primary)",
          }}
        >
          {workout.title}
        </p>
        {workout.estimatedDuration && (
          <div
            className="flex items-center gap-1 mt-0.5"
            style={{ color: "var(--text-muted)" }}
          >
            <Clock size={11} strokeWidth={1.75} />
            <span style={{ fontSize: "var(--text-xs)" }}>
              {formatDuration(workout.estimatedDuration)}
            </span>
          </div>
        )}
      </div>
      {workout.status === "completed" ? (
        <CheckCircle2
          size={16}
          style={{ color: "var(--color-success)", flexShrink: 0 }}
          strokeWidth={1.75}
        />
      ) : (
        <ChevronRight
          size={16}
          style={{ color: "var(--text-muted)", flexShrink: 0 }}
          strokeWidth={1.75}
        />
      )}
    </div>
  );
}

function WeekProgressBar({ weekProgress }: { weekProgress: DashboardToday["weekProgress"] }) {
  if (!weekProgress) return null;
  const pct = Math.min(weekProgress.percentage, 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          Week progress
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            color: pct >= 80 ? "var(--color-success)" : "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {(weekProgress.completedHours ?? 0).toFixed(1)}h / {(weekProgress.plannedHours ?? 0).toFixed(1)}h
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 4, background: "var(--bg-elevated)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
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
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────── */

export function MorningBriefingSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-5 flex flex-col gap-4"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex flex-col gap-1">
        <Skeleton width="55%" height="28px" />
        <Skeleton width="75%" height="14px" />
      </div>
      <Skeleton height="52px" />
      <Skeleton height="30px" />
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
  // Backend greeting is "Hello, FirstName!" — extract first name defensively
  const parts = (data.greeting ?? "").split(",");
  const firstName = parts.length > 1 ? (parts[1]?.trim().replace("!", "") ?? "") : "";
  const greeting = `Good ${tod}${firstName ? `, ${firstName}` : ""}`;

  return (
    <div
      className={clsx(
        "rounded-[var(--radius-xl)] p-5 flex flex-col gap-4",
        className
      )}
      style={{
        background:
          "linear-gradient(135deg, var(--bg-surface) 0%, color-mix(in srgb, var(--color-accent) 8%, var(--bg-surface)) 100%)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-glow)",
      }}
    >
      {/* Greeting */}
      <div>
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: "var(--text-2xl)", color: "var(--text-primary)" }}
        >
          {greeting} 👋
        </h1>
        <p
          className="mt-0.5"
          style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}
        >
          {data.weekProgress
            ? `${data.weekProgress.percentage}% of this week's training done`
            : "Ready to train?"}
        </p>
      </div>

      {/* Today's workout */}
      <div className="flex flex-col gap-1.5">
        <span
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          Today
        </span>
        <WorkoutPill workout={data.todayWorkout} />
      </div>

      {/* Week progress bar */}
      <WeekProgressBar weekProgress={data.weekProgress} />
    </div>
  );
}
