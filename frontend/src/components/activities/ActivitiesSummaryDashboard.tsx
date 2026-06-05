"use client";

import * as React from "react";
import { Clock, Ruler, Flame, Activity } from "lucide-react";
import { formatDuration, formatDistance } from "@/lib/utils";
import type { ActivitySummary, Sport } from "@/lib/types/activity";

interface ActivitiesSummaryDashboardProps {
  activities: ActivitySummary[];
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

export function ActivitiesSummaryDashboard({
  activities,
  loading = false,
}: ActivitiesSummaryDashboardProps) {
  // Aggregate stats
  const totals = React.useMemo(() => {
    let duration = 0;
    let distance = 0;
    let tss = 0;
    const sportDurations: Record<Sport, number> = {
      cycling: 0,
      running: 0,
      swimming: 0,
      strength: 0,
      hiking: 0,
      walking: 0,
      other: 0,
    };

    activities.forEach((act) => {
      duration += act.durationSeconds || 0;
      distance += act.distanceMeters || 0;
      tss += act.tss || 0;
      if (act.sport && sportDurations[act.sport] !== undefined) {
        sportDurations[act.sport] += act.durationSeconds || 0;
      } else {
        sportDurations.other += act.durationSeconds || 0;
      }
    });

    return {
      duration,
      distance,
      tss,
      sportDurations,
    };
  }, [activities]);

  if (loading || activities.length === 0) {
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

  return (
    <div 
      className="px-4 lg:px-6 mb-6"
      style={{
        animation: "fadeInScale var(--duration-standard) var(--ease-standard)",
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card: Total Duration */}
        <div
          className="relative overflow-hidden p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.4) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[length:var(--text-xs)] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Training Time
            </span>
            <div className="p-2 rounded-[var(--radius-md)] bg-[rgba(139,92,246,0.1)] text-[var(--color-accent)]">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-metric text-[var(--text-primary)]">
              {formatDuration(totals.duration)}
            </span>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-1">
            Across {activities.length} activities
          </p>
        </div>

        {/* Card: Total Distance */}
        <div
          className="relative overflow-hidden p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.4) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[length:var(--text-xs)] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Distance
            </span>
            <div className="p-2 rounded-[var(--radius-md)] bg-[rgba(59,130,246,0.1)] text-[var(--color-fitness)]">
              <Ruler size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-metric text-[var(--text-primary)]">
              {formatDistance(totals.distance)}
            </span>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-1">
            Cumulative training volume
          </p>
        </div>

        {/* Card: Total TSS */}
        <div
          className="relative overflow-hidden p-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            backdropFilter: "blur(12px)",
            background: "linear-gradient(135deg, rgba(10, 10, 15, 0.7) 0%, rgba(20, 20, 32, 0.4) 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[length:var(--text-xs)] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Training Stress (TSS)
            </span>
            <div className="p-2 rounded-[var(--radius-md)] bg-[rgba(245,158,11,0.1)] text-[var(--color-fatigue)]">
              <Flame size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-metric text-[var(--text-primary)]">
              {totals.tss.toFixed(0)}
            </span>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--text-secondary)] mt-1">
            Total training load score
          </p>
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
                No activity distribution data.
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
