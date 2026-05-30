"use client";

/**
 * Activity Detail Page — /activities/[id]
 *
 * Layout:
 *  - Hero card: name, sport, date, source, primary metrics
 *  - Route map (GPS polyline via react-leaflet)
 *  - Performance charts (HR, power, altitude — Recharts)
 *  - Desktop: [Laps | Metrics] side-by-side; Mobile: stacked
 *  - Source info card (format, download)
 *
 * Data:
 *  - GET /activities/{id}           → ActivityDetail
 *  - GET /activities/{id}/streams   → StreamPoint[]
 *  - GET /activities/{id}/laps      → ActivityLap[]
 *
 * All three fetches run in parallel. Streams + laps are non-critical
 * (fail gracefully — map/charts just show empty state).
 */

import * as React from "react";
import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActivityDetailSkeleton } from "@/components/activities/detail/ActivityDetailSkeleton";
import { ActivityHero } from "@/components/activities/detail/ActivityHero";
import { ActivityMap } from "@/components/activities/detail/ActivityMap";
import { ActivityCharts } from "@/components/activities/detail/ActivityCharts";
import { ActivityLaps } from "@/components/activities/detail/ActivityLaps";
import { ActivityMetrics } from "@/components/activities/detail/ActivityMetrics";
import { ActivitySourceInfo } from "@/components/activities/detail/ActivitySourceInfo";
import { activitiesService } from "@/lib/services/activities";
import type { ActivityDetail, ActivityLap, StreamPoint, Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Sport → CSS color                                                    */
/* ------------------------------------------------------------------ */

const SPORT_COLOR: Record<Sport, string> = {
  cycling:  "#3B82F6",
  running:  "#22C55E",
  swimming: "#06B6D4",
  strength: "#F97316",
  other:    "#6B7280",
};

/* ------------------------------------------------------------------ */
/*  Error state                                                          */
/* ------------------------------------------------------------------ */

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-24 gap-5"
      role="alert"
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "var(--radius-lg)",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertCircle size={26} style={{ color: "var(--color-danger)" }} />
      </div>
      <div>
        <h2
          style={{
            fontSize: "var(--text-lg)",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          Could not load activity
        </h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", maxWidth: 360 }}>
          {message}
        </p>
      </div>
      <Button variant="secondary" size="md" leftIcon={<RefreshCw size={14} />} onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                 */
/* ------------------------------------------------------------------ */

interface Props {
  params: Promise<{ id: string }>;
}

export default function ActivityDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [streams, setStreams] = useState<StreamPoint[] | null>(null);
  const [laps, setLaps] = useState<ActivityLap[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Critical: activity detail — failure shows error page
      const detail = await activitiesService.getDetail(id);
      setActivity(detail);

      // Non-critical: streams + laps — failure shows empty state in each section
      const [streamsResult, lapsResult] = await Promise.allSettled([
        activitiesService.getStreams(id),
        activitiesService.getLaps(id),
      ]);

      if (streamsResult.status === "fulfilled") {
        setStreams(streamsResult.value.points ?? []);
      }

      if (lapsResult.status === "fulfilled") {
        setLaps(lapsResult.value);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = useCallback(() => {
    router.push("/activities");
  }, [router]);

  /* ── Loading ── */
  if (loading) {
    return (
      <main
        id="activity-detail"
        className="flex-1 px-4 lg:px-6 py-5"
        aria-label="Activity detail loading"
      >
        <ActivityDetailSkeleton />
      </main>
    );
  }

  /* ── Error ── */
  if (error || !activity) {
    return (
      <main
        id="activity-detail"
        className="flex-1 px-4 lg:px-6 py-5"
        aria-label="Activity detail error"
      >
        <ErrorState
          message={error ?? "Activity not found."}
          onRetry={load}
        />
      </main>
    );
  }

  const sportColor = SPORT_COLOR[activity.sport] ?? SPORT_COLOR.other;

  return (
    <main
      id="activity-detail"
      className="flex-1 px-4 lg:px-6 py-5"
      aria-label={`Activity detail: ${activity.name}`}
    >
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">
        {/* Hero */}
        <ActivityHero activity={activity} onBack={handleBack} />

        {/* Map */}
        <ActivityMap points={streams} sportColor={sportColor} />

        {/* Charts */}
        <ActivityCharts points={streams} />

        {/* Laps + Metrics: side-by-side desktop, stacked mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ActivityLaps laps={laps} />
          <ActivityMetrics activity={activity} />
        </div>

        {/* Source info */}
        <ActivitySourceInfo activity={activity} />
      </div>
    </main>
  );
}
