"use client";

import type { WellnessEntry } from "@/lib/types/wellness";
import type { DailyHealthSummary, SleepRecord } from "@/lib/services/health";

interface DailyWellnessSummaryProps {
  wellness?: WellnessEntry;
  health?: DailyHealthSummary;
  sleep?: SleepRecord;
  compact?: boolean;
}

function formatSleepDuration(decimalHours: number | null, totalMinutes: number | null): string | null {
  if (totalMinutes && totalMinutes > 0) {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h${mins > 0 ? `${mins}m` : ""}`;
  }
  if (decimalHours && decimalHours > 0) {
    const hrs = Math.floor(decimalHours);
    const mins = Math.round((decimalHours - hrs) * 60);
    return `${hrs}h${mins > 0 ? `${mins}m` : ""}`;
  }
  return null;
}

export function DailyWellnessSummary({
  wellness,
  health,
  sleep,
  compact = false,
}: DailyWellnessSummaryProps) {
  // If we have absolutely no wellness, health, or sleep data, don't render anything
  if (!wellness && !health && !sleep) return null;

  const sleepDuration = formatSleepDuration(
    wellness?.sleepHours ?? null,
    sleep?.totalMinutes ?? null
  );
  const sleepScore = sleep?.score ?? null;
  const sleepQuality = wellness?.sleepQuality ?? null;
  const weight = wellness?.weightKg ?? health?.weightKg ?? null;
  const restingHr = wellness?.restingHr ?? health?.restingHr ?? null;
  const hrv = wellness?.hrv ?? health?.hrv ?? null;
  const stress = wellness?.stressLevel ?? null;
  const steps = health?.steps ?? null;

  const hasAnyData =
    sleepDuration ||
    sleepScore !== null ||
    sleepQuality !== null ||
    weight !== null ||
    restingHr !== null ||
    hrv !== null ||
    stress !== null ||
    steps !== null;

  if (!hasAnyData) return null;

  // Render sleep group: 🌙 6h13m 77 Q3
  const renderSleep = () => {
    if (!sleepDuration && sleepScore === null && sleepQuality === null) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
        <span style={{ fontSize: 11 }}>🌙</span>
        {sleepDuration && (
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
            {sleepDuration}
          </span>
        )}
        {(sleepScore !== null || sleepQuality !== null) && (
          <span style={{ color: "var(--color-warning)", fontWeight: 700, marginLeft: 1 }}>
            {[
              sleepScore !== null ? `${sleepScore}` : null,
              sleepQuality !== null ? `Q${sleepQuality}` : null,
            ]
              .filter(Boolean)
              .join(" ")}
          </span>
        )}
      </div>
    );
  };

  // Render weight: 75kg
  const renderWeight = () => {
    if (weight === null) return null;
    return (
      <span
        style={{
          color: "var(--text-muted)",
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {weight}kg
      </span>
    );
  };

  // Render heart: ❤️51 42 ms
  const renderHeartAndHrv = () => {
    if (restingHr === null && hrv === null) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 3, color: "#f43f5e", fontWeight: 600, flexShrink: 0 }}>
        {restingHr !== null && (
          <>
            <span style={{ fontSize: 10 }}>❤️</span>
            <span>{restingHr}</span>
          </>
        )}
        {hrv !== null && (
          <span style={{ marginLeft: restingHr !== null ? 2 : 0 }}>{hrv} ms</span>
        )}
      </div>
    );
  };

  // Render readiness/stress: 📈 54
  const renderReadiness = () => {
    if (stress === null) return null;
    // Format stress: if Garmin sync, stress is 1-100.
    const stressVal = stress <= 10 ? stress * 10 : stress;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 2, color: "#3b82f6", fontWeight: 600, flexShrink: 0 }}>
        <span style={{ fontSize: 11 }}>📈</span>
        <span>{stressVal}</span>
      </div>
    );
  };

  // Render steps: 👣 15837
  const renderSteps = () => {
    if (steps === null) return null;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 2, color: "#10b981", fontWeight: 600, flexShrink: 0 }}>
        <span style={{ fontSize: 11 }}>👣</span>
        <span>{steps.toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div
      className="daily-wellness-summary"
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: compact ? "2px 6px" : "4px 8px",
        alignItems: "center",
        justifyContent: "center",
        fontSize: compact ? 10 : 11,
        padding: compact ? "2px 6px" : "4px 8px",
        lineHeight: 1.25,
        borderBottom: "1px solid var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-surface) 40%, transparent)",
        width: "100%",
        boxSizing: "border-box",
        minHeight: 24,
      }}
    >
      {renderSleep()}
      {renderWeight()}
      {renderHeartAndHrv()}
      {renderReadiness()}
      {renderSteps()}
    </div>
  );
}
