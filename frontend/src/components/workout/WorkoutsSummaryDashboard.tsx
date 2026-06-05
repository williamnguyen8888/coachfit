"use client";

import * as React from "react";
import { Clock, Dumbbell, Award, Activity } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import type { WorkoutSummary } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

interface WorkoutsSummaryDashboardProps {
  workouts: WorkoutSummary[];
  loading?: boolean;
}

const sportLabels: Record<Sport, string> = {
  cycling: "Cycling",
  running: "Running",
  swimming: "Swimming",
  strength: "Strength",
  hiking: "Hiking",
  walking: "Walking",
  other: "Other",
};

const sportColors: Record<Sport, string> = {
  cycling: "var(--sport-cycling)",
  running: "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  hiking: "#84cc16",
  walking: "#a78bfa",
  other: "var(--sport-other)",
};

const sportGlows: Record<Sport, string> = {
  cycling: "rgba(59, 130, 246, 0.2)",
  running: "rgba(34, 197, 94, 0.2)",
  swimming: "rgba(6, 182, 212, 0.2)",
  strength: "rgba(249, 115, 22, 0.2)",
  hiking: "rgba(132, 204, 22, 0.2)",
  walking: "rgba(167, 139, 250, 0.2)",
  other: "rgba(107, 114, 128, 0.15)",
};

export function WorkoutsSummaryDashboard({
  workouts,
  loading = false,
}: WorkoutsSummaryDashboardProps) {
  // Aggregate stats
  const totals = React.useMemo(() => {
    let duration = 0;
    let templatesCount = 0;
    let customCount = 0;
    const sportDurations: Record<Sport, number> = {
      cycling: 0,
      running: 0,
      swimming: 0,
      strength: 0,
      hiking: 0,
      walking: 0,
      other: 0,
    };

    workouts.forEach((w) => {
      duration += w.estimatedDuration || 0;
      if (w.isTemplate) {
        templatesCount++;
      } else {
        customCount++;
      }
      if (w.sport && sportDurations[w.sport] !== undefined) {
        sportDurations[w.sport] += w.estimatedDuration || 0;
      } else {
        sportDurations.other += w.estimatedDuration || 0;
      }
    });

    return {
      duration,
      templatesCount,
      customCount,
      sportDurations,
    };
  }, [workouts]);

  if (loading || workouts.length === 0) {
    return null;
  }

  // Calculate sport percentages (by duration)
  const totalDuration = totals.duration || 1;
  const sportData = Object.entries(totals.sportDurations)
    .map(([sport, duration]) => ({
      sport: sport as Sport,
      duration,
      percentage: Math.round((duration / totalDuration) * 100),
    }))
    .filter((item) => item.duration > 0)
    .sort((a, b) => b.duration - a.duration);

  const totalWorkouts = workouts.length;
  const templatesPercentage = totalWorkouts > 0 ? Math.round((totals.templatesCount / totalWorkouts) * 100) : 0;

  return (
    <div 
      className="px-4 lg:px-6 mb-6"
      style={{
        animation: "fadeInScale var(--duration-standard) var(--ease-standard)",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Total Workouts */}
        <div
          className="relative overflow-hidden p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.4) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[length:var(--text-xs)] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Total Workouts
            </span>
            <div className="p-2 rounded-[var(--radius-md)] bg-[rgba(139,92,246,0.1)] text-[var(--color-accent)]">
              <Dumbbell size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-metric text-[var(--text-primary)]">
              {totalWorkouts}
            </span>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-1">
            {totals.customCount} Custom · {totals.templatesCount} Templates
          </p>
        </div>

        {/* Card: Total Estimated Time */}
        <div
          className="relative overflow-hidden p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.4) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[length:var(--text-xs)] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Est. Library Time
            </span>
            <div className="p-2 rounded-[var(--radius-md)] bg-[rgba(59,130,246,0.1)] text-[var(--color-info)]">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-metric text-[var(--text-primary)]">
              {formatDuration(totals.duration)}
            </span>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-1">
            Total library training volume
          </p>
        </div>

        {/* Card: Template Ratio */}
        <div
          className="relative overflow-hidden p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.4) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[length:var(--text-xs)] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Templates Ratio
            </span>
            <div className="p-2 rounded-[var(--radius-md)] bg-[rgba(245,158,11,0.1)] text-[var(--color-warning)]">
              <Award size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-metric text-[var(--text-primary)]">
              {templatesPercentage}%
            </span>
          </div>
          <div 
            className="w-full h-1.5 rounded-full overflow-hidden mt-1.5"
            style={{ background: "var(--border-subtle)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-[var(--color-warning)]"
              style={{
                width: `${templatesPercentage}%`,
                boxShadow: "0 0 8px rgba(245, 158, 11, 0.2)",
                animation: "loadBarFill 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
              }}
            />
          </div>
        </div>

        {/* Card: Sport Breakdown */}
        <div
          className="relative overflow-hidden p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.4) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[length:var(--text-xs)] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Sport Distribution
            </span>
            <div className="p-2 rounded-[var(--radius-md)] bg-[rgba(34,197,94,0.1)] text-[var(--color-success)]">
              <Activity size={16} />
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            {sportData.length === 0 ? (
              <p className="text-[length:var(--text-xs)] text-[var(--text-muted)]">
                No sport distribution data.
              </p>
            ) : (
              sportData.slice(0, 3).map((item) => (
                <div key={item.sport} className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-[11px] font-medium">
                    <span style={{ color: sportColors[item.sport] }}>
                      {sportLabels[item.sport]}
                    </span>
                    <span className="text-[var(--text-secondary)] font-mono">
                      {item.percentage}%
                    </span>
                  </div>
                  <div 
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--border-subtle)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${item.percentage}%`,
                        background: sportColors[item.sport],
                        boxShadow: `0 0 8px ${sportGlows[item.sport]}`,
                        animation: "loadBarFill 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
