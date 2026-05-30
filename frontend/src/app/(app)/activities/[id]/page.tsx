"use client";

import * as React from "react";
import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Paperclip, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ActivityDetailSkeleton } from "@/components/activities/detail/ActivityDetailSkeleton";
import { ActivityMap } from "@/components/activities/detail/ActivityMap";
import { ActivityLaps } from "@/components/activities/detail/ActivityLaps";
import { ActivityMetrics } from "@/components/activities/detail/ActivityMetrics";
import { ActivitySourceInfo } from "@/components/activities/detail/ActivitySourceInfo";
import { InteractiveMultiLaneChart } from "@/components/activities/detail/InteractiveMultiLaneChart";
import { ActivityPowerTab } from "@/components/activities/detail/ActivityPowerTab";
import { ActivityHrTab } from "@/components/activities/detail/ActivityHrTab";
import { activitiesService } from "@/lib/services/activities";
import type { ActivityDetail, ActivityLap, StreamPoint, Sport } from "@/lib/types/activity";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutesSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
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
      className="flex-1 min-h-screen bg-[var(--bg-default)] text-[var(--text-primary)]"
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* ─── Premium intervals.icu Header Bar ──────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          {/* Title and date */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={handleBack}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${sportColor.light}88 0%, ${sportColor.light}44 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${sportColor.primary}40`,
                fontSize: "20px",
                cursor: "pointer",
              }}
              title="Back to Calendar"
            >
              <span>{SPORT_ICONS[activity.sport] ?? "🏋️"}</span>
            </button>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "14px" }}>
              <button style={{ border: "none", background: "none", cursor: "pointer", padding: "2px", color: "var(--text-muted)" }}>
                <ChevronLeft size={16} />
              </button>
              <button style={{ border: "none", background: "none", cursor: "pointer", padding: "2px", color: "var(--text-muted)" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                {dateFormatted}
              </div>
              <h1 style={{ fontSize: "18px", fontWeight: 700, margin: "2px 0 0", color: "var(--text-primary)" }}>
                {distanceKm} km / {durationStr}
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)", marginLeft: "8px" }}>
                  Avg {avgSpeedKmh} km/h
                </span>
              </h1>
            </div>
          </div>

          {/* Advanced scientific metrics grid */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", fontSize: "12px" }}>
            {/* Column 1: Intensity / Load */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Intensity</span>
                <span style={{ fontWeight: 700 }}>{intensityFactor}%</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Load</span>
                <span style={{ fontWeight: 700, color: "var(--color-accent)" }}>{loadTss}</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>RPE</span>
                <span style={{ fontWeight: 700 }}>5 / Normal</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Compliance</span>
                <span style={{ fontWeight: 700, color: "var(--color-success)" }}>Coach 91%</span>
              </div>
            </div>

            {/* Column 2: Heart Rate stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Avg HR</span>
                <span style={{ fontWeight: 700 }}>{avgHr} bpm</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Max HR</span>
                <span style={{ fontWeight: 700, color: "var(--color-danger)" }}>{maxHr} bpm</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>HRc</span>
                <span style={{ fontWeight: 700 }}>18</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>TRIMP</span>
                <span style={{ fontWeight: 700 }}>73</span>
              </div>
            </div>

            {/* Column 3: Power stats */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Norm Power</span>
                <span style={{ fontWeight: 700 }}>{normPower}w</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Avg Power</span>
                <span style={{ fontWeight: 700 }}>{avgPower}w</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Variability</span>
                <span style={{ fontWeight: 700 }}>1.05</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Power/HR</span>
                <span style={{ fontWeight: 700 }}>0.93</span>
              </div>
            </div>

            {/* Column 4: Fitness & Fatigue */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Fitness</span>
                <span style={{ fontWeight: 700 }}>5</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Fatigue</span>
                <span style={{ fontWeight: 700 }}>31</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Form</span>
                <span style={{ fontWeight: 700, color: "var(--color-danger)" }}>-25</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Cadence</span>
                <span style={{ fontWeight: 700 }}>{activity.avgCadence ?? 96} rpm</span>
              </div>
            </div>

            {/* Column 5: Work & Calories */}
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Work</span>
                <span style={{ fontWeight: 700 }}>311 kJ</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>Calories</span>
                <span style={{ fontWeight: 700 }}>{activity.calories ?? 371} kcal</span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span style={{ color: "var(--text-muted)" }}>CHO Used</span>
                <span style={{ fontWeight: 700 }}>43g</span>
              </div>
              <div style={{ display: "flex", gap: "8px", fontSize: "10.5px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "2px" }}>
                - Garmin Edge 840
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs Navigation Bar ──────────────────────────────────────────────── */}
      <div
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-elevated)",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: "24px",
          height: "44px",
        }}
      >
        {(["TIMELINE", "POWER", "HR", "ROUTE", "DATA"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: "none",
                background: "none",
                fontSize: "12.5px",
                fontWeight: 700,
                color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
                cursor: "pointer",
                height: "100%",
                padding: "0 4px",
                position: "relative",
                borderBottom: isActive ? "2.5px solid var(--color-accent)" : "none",
                transition: "color 150ms ease",
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ─── Two-Column Layout (Left: tab content, Right: Notes panel) ─────────── */}
      <div style={{ flex: 1, display: "flex", flexWrap: "wrap", overflow: "hidden" }}>
        {/* Left Column: Tab contents */}
        <div style={{ flex: 1, minWidth: "300px", padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
          {activeTab === "TIMELINE" && (
            <>
              {/* Streams Interactive Charts */}
              {streams && (
                <InteractiveMultiLaneChart points={streams} sport={activity.sport} />
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
                  <span>42:54</span>
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
                {["MAP", "CHARTS", "FIELDS", "OPTIONS", "ADD INTERVAL (A)", "SPLIT (S)", "MERGE (M)", "DEL (D)", "CUSTOM", "ACTIVITY CHARTS", "ACTIONS"].map((btn) => (
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
            <div style={{ minHeight: "450px" }}>
              <ActivityMap points={streams} sportColor={sportColor.primary} />
            </div>
          )}

          {activeTab === "POWER" && (
            <ActivityPowerTab points={streams || []} ftp={activity.avgPower ?? 149} />
          )}

          {activeTab === "HR" && (
            <ActivityHrTab points={streams || []} lthr={activity.avgHeartRate ?? 162} />
          )}

          {activeTab === "DATA" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ActivityLaps laps={laps} />
                <ActivityMetrics activity={activity} />
              </div>
              <ActivitySourceInfo activity={activity} />
            </div>
          )}
        </div>

        {/* Right Column: Notes / Comments sidebar panel (20% width) */}
        <div
          style={{
            width: "260px",
            borderLeft: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
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
