/**
 * Activity Detail Page — Professional Dashboard
 * Redesigned to match TrainingPeaks / Intervals.icu professional standards.
 *
 * Layout:
 *   - Hero header with gradient, sport badge, inline name editing
 *   - Zone intensity bar (power or HR zones)
 *   - Tab bar: TIMELINE | POWER/PACE | HR | ELEVATION | ROUTE | LAPS | DATA (+ More overflow)
 *   - Full-width main content area
 *   - Right sidebar: Quick Stats + Notes (persistent)
 */
"use client";

import * as React from "react";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, RefreshCw } from "lucide-react";
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
import { ActivityQuickStats } from "@/components/activities/detail/ActivityQuickStats";
import { ActivitySidebar } from "@/components/activities/detail/ActivitySidebar";
import { DeleteConfirmModal } from "@/components/activities/detail/DeleteConfirmModal";

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

/** Max number of tabs shown directly (rest go into "More" dropdown) */
const MAX_VISIBLE_TABS = 5;

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

import { createPortal } from "react-dom";

// ─── Tab overflow "More" dropdown (uses portal to avoid clip) ─────────────────

interface TabBarProps {
  visibleTabs: Array<{ key: TabKey; label: string }>;
  effectiveTab: TabKey;
  onSelectTab: (key: TabKey) => void;
}

function TabBar({ visibleTabs, effectiveTab, onSelectTab }: TabBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const primaryTabs = visibleTabs.slice(0, MAX_VISIBLE_TABS);
  const overflowTabs = visibleTabs.slice(MAX_VISIBLE_TABS);
  const activeInOverflow = overflowTabs.some((t) => t.key === effectiveTab);

  // Close dropdown on click outside
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        moreRef.current && !moreRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [moreOpen]);

  // Calculate fixed position for dropdown to avoid overflow clipping
  const toggleMore = () => {
    if (!moreOpen && moreRef.current) {
      const rect = moreRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 6, left: rect.left });
    }
    setMoreOpen((o) => !o);
  };

  return (
    <div
      id="activity-tabs"
      className="z-10 flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border-subtle bg-bg-elevated/60 px-2 py-1.5 scrollbar-none backdrop-blur-sm sm:gap-1 sm:px-4 sm:py-2"
    >
      {primaryTabs.map((tab) => {
        const isActive = effectiveTab === tab.key;
        return (
          <button
            key={tab.key}
            id={`tab-${tab.key.toLowerCase()}`}
            onClick={() => onSelectTab(tab.key)}
            className={`shrink-0 cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-bold tracking-wide transition-all duration-200 sm:px-4 sm:py-1.5 ${
              isActive
                ? "border-border-default bg-bg-surface text-accent shadow-sm"
                : "border-transparent bg-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        );
      })}

      {overflowTabs.length > 0 && (
        <div ref={moreRef} className="relative shrink-0">
          <button
            id="tab-more-btn"
            onClick={toggleMore}
            className={`flex shrink-0 cursor-pointer select-none items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold tracking-wide transition-all duration-200 sm:px-4 sm:py-1.5 ${
              activeInOverflow
                ? "border-border-default bg-bg-surface text-accent shadow-sm"
                : "border-transparent bg-transparent text-text-secondary hover:text-text-primary"
            }`}
            aria-expanded={moreOpen}
            aria-haspopup="listbox"
          >
            {activeInOverflow
              ? (overflowTabs.find((t) => t.key === effectiveTab)?.label ?? "More")
              : "More"}
            <ChevronDown size={11} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Dropdown — rendered via React Portal to escape overflow:hidden/auto parents */}
          {moreOpen && dropdownPos && mounted && typeof document !== "undefined" && createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              style={{ position: "fixed", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
              className="min-w-[160px] overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-2xl backdrop-blur-sm"
            >
              {overflowTabs.map((tab) => {
                const isActive = effectiveTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="option"
                    aria-selected={isActive}
                    id={`tab-more-${tab.key.toLowerCase()}`}
                    onClick={() => { onSelectTab(tab.key); setMoreOpen(false); }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-xs font-bold tracking-wide transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>,
            document.body
          )}
        </div>
      )}
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

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

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
    // Use router.back() to return to wherever the user came from (activities list, calendar, etc.)
    router.back();
  }, [router]);

  const handleSaveName = useCallback(
    async (name: string) => {
      const updated = await activitiesService.update(id, { name });
      setActivity(updated);
    },
    [id],
  );

  const handleDeleteRequest = useCallback(() => {
    setShowDeleteModal(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setIsDeleting(true);
    try {
      await activitiesService.delete(id);
      setShowDeleteModal(false);
      router.push("/activities");
    } catch {
      setIsDeleting(false);
    }
  }, [id, router]);

  const handleDeleteCancel = useCallback(() => {
    if (!isDeleting) setShowDeleteModal(false);
  }, [isDeleting]);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const res = await activitiesService.getDownloadUrl(id);
      window.open(res.url, "_blank");
    } catch {
      // silently fail — could add a toast notification here
    } finally {
      setIsDownloading(false);
    }
  }, [id, isDownloading]);

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

  // Average temperature from stream
  const avgTempFromStream = (() => {
    const temps = streamPoints
      .filter((p) => p.temperature != null && Number.isFinite(p.temperature!))
      .map((p) => p.temperature!);
    if (temps.length === 0) return activity.avgTemperature ?? null;
    return Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
  })();

  const isPaceActivity = activity.sport === "running" || activity.sport === "swimming";
  const powerTabLabel = isPaceActivity ? "PACE" : "POWER";

  const tabs: Array<{ key: TabKey; label: string; show: boolean }> = [
    { key: "TIMELINE", label: "Timeline", show: true },
    { key: "POWER", label: powerTabLabel === "PACE" ? "Pace" : "Power", show: true },
    { key: "HR", label: "HR", show: hasHR || activity.avgHeartRate != null },
    { key: "ELEVATION", label: "Elevation", show: hasAlt || (activity.elevationGainMeters ?? 0) > 0 },
    { key: "ROUTE", label: "Route", show: hasGPS },
    { key: "LAPS", label: `Laps (${laps.length})`, show: laps.length > 0 },
    {
      key: "RUNNING_FORM",
      label: "Form",
      show:
        activity.sport === "running" &&
        (activity.avgVerticalOscillation != null ||
          activity.avgGroundContactTime != null ||
          streamPoints.some((p) => p.cadence != null && p.speed != null)),
    },
    {
      key: "SPLITS",
      label: "Splits",
      show: streamPoints.some((p) => p.distance != null),
    },
    { key: "DATA", label: "Data", show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);
  const effectiveTab = visibleTabs.some((t) => t.key === activeTab) ? activeTab : "TIMELINE";

  // ── Render ──
  return (
    <>
      <main
        id="activity-detail"
        className="flex h-full flex-col overflow-hidden bg-bg-primary text-text-primary"
      >
        {/* Hero header */}
        <ActivityHeroHeader
          activity={activity}
          points={streamPoints}
          onBack={handleBack}
          onSaveName={handleSaveName}
          onDelete={handleDeleteRequest}
          onDownload={activity.rawFileFormat ? handleDownload : undefined}
          isDownloading={isDownloading}
        />

        {/* Zone intensity bar */}
        <ActivityZoneIntensityBar
          points={streamPoints}
          sport={activity.sport}
          powerZones={powerZoneConfig}
          hrZones={heartRateZoneConfig}
        />

        {/* Tab bar with overflow "More" dropdown */}
        <TabBar
          visibleTabs={visibleTabs}
          effectiveTab={effectiveTab}
          onSelectTab={setActiveTab}
        />

        {/* Main content + sidebar */}
        <div className="flex min-h-0 flex-1" style={{ overflow: "hidden" }}>
          {/* ── Main panel ──────────────────────────────────── */}
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
                <ActivityMap points={streamPoints} sportColor={sportColor} sport={activity.sport} />
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

              {/* Notes — mobile only (bottom of main panel). On desktop it lives in the sidebar. */}
              <div className="lg:hidden">
                <ActivityNotesCard
                  activityId={activity.id}
                  description={activity.description}
                  onDescriptionSaved={handleDescriptionSaved}
                />
              </div>

            </div>
          </div>

          {/* ── Sticky right sidebar (desktop only) ─────────── */}
          <ActivitySidebar
            activity={activity}
            avgTemperature={avgTempFromStream}
            onDescriptionSaved={handleDescriptionSaved}
          />
        </div>
      </main>

      {/* Delete confirmation modal — rendered outside main to avoid clipping */}
      {showDeleteModal && (
        <DeleteConfirmModal
          activityName={activity.name ?? `${activity.sport} Activity`}
          isDeleting={isDeleting}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={handleDeleteCancel}
        />
      )}
    </>
  );
}

