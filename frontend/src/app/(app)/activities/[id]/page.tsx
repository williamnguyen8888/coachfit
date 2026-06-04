"use client";

import * as React from "react";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Gauge,
  Heart,
  Info,
  Paperclip,
  RefreshCw,
  Share2,
  Timer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActivityDetailSkeleton } from "@/components/activities/detail/ActivityDetailSkeleton";
import { ActivityAnalyticsTab } from "@/components/activities/detail/ActivityAnalyticsTab";
import { ActivityLaps } from "@/components/activities/detail/ActivityLaps";
import { ActivityMap } from "@/components/activities/detail/ActivityMap";
import { ActivityMetrics } from "@/components/activities/detail/ActivityMetrics";
import { ActivitySourceInfo } from "@/components/activities/detail/ActivitySourceInfo";
import { InteractiveMultiLaneChart } from "@/components/activities/detail/InteractiveMultiLaneChart";
import { SubjectiveFeedbackCard } from "@/components/activities/detail/SubjectiveFeedbackCard";
import { activitiesService } from "@/lib/services/activities";
import { zonesService } from "@/lib/services/settings";
import type { ActivityDetail, ActivityLap, Sport, StreamPoint } from "@/lib/types/activity";
import type { SportZones } from "@/lib/types/settings";

const SPORT_COLORS: Record<Sport, { primary: string; light: string; dark: string }> = {
  cycling: { primary: "#3b82f6", light: "#dbeafe", dark: "#1e40af" },
  running: { primary: "#22c55e", light: "#dcfce7", dark: "#166534" },
  swimming: { primary: "#06b6d4", light: "#cffafe", dark: "#155e75" },
  strength: { primary: "#f97316", light: "#ffedd5", dark: "#c2410c" },
  other: { primary: "#6b7280", light: "#f3f4f6", dark: "#374151" },
};

const SPORT_ICONS: Record<string, string> = {
  cycling: "🚴",
  running: "🏃",
  swimming: "🏊",
  strength: "💪",
  other: "🏋️",
};

type TabKey = "TIMELINE" | "POWER" | "HR" | "ROUTE" | "DATA";

interface Props {
  params: Promise<{ id: string }>;
}

interface HeaderMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string | null;
}

function formatDurationClock(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatSpeedToPace(speedMps: number | null | undefined, type: "run" | "swim"): string {
  if (speedMps == null || speedMps <= 0.1) return "--:--";
  const totalSecs = type === "run" ? 1000 / speedMps : 100 / speedMps;
  if (totalSecs > 1800) return "--:--";

  const wholeSeconds = Math.round(totalSecs);
  const minutes = Math.floor(wholeSeconds / 60);
  const seconds = wholeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function resolveZoneProfile(
  zones: SportZones[],
  sport: Sport,
  zoneType: "power" | "heart_rate" | "pace",
): SportZones | null {
  const matches = zones
    .filter((zone) => {
      if (zone.sport !== sport) return false;

      const normalizedType = zone.zoneType?.toLowerCase() ?? "";
      if (normalizedType === zoneType) return true;

      if (zoneType === "pace") {
        return normalizedType === "" && (zone.thresholdPace != null || zone.ftp != null);
      }

      if (zoneType === "power") {
        return normalizedType === "" && zone.ftp != null;
      }

      return normalizedType === "" && (zone.lthr != null || zone.maxHr != null);
    })
    .sort((left, right) => {
      const rightDate = right.effectiveDate ? Date.parse(right.effectiveDate) : 0;
      const leftDate = left.effectiveDate ? Date.parse(left.effectiveDate) : 0;
      return rightDate - leftDate;
    });

  return matches[0] ?? null;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-5" role="alert">
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: "var(--radius-lg)",
          background: "var(--color-danger-10)",
          border: "1px solid var(--color-danger-20)",
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
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--text-secondary)",
            maxWidth: 360,
          }}
        >
          {message}
        </p>
      </div>
      <Button
        variant="secondary"
        size="md"
        leftIcon={<RefreshCw size={14} />}
        onClick={onRetry}
      >
        Try Again
      </Button>
    </div>
  );
}

function HeaderMetric({ icon, label, value, detail }: HeaderMetricProps) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-text-muted">{label}:</span>
      <span className="font-bold text-text-primary">{value}</span>
      {detail ? <span className="text-text-muted text-[10px] sm:text-xs">({detail})</span> : null}
    </div>
  );
}

export default function ActivityDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [streams, setStreams] = useState<StreamPoint[] | null>(null);
  const [laps, setLaps] = useState<ActivityLap[] | null>(null);
  const [athleteZones, setAthleteZones] = useState<SportZones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("TIMELINE");
  const [selectedTimeRange, setSelectedTimeRange] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [comments, setComments] = useState<Array<{ text: string; time: string }>>([
    {
      text: "Capture notes about this activity and share it with your followers. Click the share name to share with others.",
      time: "10:19 PM",
    },
  ]);

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
        const lapsData = lapsResult.value;
        setLaps(Array.isArray(lapsData) ? lapsData : (lapsData.laps ?? []));
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const handleBack = useCallback(() => {
    router.push("/calendar");
  }, [router]);

  const handleAddNote = () => {
    if (!noteInput.trim()) return;

    const nowStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setComments((current) => [...current, { text: noteInput, time: nowStr }]);
    setNoteInput("");
  };

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

  const sportColor = SPORT_COLORS[activity.sport] ?? SPORT_COLORS.other;
  const dateFormatted = new Date(activity.startedAt).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const streamPoints = streams ?? [];
  const hasTelemetry = streamPoints.length > 0;
  const powerZoneConfig = resolveZoneProfile(athleteZones, activity.sport, "power");
  const heartRateZoneConfig = resolveZoneProfile(athleteZones, activity.sport, "heart_rate");
  const paceZoneConfig =
    activity.sport === "running" || activity.sport === "swimming"
      ? resolveZoneProfile(athleteZones, activity.sport, "pace")
      : null;

  const distanceLabel =
    activity.sport === "swimming"
      ? activity.distanceMeters != null
        ? `${Math.round(activity.distanceMeters)} m`
        : "--"
      : activity.distanceMeters != null
        ? `${(activity.distanceMeters / 1000).toFixed(2)} km`
        : "--";
  const durationLabel = formatDurationClock(activity.durationSeconds);
  const primarySpeedLabel =
    activity.sport === "running"
      ? activity.avgSpeed != null
        ? `${formatSpeedToPace(activity.avgSpeed, "run")}/km`
        : "--"
      : activity.sport === "swimming"
        ? activity.avgSpeed != null
          ? `${formatSpeedToPace(activity.avgSpeed, "swim")}/100m`
          : "--"
        : activity.avgSpeed != null
          ? `${(activity.avgSpeed * 3.6).toFixed(1)} km/h`
          : "--";

  const intensityFactorPct =
    activity.intensityFactor != null ? `${Math.round(activity.intensityFactor * 100)}% IF` : null;
  const loadLabel = activity.tss != null ? Math.round(activity.tss).toString() : null;

  const headerMetrics: Array<{
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    detail?: string | null;
  }> = [
    {
      key: "distance",
      icon: <Compass size={14} className="text-text-muted shrink-0" />,
      label: "Dist",
      value: distanceLabel,
    },
    {
      key: "time",
      icon: <Timer size={14} className="text-text-muted shrink-0" />,
      label: "Time",
      value: durationLabel,
    },
    {
      key: "speed",
      icon: <Activity size={14} className="text-text-muted shrink-0" />,
      label: activity.sport === "running" || activity.sport === "swimming" ? "Pace" : "Speed",
      value: primarySpeedLabel,
    },
  ];

  if (activity.sport === "cycling") {
    if (loadLabel) {
      headerMetrics.push({
        key: "tss",
        icon: <Flame size={14} className="text-accent shrink-0" />,
        label: "TSS",
        value: loadLabel,
        detail: intensityFactorPct,
      });
    }
    if (activity.avgPower != null) {
      headerMetrics.push({
        key: "power",
        icon: <Zap size={14} className="text-fitness shrink-0" />,
        label: "PWR",
        value: `${activity.avgPower}W`,
        detail: activity.normalizedPower != null ? `${activity.normalizedPower}W NP` : null,
      });
    }
    if (activity.avgHeartRate != null) {
      headerMetrics.push({
        key: "hr",
        icon: <Heart size={14} className="text-danger shrink-0" />,
        label: "HR",
        value: `${activity.avgHeartRate} bpm`,
        detail: activity.maxHeartRate != null ? `Max ${activity.maxHeartRate}` : null,
      });
    }
    if (activity.avgCadence != null) {
      headerMetrics.push({
        key: "cadence",
        icon: <Gauge size={14} className="text-warning shrink-0" />,
        label: "CAD",
        value: `${activity.avgCadence} rpm`,
      });
    }
    if (activity.calories != null) {
      headerMetrics.push({
        key: "calories",
        icon: <Award size={14} className="text-form shrink-0" />,
        label: "CAL",
        value: `${activity.calories} kcal`,
      });
    }
  } else if (activity.sport === "running") {
    if (loadLabel) {
      headerMetrics.push({
        key: "rtss",
        icon: <Flame size={14} className="text-accent shrink-0" />,
        label: "rTSS",
        value: loadLabel,
        detail: intensityFactorPct,
      });
    }
    if (activity.avgHeartRate != null) {
      headerMetrics.push({
        key: "hr",
        icon: <Heart size={14} className="text-danger shrink-0" />,
        label: "HR",
        value: `${activity.avgHeartRate} bpm`,
        detail: activity.maxHeartRate != null ? `Max ${activity.maxHeartRate}` : null,
      });
    }
    if (activity.avgCadence != null) {
      headerMetrics.push({
        key: "cadence",
        icon: <Gauge size={14} className="text-warning shrink-0" />,
        label: "CAD",
        value: `${activity.avgCadence} spm`,
      });
    }
    if (activity.calories != null) {
      headerMetrics.push({
        key: "calories",
        icon: <Award size={14} className="text-form shrink-0" />,
        label: "CAL",
        value: `${activity.calories} kcal`,
      });
    }
  } else if (activity.sport === "swimming") {
    if (loadLabel) {
      headerMetrics.push({
        key: "stss",
        icon: <Flame size={14} className="text-accent shrink-0" />,
        label: "sTSS",
        value: loadLabel,
        detail: intensityFactorPct,
      });
    }
    if (activity.avgCadence != null) {
      headerMetrics.push({
        key: "stroke-rate",
        icon: <Gauge size={14} className="text-warning shrink-0" />,
        label: "Stroke",
        value: `${activity.avgCadence} spm`,
      });
    }
    if (activity.avgHeartRate != null) {
      headerMetrics.push({
        key: "hr",
        icon: <Heart size={14} className="text-danger shrink-0" />,
        label: "HR",
        value: `${activity.avgHeartRate} bpm`,
        detail: activity.maxHeartRate != null ? `Max ${activity.maxHeartRate}` : null,
      });
    }
    if (activity.calories != null) {
      headerMetrics.push({
        key: "calories",
        icon: <Award size={14} className="text-form shrink-0" />,
        label: "CAL",
        value: `${activity.calories} kcal`,
      });
    }
  } else {
    if (loadLabel) {
      headerMetrics.push({
        key: "hrtss",
        icon: <Flame size={14} className="text-accent shrink-0" />,
        label: "Load",
        value: loadLabel,
      });
    }
    if (activity.avgHeartRate != null) {
      headerMetrics.push({
        key: "hr",
        icon: <Heart size={14} className="text-danger shrink-0" />,
        label: "HR",
        value: `${activity.avgHeartRate} bpm`,
        detail: activity.maxHeartRate != null ? `Max ${activity.maxHeartRate}` : null,
      });
    }
    if (activity.calories != null) {
      headerMetrics.push({
        key: "calories",
        icon: <Award size={14} className="text-form shrink-0" />,
        label: "CAL",
        value: `${activity.calories} kcal`,
      });
    }
  }

  const powerTabLabel =
    activity.sport === "running" || activity.sport === "swimming" ? "PACE" : "POWER";

  return (
    <main
      id="activity-detail"
      className="flex-1 bg-[var(--bg-default)] text-[var(--text-primary)]"
      style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}
    >
      <div className="relative flex shrink-0 flex-col gap-3 border-b border-border-subtle bg-bg-surface/50 p-4 shadow-sm backdrop-blur-md sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-secondary shadow-sm transition-all duration-200 hover:border-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              title="Back to Calendar"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-0.5 rounded-lg border border-border-subtle/50 bg-bg-elevated/40 p-0.5 shadow-sm">
              <button className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-text-muted transition-colors hover:bg-bg-input hover:text-text-primary">
                <ChevronLeft size={14} />
              </button>
              <button className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-text-muted transition-colors hover:bg-bg-input hover:text-text-primary">
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="ml-1 flex flex-wrap items-center gap-2">
              <span className="text-xl sm:text-2xl">{SPORT_ICONS[activity.sport] ?? "🏋️"}</span>
              <h1 className="text-base font-bold tracking-tight text-text-primary sm:text-lg">
                {activity.name || `${activity.sport.charAt(0).toUpperCase() + activity.sport.slice(1)} Activity`}
              </h1>
              <span className="px-1 text-xs font-normal text-text-muted">|</span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {dateFormatted}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary shadow-sm transition-colors hover:bg-bg-elevated hover:text-text-primary">
              <Share2 size={12} />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border-subtle/30 pt-3 text-xs text-text-secondary sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 sm:text-[14px]">
          {headerMetrics.map((metric, index) => (
            <React.Fragment key={metric.key}>
              <HeaderMetric
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                detail={metric.detail}
              />
              {index < headerMetrics.length - 1 ? (
                <span className="hidden select-none text-text-muted/40 sm:inline">·</span>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-2 overflow-x-auto whitespace-nowrap border-b border-border-subtle bg-bg-elevated/40 px-3 py-2 scrollbar-none sm:px-5">
        {(["TIMELINE", "POWER", "HR", "ROUTE", "DATA"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const displayLabel = tab === "POWER" ? powerTabLabel : tab;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 cursor-pointer select-none rounded-full border px-4 py-1.5 text-xs font-bold transition-all duration-200 ${
                isActive
                  ? "border-border-default bg-bg-surface text-accent shadow-sm"
                  : "border-transparent bg-transparent text-text-secondary hover:text-text-primary"
              }`}
              style={{ boxShadow: isActive ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "none" }}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-5 sm:p-5">
          {activeTab === "TIMELINE" ? (
            <>
              <InteractiveMultiLaneChart
                points={streamPoints}
                sport={activity.sport}
                selectedRange={selectedTimeRange}
                onRangeSelect={setSelectedTimeRange}
              />

              <div className="rounded-lg border border-border-subtle bg-bg-surface p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <Info size={12} />
                  Telemetry Integrity
                </div>
                <p className="text-sm text-text-secondary">
                  {hasTelemetry
                    ? "Timeline selection uses full parsed telemetry from the uploaded file. The chart is visually downsampled only for browser performance; the range selector and analytics tabs still calculate from the real stream."
                    : "This upload does not include telemetry streams. Summary cards, laps, and source details still show the parsed activity data that was persisted."}
                </p>
              </div>
            </>
          ) : null}

          {activeTab === "POWER" ? (
            activity.sport === "running" || activity.sport === "swimming" ? (
              <ActivityAnalyticsTab
                mode="pace"
                activity={activity}
                points={streamPoints}
                zoneConfig={paceZoneConfig}
              />
            ) : (
              <ActivityAnalyticsTab
                mode="power"
                activity={activity}
                points={streamPoints}
                zoneConfig={powerZoneConfig}
              />
            )
          ) : null}

          {activeTab === "HR" ? (
            <ActivityAnalyticsTab
              mode="heart_rate"
              activity={activity}
              points={streamPoints}
              zoneConfig={heartRateZoneConfig}
            />
          ) : null}

          {activeTab === "ROUTE" ? (
            <div
              style={{
                minHeight: "450px",
                position: "relative",
                zIndex: 1,
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              <ActivityMap points={streamPoints} sportColor={sportColor.primary} />
            </div>
          ) : null}

          {activeTab === "DATA" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ActivityLaps
                  laps={laps}
                  sport={activity.sport}
                  selectedRange={selectedTimeRange}
                  onSelectLapRange={setSelectedTimeRange}
                />
                <ActivityMetrics activity={activity} />
              </div>
              <ActivitySourceInfo activity={activity} />
            </div>
          ) : null}
        </div>

        <div className="flex h-auto w-full flex-col overflow-hidden border-t border-border-subtle bg-bg-elevated lg:h-full lg:w-[320px] lg:min-w-[320px] lg:border-t-0 lg:border-l">
          <SubjectiveFeedbackCard sport={activity.sport} />

          <div className="flex min-h-[300px] flex-1 flex-col overflow-hidden">
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-primary">
                <span>📝</span>
                <span>Notes & Comments</span>
              </div>
              <div style={{ display: "flex", gap: "10px", color: "var(--text-secondary)" }}>
                <button
                  style={{ border: "none", background: "none", cursor: "pointer", color: "inherit" }}
                  title="Attach File"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  style={{ border: "none", background: "none", cursor: "pointer", color: "inherit" }}
                  title="Share notes"
                >
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: "16px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {comments.map((comment, index) => (
                <div
                  key={index}
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "12px",
                    lineHeight: "1.5",
                  }}
                >
                  <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>{comment.text}</div>
                  <div style={{ textAlign: "right", fontSize: "10px", color: "var(--text-muted)" }}>
                    {comment.time}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <textarea
                placeholder="Type a note or comment..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 10px",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  outline: "none",
                  resize: "none",
                  fontFamily: "inherit",
                }}
              />
              <button
                onClick={handleAddNote}
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  fontWeight: 700,
                  cursor: "pointer",
                  alignSelf: "flex-end",
                }}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
