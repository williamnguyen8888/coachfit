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
  Sparkles,
  Flame,
  Zap,
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

function sportGradient(sport: string): string {
  const map: Record<string, string> = {
    cycling: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.02) 100%)",
    running: "linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.02) 100%)",
    swimming: "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.02) 100%)",
    strength: "linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.02) 100%)",
  };
  return map[sport] ?? "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.02) 100%)";
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

function WorkoutCard({
  workout,
}: {
  workout: DashboardToday["todayWorkout"];
}) {
  if (!workout) {
    return (
      <div
        className="flex items-center gap-3 rounded-[var(--radius-lg)] p-4 glass-card"
        style={{
          borderStyle: "dashed",
        }}
      >
        <div className="rounded-full p-2 bg-[var(--bg-elevated)] text-[var(--text-muted)]">
          <CalendarDays size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <span
            style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}
          >
            Rest day — Recovery is key!
          </span>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
            Your muscles grow when you rest. Sleep well and hydrate.
          </p>
        </div>
      </div>
    );
  }

  const color = sportColor(workout.sport);
  const gradient = sportGradient(workout.sport);

  // Derived mock structured parameters for premium appearance
  const durationMin = workout.estimatedDuration ? Math.round(workout.estimatedDuration / 60) : 60;
  // Estimate TSS based on duration and sport: ~65 TSS per hour
  const estTss = Math.round((durationMin / 60) * 65);
  // Estimate a structured workout preview
  const workoutFocus = workout.sport === "cycling" ? "Tempo intervals (Zone 3)"
                     : workout.sport === "running" ? "Threshold repeats (Zone 4)"
                     : workout.sport === "swimming" ? "Aerobic endurance drill"
                     : "Hypertrophy strength circuit";

  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] p-4 hover-elevation glass-card cursor-pointer relative overflow-hidden group"
      style={{
        borderLeft: `4px solid ${color}`,
      }}
    >
      {/* Sport Gradient Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-60 transition-opacity group-hover:opacity-80"
        style={{ background: gradient }}
      />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 rounded-full p-2.5 flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ 
              background: `color-mix(in srgb, ${color} 15%, var(--bg-elevated))`, 
              color,
              boxShadow: `0 0 12px ${color}22`
            }}
          >
            <SportIcon sport={workout.sport} size={18} />
          </div>
          <div className="min-w-0">
            <span
              style={{ fontSize: "var(--text-xs)", color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              {workout.sport}
            </span>
            <h3
              className="truncate font-semibold tracking-tight mt-0.5"
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
              }}
            >
              {workout.title}
            </h3>
          </div>
        </div>

        {workout.status === "completed" ? (
          <span 
            className="rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1"
            style={{ background: "var(--color-success-8)", color: "var(--color-success)" }}
          >
            <CheckCircle2 size={12} />
            Completed
          </span>
        ) : (
          <span 
            className="rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1"
            style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--color-accent)" }}
          >
            <Zap size={12} />
            Active
          </span>
        )}
      </div>

      {/* Structured workout details */}
      <div 
        className="rounded-[var(--radius-sm)] px-3 py-2 flex items-center justify-between gap-4 relative z-10"
        style={{ background: "rgba(0,0,0,0.15)" }}
      >
        <div className="flex flex-col">
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Target focus</span>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
            {workoutFocus}
          </span>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          {workout.estimatedDuration && (
            <div className="flex flex-col items-end">
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Duration</span>
              <span className="font-metric font-semibold flex items-center gap-1" style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}>
                <Clock size={12} className="text-muted" />
                {formatDuration(workout.estimatedDuration)}
              </span>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>Est. TSS</span>
            <span className="font-metric font-semibold flex items-center gap-1" style={{ fontSize: "var(--text-sm)", color: "var(--color-fatigue)" }}>
              <Flame size={12} />
              {estTss}
            </span>
          </div>
        </div>
      </div>

      {/* Action link */}
      <div className="flex justify-end items-center gap-1 text-xs font-medium relative z-10 transition-transform group-hover:translate-x-1" style={{ color: "var(--color-accent)" }}>
        <span>View structured target details</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}

function WeekProgressBar({ weekProgress }: { weekProgress: DashboardToday["weekProgress"] }) {
  if (!weekProgress) return null;
  const pct = Math.min(weekProgress.percentage, 100);

  return (
    <div className="flex flex-col gap-2 p-1 relative z-10">
      <div className="flex justify-between items-center">
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>
          Weekly Target Progress
        </span>
        <span
          className="font-metric font-bold text-glow"
          style={{
            fontSize: "var(--text-sm)",
            color: pct >= 80 ? "var(--color-success)" : "var(--text-primary)",
          }}
        >
          {(weekProgress.completedHours ?? 0).toFixed(1)}h <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>/ {(weekProgress.plannedHours ?? 0).toFixed(1)}h</span>
        </span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden relative"
        style={{ height: 8, background: "rgba(255, 255, 255, 0.05)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background:
              pct >= 80
                ? "linear-gradient(90deg, var(--color-success) 0%, #10b981 100%)"
                : pct >= 50
                ? "linear-gradient(90deg, var(--color-accent) 0%, #a78bfa 100%)"
                : "linear-gradient(90deg, var(--color-fatigue) 0%, #fbbf24 100%)",
            boxShadow: pct >= 80 ? "0 0 10px rgba(34, 197, 94, 0.4)" : pct >= 50 ? "0 0 10px rgba(139, 92, 246, 0.4)" : "0 0 10px rgba(245, 158, 11, 0.4)"
          }}
        />
      </div>
      <div className="flex justify-between items-center text-[10px] text-muted">
        <span>Consistency is key to adaptation</span>
        <span className="font-semibold" style={{ color: pct >= 80 ? "var(--color-success)" : "var(--text-secondary)" }}>
          {pct}% Completed
        </span>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────── */

export function MorningBriefingSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-6 flex flex-col gap-5 glass-card"
    >
      <div className="flex flex-col gap-1">
        <Skeleton width="45%" height="32px" />
        <Skeleton width="65%" height="16px" />
      </div>
      <Skeleton height="110px" className="rounded-[var(--radius-lg)]" />
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
        "rounded-[var(--radius-xl)] p-6 flex flex-col gap-5 relative overflow-hidden glass-card",
        className
      )}
    >
      {/* Decorative Premium Glow Background Shapes */}
      <div 
        className="absolute pointer-events-none rounded-full blur-[80px]"
        style={{
          top: "-50px",
          right: "-50px",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, rgba(0,0,0,0) 70%)"
        }}
      />
      <div 
        className="absolute pointer-events-none rounded-full blur-[60px]"
        style={{
          bottom: "-80px",
          left: "-40px",
          width: "180px",
          height: "180px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(0,0,0,0) 70%)"
        }}
      />

      {/* Greeting Header */}
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h1
            className="font-extrabold tracking-tight"
            style={{ 
              fontSize: "var(--text-3xl)", 
              color: "var(--text-primary)",
              lineHeight: 1.15
            }}
          >
            {greeting} <span className="inline-block animate-bounce">👋</span>
          </h1>
          <p
            className="mt-1"
            style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 400 }}
          >
            {data.weekProgress
              ? `You've completed ${data.weekProgress.percentage}% of your targets. Keep pushing!`
              : "Welcome to your training dashboard today."}
          </p>
        </div>
        <div className="rounded-full p-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--color-accent)] animate-pulse">
          <Sparkles size={18} />
        </div>
      </div>

      {/* Today's Workout Section */}
      <div className="flex flex-col gap-2 relative z-10">
        <span
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}
        >
          Today's Scheduled Session
        </span>
        <WorkoutCard workout={data.todayWorkout} />
      </div>

      {/* Week Progress Section */}
      <WeekProgressBar weekProgress={data.weekProgress} />
    </div>
  );
}
