"use client";
// src/components/dashboard/DashboardClient.tsx
// Client component that orchestrates all dashboard sections.
// Fetches three APIs in parallel and renders widgets with skeleton loading states.
//
// Mobile composition (intentional, not desktop-collapsed):
//   - MorningBriefing (full-width hero)
//   - FitnessStatusBadge (quick inline CTL/ATL/TSB)
//   - HealthSnapshot (3-col chip grid)
//   - WellnessLastKnown (last check-in + CTA)
//   - WeeklySummary (bar chart)
//   - FitnessTrend (area chart)
//   - RecentActivities (list feed)
//
// Desktop: two-column grid — briefing+health left, charts+activities right.

import React from "react";
import { useQuery } from "@/hooks/useQuery";
import { MorningBriefing, MorningBriefingSkeleton } from "./MorningBriefing";
import { HealthSnapshot, HealthSnapshotSkeleton } from "./HealthSnapshot";
import { WeeklySummary, WeeklySummarySkeleton } from "./WeeklySummary";
import { FitnessTrend, FitnessTrendSkeleton } from "./FitnessTrend";
import { RecentActivities, RecentActivitiesSkeleton } from "./RecentActivities";
import { FitnessStatusBadge } from "./FitnessStatusBadge";
import { WellnessLastKnown, WellnessLastKnownSkeleton } from "@/components/wellness/WellnessLastKnown";
import { toLocalDateString } from "@/lib/utils";
import type { DashboardToday, WeeklySummary as WeeklySummaryType, FitnessTrendResponse } from "@/lib/types/dashboard";
import type { WellnessEntry, WellnessListResponse } from "@/lib/types/wellness";

/* ─── Error state ─────────────────────────────────────────────────────── */

function SectionError({ message }: { message: string }) {
  return (
    <div
      className="rounded-[var(--radius-md)] px-4 py-3 flex items-center gap-3"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--color-danger)",
        borderLeftWidth: 3,
      }}
    >
      <span style={{ fontSize: "var(--text-sm)", color: "var(--color-danger)" }}>
        {message}
      </span>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

export function DashboardClient() {
  const today = useQuery<DashboardToday>("/dashboard/today");
  const weekly = useQuery<WeeklySummaryType>("/dashboard/weekly-summary");
  const fitness = useQuery<FitnessTrendResponse>("/dashboard/fitness-trend?days=90");

  // Fetch today's wellness entry to power the WellnessLastKnown widget.
  // We also pick up lastWellness from today.data as a fallback.
  const todayDate = toLocalDateString(new Date());
  const wellnessQuery = useQuery<WellnessListResponse | WellnessEntry[]>(
    `/wellness?from=${todayDate}&to=${todayDate}`,
  );
  const wellnessEntry: WellnessEntry | null = (() => {
    const d = wellnessQuery?.data;
    if (!d) return null;
    if (Array.isArray(d)) {
      return d.length > 0 ? (d[0] as WellnessEntry) : null;
    }
    if (typeof d === "object") {
      const asObj = d as Record<string, any>;
      if (Array.isArray(asObj.content) && asObj.content.length > 0) {
        return asObj.content[0] as WellnessEntry;
      }
      if (Array.isArray(asObj.data) && asObj.data.length > 0) {
        return asObj.data[0] as WellnessEntry;
      }
    }
    return null;
  })();
  const hasCheckedInToday = !!wellnessEntry;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-3 sm:px-4 lg:px-6 py-4 lg:py-5">
      {/*
        ── Mobile layout ──────────────────────────────────────────────
        Single column, stacked. Cards are full-width.

        ── Desktop layout (lg+) ─────────────────────────────────────
        Two columns: left = morning + health, right = charts + activities.
      */}
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.45fr)] xl:gap-5 xl:items-start">

        {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Morning Briefing */}
          {today.loading ? (
            <MorningBriefingSkeleton />
          ) : today.error ? (
            <SectionError message="Could not load today's briefing" />
          ) : today.data ? (
            <MorningBriefing data={today.data} />
          ) : null}

          {/* Fitness status badge (only on mobile, inline between briefing and health) */}
          {today.data?.fitnessStatus && (
            <div className="xl:hidden">
              <FitnessStatusBadge data={today.data.fitnessStatus} />
            </div>
          )}

          {/* Health Snapshot */}
          {today.loading ? (
            <HealthSnapshotSkeleton />
          ) : today.error ? (
            <SectionError message="Could not load health data" />
          ) : (
            <HealthSnapshot data={today.data?.healthSnapshot ?? null} />
          )}

          {/* Wellness last known + check-in CTA */}
          {wellnessQuery.loading ? (
            <WellnessLastKnownSkeleton />
          ) : (
            <WellnessLastKnown
              entry={wellnessEntry}
              hasCheckedInToday={hasCheckedInToday}
            />
          )}
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Weekly Summary */}
          {weekly.loading ? (
            <WeeklySummarySkeleton />
          ) : weekly.error ? (
            <SectionError message="Could not load weekly summary" />
          ) : weekly.data ? (
            <WeeklySummary data={weekly.data} />
          ) : null}

          {/* Fitness Trend */}
          {fitness.loading ? (
            <FitnessTrendSkeleton />
          ) : fitness.error ? (
            <SectionError message="Could not load fitness trend" />
          ) : fitness.data ? (
            <FitnessTrend
              data={fitness.data}
              trend={today.data?.fitnessStatus?.trend}
            />
          ) : null}

          {/* Recent Activities */}
          {today.loading ? (
            <RecentActivitiesSkeleton />
          ) : today.error ? (
            <SectionError message="Could not load recent activities" />
          ) : (
            <RecentActivities activities={today.data?.recentActivities ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
