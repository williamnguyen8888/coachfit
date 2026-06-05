/**
 * Activity Detail Page — Professional Dashboard
 * Redesigned to match TrainingPeaks / Intervals.icu professional standards.
 *
 * Layout:
 *   - Hero header with gradient, sport badge, inline name editing
 *   - Zone intensity bar (power or HR zones)
 *   - Tab bar: TIMELINE | POWER/PACE | HR | ELEVATION | ROUTE | LAPS | DATA
 *   - Full-width main content area
 *   - Right sidebar: Coach feedback + Notes (persistent)
 */
"use client";

import * as React from "react";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Detail components
import { ActivityHeroHeader } from "@/components/activities/detail/ActivityHeroHeader";
import { ActivityZoneIntensityBar } from "@/components/activities/detail/ActivityZoneIntensityBar";
import { ActivityDetailSkeleton } from "@/components/activities/detail/ActivityDetailSkeleton";
import { InteractiveMultiLaneChart } from "@/components/activities/detail/InteractiveMultiLaneChart";
import { ActivityAnalyticsTab } from "@/components/activities/detail/ActivityAnalyticsTab";
import { ActivityPowerPanel } from "@/components/activities/detail/ActivityPowerPanel";
import { ActivityHRPanel } from "@/components/activities/detail/ActivityHRPanel";
import { ActivityElevationPanel } from "@/components/activities/detail/ActivityElevationPanel";
import { ActivityMap } from "@/components/activities/detail/ActivityMap";
import { ActivityLapsTable } from "@/components/activities/detail/ActivityLapsTable";
import { ActivityDataPanel } from "@/components/activities/detail/ActivityDataPanel";
import { ActivityNotesCard } from "@/components/activities/detail/ActivityNotesCard";
import { ActivityRunningFormPanel } from "@/components/activities/detail/ActivityRunningFormPanel";
import { ActivitySplitsPanel } from "@/components/activities/detail/ActivitySplitsPanel";

// Services & types
import { activitiesService } from "@/lib/services/activities";
import { zonesService } from "@/lib/services/settings";
import type { ActivityDetail, ActivityLap, Sport, StreamPoint } from "@/lib/types/activity";
import type { SportZones } from "@/lib/types/settings";

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_ACCENT: Record<Sport, string> = {
  cycling:  "#3b82f6",
  running:  "#22c55e",
  swimming: "#06b6d4",
  strength: "#f97316",
  hiking:   "#84cc16",
  walking:  "#a78bfa",
  other:    "#8b5cf6",
};

type TabKey = "TIMELINE" | "POWER" | "HR" | "ELEVATION" | "ROUTE" | "LAPS" | "RUNNING_FORM" | "SPLITS" | "DATA";

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveZoneProfile(
  zones: SportZones[],
  sport: Sport,
  zoneType: "power" | "heart_rate" | "pace",
): SportZones | null {
  const matches = zones
    .filter((zone) => {
      if (zone.sport !== sport) return false;
      const nt = zone.zoneType?.toLowerCase() ?? "";
      if (nt === zoneType) return true;
      if (zoneType === "pace") return nt === "" && (zone.thresholdPace != null || zone.ftp != null);
      if (zoneType === "power") return nt === "" && zone.ftp != null;
      return nt === "" && (zone.lthr != null || zone.maxHr != null);
    })
    .sort((a, b) => {
      const ad = a.effectiveDate ? Date.parse(a.effectiveDate) : 0;
      const bd = b.effectiveDate ? Date.parse(b.effectiveDate) : 0;
      return bd - ad;
    });
  return matches[0] ?? null;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center" role="alert">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Could not load activity</h2>
        <p className="mt-2 max-w-sm text-sm text-text-secondary">{message}</p>
      </div>
      <Button variant="secondary" size="md" leftIcon={<RefreshCw size={14} />} onClick={onRetry}>
        Try Again
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  // ── State ──
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [streams, setStreams] = useState<StreamPoint[] | null>(null);
  const [laps, setLaps] = useState<ActivityLap[]>([]);
  const [athleteZones, setAthleteZones] = useState<SportZones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("TIMELINE");
  const [selectedTimeRange, setSelectedTimeRange] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [selectedLapIndex, setSelectedLapIndex] = useState<number | null>(null);

  // ── Data loading ──
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [detailResult, streamsResult, lapsResult, zonesResult] = await Promise.allSettled([
        activitiesService.get(id),
        activitiesService.getStreams(id),
        activitiesService.getLaps(id),
        zonesService.listAll(),
      ]);

      if (detailResult.status !== "fulfilled") {
        throw detailResult.reason;
      }

      setActivity(detailResult.value);

      if (streamsResult.status === "fulfilled") {
        setStreams(streamsResult.value?.points ?? []);
      } else {
        setStreams([]);
      }

      if (lapsResult.status === "fulfilled") {
        const ld = lapsResult.value;
        setLaps(Array.isArray(ld) ? ld : (ld.laps ?? []));
      } else {
        setLaps([]);
      }

      if (zonesResult.status === "fulfilled") {
        setAthleteZones(Array.isArray(zonesResult.value) ? zonesResult.value : []);
      } else {
        setAthleteZones([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Handlers — MUST be declared before any early returns (Rules of Hooks) ──
  const handleBack = useCallback(() => {
    router.push("/calendar");
  }, [router]);

  const handleSaveName = useCallback(
    async (name: string) => {
      const updated = await activitiesService.update(id, { name });
      setActivity(updated);
    },
    [id],
  );

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Delete this activity? This cannot be undone.")) return;
    await activitiesService.delete(id);
    router.push("/activities");
  }, [id, router]);

  const handleLapSelect = useCallback(
    (lapIdx: number | null, startOff: number, endOff: number) => {
      setSelectedLapIndex(lapIdx);
      if (lapIdx == null) {
        setSelectedTimeRange(null);
      } else {
        setSelectedTimeRange({ startTime: startOff, endTime: endOff });
      }
    },
    [],
  );

  const handleDescriptionSaved = useCallback(
    (desc: string | null) => {
      setActivity((prev) => prev ? { ...prev, description: desc } : prev);
    },
    [],
  );

  // ── Early returns (no hooks below this line) ──
  if (loading) {
    return (
      <main id="activity-detail" className="flex-1 px-4 py-5 lg:px-6">
        <ActivityDetailSkeleton />
      </main>
    );
  }

  if (error || !activity) {
    return (
      <main id="activity-detail" className="flex-1 px-4 py-5 lg:px-6">
        <ErrorState message={error ?? "Activity not found."} onRetry={load} />
      </main>
    );
  }

  // ── Derived data (no hooks — pure computations from state) ──
  const streamPoints = streams ?? [];
  const sportColor = SPORT_ACCENT[activity.sport] ?? SPORT_ACCENT.other;

  const powerZoneConfig = resolveZoneProfile(athleteZones, activity.sport, "power");
  const heartRateZoneConfig = resolveZoneProfile(athleteZones, activity.sport, "heart_rate");
  const paceZoneConfig =
    activity.sport === "running" || activity.sport === "swimming"
      ? resolveZoneProfile(athleteZones, activity.sport, "pace")
      : null;

  const hasPower = streamPoints.some((p) => p.power != null && p.power > 0);
  const hasHR = streamPoints.some((p) => p.hr != null && p.hr > 0);
  const hasGPS = streamPoints.some((p) => p.lat != null);
  const hasAlt = streamPoints.some((p) => p.altitude != null);

  const isPaceActivity = activity.sport === "running" || activity.sport === "swimming";
  const powerTabLabel = isPaceActivity ? "PACE" : "POWER";

  const tabs: Array<{ key: TabKey; label: string; show: boolean }> = [
    { key: "TIMELINE", label: "TIMELINE", show: true },
    { key: "POWER", label: powerTabLabel, show: true },
    { key: "HR", label: "HR", show: hasHR || activity.avgHeartRate != null },
    { key: "ELEVATION", label: "ELEVATION", show: hasAlt || (activity.elevationGainMeters ?? 0) > 0 },
    { key: "ROUTE", label: "ROUTE", show: hasGPS },
    { key: "LAPS", label: `LAPS (${laps.length})`, show: laps.length > 0 },
    {
      key: "RUNNING_FORM",
      label: "RUNNING FORM",
      show:
        activity.sport === "running" &&
        (activity.avgVerticalOscillation != null ||
          activity.avgGroundContactTime != null ||
          streamPoints.some((p) => p.cadence != null && p.speed != null)),
    },
    {
      key: "SPLITS",
      label: "SPLITS",
      show: streamPoints.some((p) => p.distance != null),
    },
    { key: "DATA", label: "DATA", show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);
  const effectiveTab = visibleTabs.some((t) => t.key === activeTab) ? activeTab : "TIMELINE";

  // ── Render ──
  return (
    <main
      id="activity-detail"
      className="flex h-full flex-col overflow-hidden bg-bg-default text-text-primary"
    >
      {/* Hero header */}
      <ActivityHeroHeader
        activity={activity}
        points={streamPoints}
        onBack={handleBack}
        onSaveName={handleSaveName}
        onDelete={handleDelete}
      />

      {/* Zone intensity bar */}
      <ActivityZoneIntensityBar
        points={streamPoints}
        sport={activity.sport}
        powerZones={powerZoneConfig}
        hrZones={heartRateZoneConfig}
      />

      {/* Tab bar */}
      <div
        id="activity-tabs"
        className="z-10 flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border-subtle bg-bg-elevated/60 px-2 py-1.5 scrollbar-none backdrop-blur-sm sm:gap-1 sm:px-4 sm:py-2"
      >
        {visibleTabs.map((tab) => {
          const isActive = effectiveTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key.toLowerCase()}`}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 cursor-pointer select-none rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide transition-all duration-200 sm:px-4 sm:py-1.5 sm:text-xs ${
                isActive
                  ? "border-border-default bg-bg-surface text-accent shadow-sm"
                  : "border-transparent bg-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main content + sidebar */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Main panel */}
        <div
          id="activity-main-panel"
          className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
        >
          <div className="flex flex-col gap-4">

            {/* TIMELINE */}
            {effectiveTab === "TIMELINE" && (
              <>
                <InteractiveMultiLaneChart
                  points={streamPoints}
                  sport={activity.sport}
                  selectedRange={selectedTimeRange}
                  onRangeSelect={setSelectedTimeRange}
                  laps={laps}
                />
                {streamPoints.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border-default bg-bg-elevated/30 p-6 text-center text-sm text-text-secondary">
                    This activity has no telemetry streams — only summary metrics are available.
                  </div>
                )}
              </>
            )}

            {/* POWER / PACE */}
            {effectiveTab === "POWER" && (
              isPaceActivity ? (
                <ActivityAnalyticsTab
                  mode="pace"
                  activity={activity}
                  points={streamPoints}
                  zoneConfig={paceZoneConfig}
                />
              ) : (
                <ActivityPowerPanel
                  activity={activity}
                  points={streamPoints}
                  zoneConfig={powerZoneConfig}
                />
              )
            )}

            {/* HR */}
            {effectiveTab === "HR" && (
              <ActivityHRPanel
                activity={activity}
                points={streamPoints}
                zoneConfig={heartRateZoneConfig}
              />
            )}

            {/* ELEVATION */}
            {effectiveTab === "ELEVATION" && (
              <ActivityElevationPanel activity={activity} points={streamPoints} />
            )}

            {/* ROUTE */}
            {effectiveTab === "ROUTE" && (
              <div
                className="relative overflow-hidden rounded-2xl border border-border-subtle"
                style={{ minHeight: "clamp(280px, 50vw, 520px)" }}
              >
                <ActivityMap points={streamPoints} sportColor={sportColor} />
              </div>
            )}

            {/* LAPS */}
            {effectiveTab === "LAPS" && (
              <ActivityLapsTable
                laps={laps}
                sport={activity.sport}
                selectedLapIndex={selectedLapIndex}
                onSelectLap={handleLapSelect}
              />
            )}

            {/* DATA */}
            {effectiveTab === "DATA" && (
              <ActivityDataPanel activity={activity} />
            )}

            {/* RUNNING FORM */}
            {effectiveTab === "RUNNING_FORM" && (
              <ActivityRunningFormPanel activity={activity} points={streamPoints} />
            )}

            {/* SPLITS */}
            {effectiveTab === "SPLITS" && (
              <ActivitySplitsPanel activity={activity} points={streamPoints} />
            )}

          </div>
        </div>

        <div
          id="activity-sidebar"
          className="flex shrink-0 flex-col border-t border-border-subtle bg-bg-elevated/30 lg:w-[300px] lg:border-l lg:border-t-0 lg:overflow-y-auto"
        >
          <div className="p-4">
            <ActivityNotesCard
              activityId={activity.id}
              description={activity.description}
              onDescriptionSaved={handleDescriptionSaved}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
