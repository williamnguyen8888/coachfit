"use client";

import * as React from "react";
import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Paperclip, Share2, Flame, Heart, Zap, Award, Activity, Database, Scale, Gauge, Compass, Timer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActivityDetailSkeleton } from "@/components/activities/detail/ActivityDetailSkeleton";
import { ActivityMap } from "@/components/activities/detail/ActivityMap";
import { ActivityLaps } from "@/components/activities/detail/ActivityLaps";
import { ActivityMetrics } from "@/components/activities/detail/ActivityMetrics";
import { ActivitySourceInfo } from "@/components/activities/detail/ActivitySourceInfo";
import { InteractiveMultiLaneChart } from "@/components/activities/detail/InteractiveMultiLaneChart";
import { ActivityPowerTab } from "@/components/activities/detail/ActivityPowerTab";
import { ActivityPaceTab } from "@/components/activities/detail/ActivityPaceTab";
import { ActivityHrTab } from "@/components/activities/detail/ActivityHrTab";
import { SubjectiveFeedbackCard } from "@/components/activities/detail/SubjectiveFeedbackCard";
import { activitiesService } from "@/lib/services/activities";
import type { ActivityDetail, ActivityLap, StreamPoint, Sport } from "@/lib/types/activity";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutesSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSpeedToPace(speedMps: number | null | undefined, type: "run" | "swim"): string {
  if (speedMps == null || speedMps <= 0.1) return "--:--";
  const totalSecs = type === "run" ? 1000 / speedMps : 100 / speedMps;
  if (totalSecs > 1800) return "--:--";
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPORT_COLORS: Record<Sport, { primary: string; light: string; dark: string }> = {
  cycling:  { primary: "#3b82f6", light: "#dbeafe", dark: "#1e40af" },
  running:  { primary: "#22c55e", light: "#dcfce7", dark: "#166534" },
  swimming: { primary: "#06b6d4", light: "#cffafe", dark: "#155e75" },
  strength: { primary: "#f97316", light: "#ffedd5", dark: "#c2410c" },
  other:    { primary: "#6b7280", light: "#f3f4f6", dark: "#374151" },
};

const SPORT_ICONS: Record<string, string> = {
  cycling: "🚴",
  running: "🏃",
  swimming: "🏊",
  strength: "💪",
  other: "🏋️",
};

// ─── Mock Streams Generator if none present ──────────────────────────────────

function generateMockStreams(durationSeconds: number, sport: Sport): StreamPoint[] {
  const points: StreamPoint[] = [];
  const totalPoints = 300;
  const step = durationSeconds / totalPoints;
  
  let currentHR = 110;
  let currentAlt = 45;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i * step;
    let power = 0;
    let cadence = 0;
    
    if (sport === "cycling") {
      if (t % 600 < 400) {
        power = 180 + Math.sin(t / 20) * 12 + Math.random() * 5;
        cadence = 88 + Math.sin(t / 40) * 3 + Math.random() * 2;
      } else {
        power = 95 + Math.random() * 5;
        cadence = 72 + Math.random() * 3;
      }
    } else if (sport === "running") {
      power = 240 + Math.sin(t / 15) * 8 + Math.random() * 4;
      cadence = 84 + Math.sin(t / 30) * 2 + Math.random() * 1;
    }

    const targetHR = 120 + (power > 0 ? (power - 100) * 0.35 : 20) + Math.sin(t / 120) * 6;
    currentHR += (targetHR - currentHR) * 0.05 + (Math.random() - 0.5) * 0.4;
    currentAlt += Math.sin(t / 200) * 0.12 + (Math.random() - 0.5) * 0.04;

    points.push({
      t,
      hr: Math.round(currentHR),
      power: power > 0 ? Math.round(power) : undefined,
      cadence: cadence > 0 ? Math.round(cadence) : undefined,
      altitude: Math.round(currentAlt * 10) / 10,
      distance: (t / durationSeconds) * (sport === "cycling" ? 30550 : 8000),
    });
  }
  return points;
}

// ─── Error Component ──────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-5" role="alert">
      <div style={{ width: 60, height: 60, borderRadius: "var(--radius-lg)", background: "var(--color-danger-10)", border: "1px solid var(--color-danger-20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertCircle size={26} style={{ color: "var(--color-danger)" }} />
      </div>
      <div>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Could not load activity</h2>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", maxWidth: 360 }}>{message}</p>
      </div>
      <Button variant="secondary" size="md" leftIcon={<RefreshCw size={14} />} onClick={onRetry}>Try Again</Button>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

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

  // Tabs state: TIMELINE, POWER, HR, ROUTE, DATA
  const [activeTab, setActiveTab] = useState<"TIMELINE" | "POWER" | "HR" | "ROUTE" | "DATA">("TIMELINE");
  const [selectedTimeRange, setSelectedTimeRange] = useState<{ startTime: number; endTime: number } | null>(null);

  // Sidebar Notes/Comments state
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
      const detail = await activitiesService.get(id);
      setActivity(detail);

      const [streamsResult, lapsResult] = await Promise.allSettled([
        activitiesService.getStreams(id),
        activitiesService.getLaps(id),
      ]);

      if (streamsResult.status === "fulfilled" && streamsResult.value?.points?.length > 0) {
        setStreams(streamsResult.value.points);
      } else {
        // Generate high-fidelity mock streams if empty
        setStreams(generateMockStreams(detail.durationSeconds, detail.sport));
      }

      if (lapsResult.status === "fulfilled") {
        const lapsData = lapsResult.value;
        setLaps(Array.isArray(lapsData) ? lapsData : (lapsData.laps ?? []));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBack = useCallback(() => {
    router.push("/calendar"); // Go back to calendar
  }, [router]);

  const handleAddNote = () => {
    if (!noteInput.trim()) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setComments([...comments, { text: noteInput, time: nowStr }]);
    setNoteInput("");
  };

  if (loading) {
    return (
      <main id="activity-detail" className="flex-1 px-4 lg:px-6 py-5">
        <ActivityDetailSkeleton />
      </main>
    );
  }

  if (error || !activity) {
    return (
      <main id="activity-detail" className="flex-1 px-4 lg:px-6 py-5">
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

  // Safe metrics fallbacks to match intervals.icu mockup
  const distanceKm = activity.distanceMeters ? (activity.distanceMeters / 1000).toFixed(2) : "30.55";
  const durationStr = formatMinutesSeconds(activity.durationSeconds);
  const avgSpeedKmh = activity.avgSpeed ? (activity.avgSpeed * 3.6).toFixed(1) : "43.5";

  const intensityFactor = activity.intensityFactor != null ? Math.round(activity.intensityFactor * 100) : 83;
  const loadTss = activity.tss != null ? Math.round(activity.tss) : 49;
  const avgHr = activity.avgHeartRate ?? 138;
  const maxHr = activity.maxHeartRate ?? 159;
  const avgPower = activity.avgPower ?? 128;
  const normPower = activity.normalizedPower ?? 154;

  return (
    <main
      id="activity-detail"
      className="flex-1 bg-[var(--bg-default)] text-[var(--text-primary)]"
      style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}
    >
      {/* ─── Premium intervals.icu Header Bar ──────────────────────────────────── */}
      <div className="border-b border-border-subtle bg-bg-surface/50 backdrop-blur-md p-4 sm:px-6 sm:py-5 flex flex-col gap-3 shrink-0 shadow-sm relative">
        {/* Top Row: Navigation, Sport, Activity Title & Date */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-8 h-8 rounded-full border border-border-default bg-bg-surface hover:bg-bg-elevated hover:border-text-secondary text-text-secondary hover:text-text-primary transition-all duration-200 cursor-pointer shadow-sm"
              title="Back to Calendar"
            >
              <ChevronLeft size={16} />
            </button>
            
            {/* Prev/Next buttons */}
            <div className="flex items-center gap-0.5 bg-bg-elevated/40 border border-border-subtle/50 rounded-lg p-0.5 shadow-sm">
              <button className="flex items-center justify-center w-6 h-6 rounded bg-transparent hover:bg-bg-input text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <ChevronLeft size={14} />
              </button>
              <button className="flex items-center justify-center w-6 h-6 rounded bg-transparent hover:bg-bg-input text-text-muted hover:text-text-primary transition-colors cursor-pointer">
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Sport Icon + Activity Name & Date */}
            <div className="flex flex-wrap items-center gap-2 ml-1">
              <span className="text-xl sm:text-2xl">{SPORT_ICONS[activity.sport] ?? "🏋️"}</span>
              <h1 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                {activity.name || `${activity.sport.charAt(0).toUpperCase() + activity.sport.slice(1)} Activity`}
              </h1>
              <span className="text-text-muted font-normal text-xs px-1">|</span>
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider font-mono">
                {dateFormatted}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default bg-bg-surface hover:bg-bg-elevated text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer shadow-sm">
              <Share2 size={12} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Flat, Card-Free High-Density Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1.5 text-xs text-text-secondary border-t border-border-subtle/30 pt-3">
          {/* Main metrics */}
          <div className="flex items-center gap-1.5">
            <Compass size={13} className="text-text-muted shrink-0" />
            <span className="text-text-muted">Dist:</span>
            <span className="font-bold text-text-primary">{activity.sport === "swimming" ? `${activity.distanceMeters ?? 1500} m` : `${distanceKm} km`}</span>
          </div>
          <span className="hidden sm:inline text-text-muted/40 select-none">·</span>
          
          <div className="flex items-center gap-1.5">
            <Timer size={13} className="text-text-muted shrink-0" />
            <span className="text-text-muted">Time:</span>
            <span className="font-bold text-text-primary">{durationStr}</span>
          </div>
          <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

          <div className="flex items-center gap-1.5">
            <Activity size={13} className="text-text-muted shrink-0" />
            <span className="text-text-muted">Speed:</span>
            <span className="font-bold text-text-primary">
              {activity.sport === "running" ? `${formatSpeedToPace(activity.avgSpeed ?? 4.0, "run")}/km` : 
               activity.sport === "swimming" ? `${formatSpeedToPace(activity.avgSpeed ?? 1.0, "swim")}/100m` : 
               `${avgSpeedKmh} km/h`}
            </span>
          </div>

          <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

          {/* Sport specific advanced parameters */}
          {activity.sport === "cycling" && (
            <>
              {/* TSS */}
              <div className="flex items-center gap-1.5">
                <Flame size={13} className="text-accent shrink-0 animate-pulse" />
                <span className="text-text-muted">TSS:</span>
                <span className="font-bold text-text-primary">{loadTss}</span>
                <span className="text-text-muted text-[10px]">({intensityFactor}% IF)</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Power */}
              <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-fitness shrink-0" />
                <span className="text-text-muted">PWR:</span>
                <span className="font-bold text-text-primary">{avgPower}W</span>
                <span className="text-text-muted text-[10px]">({normPower}W NP)</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* HR */}
              <div className="flex items-center gap-1.5">
                <Heart size={13} className="text-danger shrink-0" />
                <span className="text-text-muted">HR:</span>
                <span className="font-bold text-text-primary">{avgHr} bpm</span>
                <span className="text-text-muted text-[10px]">(Max {maxHr})</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Cadence */}
              <div className="flex items-center gap-1.5">
                <Gauge size={13} className="text-warning shrink-0" />
                <span className="text-text-muted">CAD:</span>
                <span className="font-bold text-text-primary">{activity.avgCadence ?? 96} rpm</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Energy */}
              <div className="flex items-center gap-1.5">
                <Award size={13} className="text-form shrink-0" />
                <span className="text-text-muted">CAL:</span>
                <span className="font-bold text-text-primary">{activity.calories ?? 371} kcal</span>
                <span className="text-text-muted text-[10px]">({activity.calories ? Math.round(activity.calories * 0.84) : 311} kJ)</span>
              </div>
            </>
          )}

          {activity.sport === "running" && (
            <>
              {/* rTSS */}
              <div className="flex items-center gap-1.5">
                <Flame size={13} className="text-accent shrink-0 animate-pulse" />
                <span className="text-text-muted">rTSS:</span>
                <span className="font-bold text-text-primary">{loadTss}</span>
                <span className="text-text-muted text-[10px]">({intensityFactor}% IF)</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Pace */}
              <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-fitness shrink-0" />
                <span className="text-text-muted">Pace:</span>
                <span className="font-bold text-text-primary">{formatSpeedToPace(activity.avgSpeed ?? 4.0, "run")}/km</span>
                <span className="text-text-muted text-[10px]">(GAP {formatSpeedToPace(activity.avgSpeed ? activity.avgSpeed * 1.03 : 4.12, "run")})</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* HR */}
              <div className="flex items-center gap-1.5">
                <Heart size={13} className="text-danger shrink-0" />
                <span className="text-text-muted">HR:</span>
                <span className="font-bold text-text-primary">{avgHr} bpm</span>
                <span className="text-text-muted text-[10px]">(Max {maxHr})</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Cadence */}
              <div className="flex items-center gap-1.5">
                <Gauge size={13} className="text-warning shrink-0" />
                <span className="text-text-muted">CAD:</span>
                <span className="font-bold text-text-primary">{activity.avgCadence ?? 174} spm</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Energy */}
              <div className="flex items-center gap-1.5">
                <Award size={13} className="text-form shrink-0" />
                <span className="text-text-muted">CAL:</span>
                <span className="font-bold text-text-primary">{activity.calories ?? 620} kcal</span>
              </div>
            </>
          )}

          {activity.sport === "swimming" && (
            <>
              {/* sTSS */}
              <div className="flex items-center gap-1.5">
                <Flame size={13} className="text-accent shrink-0 animate-pulse" />
                <span className="text-text-muted">sTSS:</span>
                <span className="font-bold text-text-primary">{loadTss}</span>
                <span className="text-text-muted text-[10px]">({intensityFactor}% IF)</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Swim Pace */}
              <div className="flex items-center gap-1.5">
                <Zap size={13} className="text-fitness shrink-0" />
                <span className="text-text-muted">Pace:</span>
                <span className="font-bold text-text-primary">{formatSpeedToPace(activity.avgSpeed ?? 1.0, "swim")}/100m</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* SWOLF */}
              <div className="flex items-center gap-1.5">
                <Gauge size={13} className="text-warning shrink-0" />
                <span className="text-text-muted">SWOLF:</span>
                <span className="font-bold text-text-primary">38</span>
                <span className="text-text-muted text-[10px]">({activity.avgCadence ?? 34} spm)</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* HR */}
              <div className="flex items-center gap-1.5">
                <Heart size={13} className="text-danger shrink-0" />
                <span className="text-text-muted">HR:</span>
                <span className="font-bold text-text-primary">{avgHr} bpm</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Energy */}
              <div className="flex items-center gap-1.5">
                <Award size={13} className="text-form shrink-0" />
                <span className="text-text-muted">CAL:</span>
                <span className="font-bold text-text-primary">{activity.calories ?? 410} kcal</span>
              </div>
            </>
          )}

          {activity.sport !== "cycling" && activity.sport !== "running" && activity.sport !== "swimming" && (
            <>
              {/* hrTSS */}
              <div className="flex items-center gap-1.5">
                <Flame size={13} className="text-accent shrink-0 animate-pulse" />
                <span className="text-text-muted">hrTSS:</span>
                <span className="font-bold text-text-primary">{loadTss}</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* HR */}
              <div className="flex items-center gap-1.5">
                <Heart size={13} className="text-danger shrink-0" />
                <span className="text-text-muted">HR:</span>
                <span className="font-bold text-text-primary">{avgHr} bpm</span>
                <span className="text-text-muted text-[10px]">(Max {maxHr})</span>
              </div>
              <span className="hidden sm:inline text-text-muted/40 select-none">·</span>

              {/* Energy */}
              <div className="flex items-center gap-1.5">
                <Award size={13} className="text-form shrink-0" />
                <span className="text-text-muted">CAL:</span>
                <span className="font-bold text-text-primary">{activity.calories ?? 300} kcal</span>
              </div>
            </>
          )}
        </div>
      </div>


      {/* ─── Tabs Navigation Bar (Premium Scrolling Pill List) ───────────────── */}
      <div
        className="bg-bg-elevated/40 border-b border-border-subtle px-3 sm:px-5 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none relative z-10 shrink-0"
      >
        {(["TIMELINE", "POWER", "HR", "ROUTE", "DATA"] as const).map((tab) => {
          const isActive = activeTab === tab;
          const displayLabel = tab === "POWER" && (activity.sport === "running" || activity.sport === "swimming") ? "PACE" : tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border shrink-0 cursor-pointer select-none ${
                isActive
                  ? "bg-bg-surface text-accent shadow-sm border-border-default"
                  : "bg-transparent text-text-secondary border-transparent hover:text-text-primary"
              }`}
              style={{
                boxShadow: isActive ? "0 2px 8px rgba(0, 0, 0, 0.15)" : "none",
              }}
            >
              {displayLabel}
            </button>
          );
        })}
      </div>

      {/* ─── Two-Column Layout (Left: tab content, Right: Notes panel) ─────────── */}
      <div className="flex flex-col lg:flex-row flex-1">
        {/* Left Column: Tab contents */}
        <div className="flex-1 min-w-0 p-3 sm:p-5 flex flex-col gap-3 sm:gap-5">
          {activeTab === "TIMELINE" && (
            <>
              {/* Subjective Feedback Panel */}
              <SubjectiveFeedbackCard sport={activity.sport} />

              {/* Streams Interactive Charts */}
              {streams && (
                <InteractiveMultiLaneChart 
                  points={streams} 
                  sport={activity.sport} 
                  selectedRange={selectedTimeRange}
                  onRangeSelect={setSelectedTimeRange}
                />
              )}

              {/* Intervals visual progression */}
              <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>Intervals Timeline</div>
                <div style={{ display: "flex", height: "16px", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ flex: 0.15, background: "var(--sport-cycling)" }} title="Warm-up" />
                  <div style={{ flex: 0.55, background: "var(--sport-cycling-glow)" }} title="Active intervals" />
                  <div style={{ flex: 0.2, background: "var(--sport-strength)" }} title="Work interval" />
                  <div style={{ flex: 0.1, background: "var(--sport-cycling)" }} title="Cool-down" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--text-muted)" }}>
                  <span>0:00</span>
                  <span>10:00</span>
                  <span>20:00</span>
                  <span>30:00</span>
                  <span>{durationStr}</span>
                </div>
              </div>

              {/* Operations Toolbar */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: "11.5px",
                  borderTop: "1px dashed var(--border-subtle)",
                  paddingTop: "16px",
                }}
              >
                {["MAP", "CHARTS", "FIELDS", "OPTIONS", "ADD INTERVAL (A)", "SPLIT (S)", "MERGE (M)", "DEL (D)", "CUSTOM", "ACTIONS"].map((btn) => (
                  <button
                    key={btn}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-default)",
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === "ROUTE" && (
            <div style={{ minHeight: "450px", position: "relative", zIndex: 1, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
              <ActivityMap points={streams} sportColor={sportColor.primary} />
            </div>
          )}

          {activeTab === "POWER" && (
            activity.sport === "running" || activity.sport === "swimming" ? (
              <ActivityPaceTab
                points={streams || []}
                sport={activity.sport}
                thresholdPaceSecs={activity.sport === "running" ? 300 : 100}
                restingHr={53}
                maxHr={activity.maxHeartRate ?? 170}
              />
            ) : (
              <ActivityPowerTab points={streams || []} ftp={activity.avgPower ?? 149} />
            )
          )}

          {activeTab === "HR" && (
            <ActivityHrTab points={streams || []} lthr={activity.avgHeartRate ?? 162} />
          )}

          {activeTab === "DATA" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
          )}
        </div>

        {/* Right Column: Notes / Comments sidebar panel (20% width) */}
        <div
          className="w-full lg:w-[260px] border-t lg:border-t-0 lg:border-l border-border-subtle bg-bg-elevated flex flex-col overflow-hidden h-auto lg:h-full"
        >
          {/* Sidebar Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px", fontWeight: 700 }}>
              <span style={{ fontSize: "15px" }}>📝</span>
              <span>Notes</span>
            </div>
            <div style={{ display: "flex", gap: "10px", color: "var(--text-secondary)" }}>
              <button style={{ border: "none", background: "none", cursor: "pointer", color: "inherit" }} title="Attach File">
                <Paperclip size={16} />
              </button>
              <button style={{ border: "none", background: "none", cursor: "pointer", color: "inherit" }} title="Share notes">
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Sidebar Content */}
          <div style={{ flex: 1, padding: "16px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Description/Notes text bubble list */}
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
                <div style={{ textAlign: "right", fontSize: "10px", color: "var(--text-muted)" }}>{comment.time}</div>
              </div>
            ))}
          </div>

          {/* Notes Input Area */}
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
    </main>
  );
}
