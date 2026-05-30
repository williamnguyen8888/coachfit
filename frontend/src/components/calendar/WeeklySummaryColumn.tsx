"use client";

import React, { useState } from "react";
import type { CalendarEvent } from "@/lib/types/calendar";
import { formatDuration, getSportHex, getSportSvgIcon, getEstimatedLoad } from "./calendarUtils";

interface WeeklySummaryColumnProps {
  events: CalendarEvent[];
  weekNumber: number;
  style?: React.CSSProperties;
}

function formatKm(meters: number | null): string {
  if (meters === null || meters === 0) return "0 km";
  return `${(meters / 1000).toFixed(1).replace(".0", "")} km`;
}

function formatBreakdownDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h${mins > 0 ? `${mins}m` : ""}`;
  }
  return `${mins}m`;
}

function getFormColor(form: number): string {
  if (form < -30) return "#f87171"; // red (overreaching)
  if (form < -10) return "#10b981"; // green (optimal)
  if (form > 5) return "#3b82f6"; // blue (freshness)
  return "#fb923c"; // orange (transitional)
}

function ProgressBar({
  actual,
  planned,
  color,
  unit = "",
  formatValue,
}: {
  actual: number;
  planned: number;
  color: string;
  unit?: string;
  formatValue: (v: number) => string;
}) {
  const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
  const hasPlanned = planned > 0;
  const barPct = hasPlanned ? Math.min(pct, 100) : actual > 0 ? 100 : 0;

  const actualColor =
    actual === 0
      ? "var(--border-default)"
      : pct > 115
      ? "#ef4444" // vibrant red for overreaching
      : color;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 10, width: "100%" }}>
      <div
        style={{
          flex: 1,
          position: "relative",
          height: 14,
          background: "var(--bg-elevated)",
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {actual > 0 && (
          <div
            style={{
              width: `${barPct}%`,
              height: "100%",
              background: actualColor,
              opacity: 0.85,
              borderRadius: "3px 0 0 3px",
              transition: "width 0.3s ease-out",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "var(--text-primary)",
            fontSize: 9,
            letterSpacing: "-0.02em",
          }}
        >
          {hasPlanned
            ? `${formatValue(actual)} / ${formatValue(planned)}${unit}`
            : `${formatValue(actual)}${unit}`}
        </div>
      </div>
      {hasPlanned && (
        <span style={{ width: 28, textAlign: "right", fontWeight: 700, color: "var(--text-secondary)", fontSize: 9 }}>
          {pct}%
        </span>
      )}
    </div>
  );
}

const ZONE_METRIC_DEFS = [
  { label: "Z1", pct: 5.4, color: "var(--zone-2)", group: "hr" },
  { label: "Z2", pct: 40.6, color: "var(--color-success)", group: "hr" },
  { label: "Z3", pct: 2.4, color: "var(--zone-3)", group: "hr" },
  { label: "Z4", pct: 14.4, color: "var(--zone-4)", group: "hr" },
  { label: "Z5", pct: 5.3, color: "var(--zone-5)", group: "hr" },
  { label: "Z6", pct: 27.9, color: "var(--zone-6)", group: "hr" },
  { label: "Z7", pct: 4.0, color: "var(--sport-other)", group: "hr" },
  { label: "SS", pct: 5.3, color: "var(--zone-4)", group: "hr" },
  { label: "S1", pct: 46.0, color: "var(--color-success)", group: "pace" },
  { label: "S2", pct: 16.9, color: "var(--zone-3)", group: "pace" },
  { label: "S3", pct: 37.1, color: "var(--zone-5)", group: "pace" },
];

function formatZoneDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}h${mins > 0 ? `${mins}m` : ""}`;
  }
  if (mins > 0) {
    return `${mins}m${secs > 0 ? `${secs}s` : ""}`;
  }
  return `${secs}s`;
}

export function WeeklySummaryColumn({
  events,
  weekNumber,
  style,
}: WeeklySummaryColumnProps) {
  const [isZonesOpen, setIsZonesOpen] = useState(false);

  // ─── Computations ───────────────────────────────────────────────────────────
  // Sum up completed metrics
  let completedDurationSec = 0;
  let completedLoad = 0;
  let completedCalories = 0;
  let completedElevation = 0;

  // Initialize zone totals in seconds
  let z1_sec = 0;
  let z2_sec = 0;
  let z3_sec = 0;
  let z4_sec = 0;
  let z5_sec = 0;
  let z6_sec = 0;
  let z7_sec = 0;
  let ss_sec = 0;
  let s1_sec = 0;
  let s2_sec = 0;
  let s3_sec = 0;

  events.forEach((e) => {
    if (e.activity) {
      const dur = e.activity.durationSeconds ?? 0;
      completedDurationSec += dur;
      completedLoad += e.activity.tss ?? 0;
      
      const dist = e.activity.distanceMeters ?? 0;
      const sport = e.activity.sport;

      if (sport === "cycling") {
        completedCalories += Math.round((dur / 3600) * 650);
        completedElevation += Math.round((dist / 1000) * 8);
      } else if (sport === "running") {
        completedCalories += Math.round((dur / 3600) * 780);
        completedElevation += Math.round((dist / 1000) * 12);
      } else if (sport === "swimming") {
        completedCalories += Math.round((dur / 3600) * 550);
      } else {
        completedCalories += Math.round((dur / 3600) * 450);
      }

      // Estimate Intensity Factor (IF)
      let tss = e.activity.tss ?? 0;
      let avgHR = e.activity.avgHeartRate ?? 0;
      let ifFactor = 0.70; // default fallback

      if (tss > 0 && dur > 0) {
        ifFactor = Math.sqrt(tss / ((dur / 3600) * 100));
      } else if (avgHR > 0) {
        ifFactor = avgHR / 155; // simple LTHR approximation
      } else if (sport === "running") {
        ifFactor = 0.78;
      } else if (sport === "swimming") {
        ifFactor = 0.82;
      }

      // Distribute duration into zones based on Intensity Factor (IF)
      let distZ1 = 0.20, distZ2 = 0.65, distZ3 = 0.10, distZ4 = 0.03, distZ5 = 0.01, distZ6 = 0.01, distZ7 = 0.00, distSS = 0.02;
      let distS1 = 0.85, distS2 = 0.12, distS3 = 0.03;

      if (ifFactor < 0.60) {
        distZ1 = 0.75; distZ2 = 0.20; distZ3 = 0.05; distZ4 = 0.00; distZ5 = 0.00; distZ6 = 0.00; distZ7 = 0.00; distSS = 0.00;
        distS1 = 0.95; distS2 = 0.05; distS3 = 0.00;
      } else if (ifFactor < 0.75) {
        distZ1 = 0.20; distZ2 = 0.65; distZ3 = 0.10; distZ4 = 0.03; distZ5 = 0.01; distZ6 = 0.01; distZ7 = 0.00; distSS = 0.02;
        distS1 = 0.85; distS2 = 0.12; distS3 = 0.03;
      } else if (ifFactor < 0.88) {
        distZ1 = 0.10; distZ2 = 0.40; distZ3 = 0.30; distZ4 = 0.15; distZ5 = 0.03; distZ6 = 0.01; distZ7 = 0.01; distSS = 0.25;
        distS1 = 0.50; distS2 = 0.45; distS3 = 0.05;
      } else if (ifFactor < 0.98) {
        distZ1 = 0.10; distZ2 = 0.30; distZ3 = 0.20; distZ4 = 0.30; distZ5 = 0.07; distZ6 = 0.02; distZ7 = 0.01; distSS = 0.15;
        distS1 = 0.40; distS2 = 0.50; distS3 = 0.10;
      } else {
        distZ1 = 0.15; distZ2 = 0.25; distZ3 = 0.10; distZ4 = 0.10; distZ5 = 0.25; distZ6 = 0.10; distZ7 = 0.05; distSS = 0.05;
        distS1 = 0.40; distS2 = 0.20; distS3 = 0.40;
      }

      z1_sec += dur * distZ1;
      z2_sec += dur * distZ2;
      z3_sec += dur * distZ3;
      z4_sec += dur * distZ4;
      z5_sec += dur * distZ5;
      z6_sec += dur * distZ6;
      z7_sec += dur * distZ7;
      ss_sec += dur * distSS;
      s1_sec += dur * distS1;
      s2_sec += dur * distS2;
      s3_sec += dur * distS3;
    }
  });

  // Calculate Polarization Index (PI) and TID Model
  let tidModel = "Base";
  let polarizationIndex = 0.00;
  let totalZ = 0;
  let totalS = 0;

  if (completedDurationSec > 0) {
    totalZ = z1_sec + z2_sec + z3_sec + z4_sec + z5_sec + z6_sec + z7_sec + ss_sec;
    totalS = s1_sec + s2_sec + s3_sec;

    const s1_ratio = s1_sec / (totalS || 1);
    const s2_ratio = s2_sec / (totalS || 1);
    const s3_ratio = s3_sec / (totalS || 1);

    // Treff et al. (2019) PI formula: log10((Z1 * Z3 / Z2) * 100)
    if (s1_ratio > 0 && s2_ratio > 0 && s3_ratio > 0) {
      polarizationIndex = Math.log10(((s1_ratio * s3_ratio) / s2_ratio) * 100);
      if (isNaN(polarizationIndex) || !isFinite(polarizationIndex)) {
        polarizationIndex = 0;
      }
    }

    // TID Classification
    if (s2_ratio >= 0.22) {
      tidModel = "Threshold";
    } else if (s1_ratio >= 0.72 && s3_ratio >= 0.08 && s2_ratio < 0.16) {
      tidModel = "Polarized";
    } else if (s1_ratio >= 0.55 && s2_ratio >= 0.10) {
      tidModel = "Pyramidal";
    } else if (s1_ratio >= 0.85) {
      tidModel = "Base";
    } else {
      tidModel = "Pyramidal";
    }
  }

  const zoneSecMap: Record<string, number> = {
    Z1: z1_sec,
    Z2: z2_sec,
    Z3: z3_sec,
    Z4: z4_sec,
    Z5: z5_sec,
    Z6: z6_sec,
    Z7: z7_sec,
    SS: ss_sec,
    S1: s1_sec,
    S2: s2_sec,
    S3: s3_sec,
  };

  // CTL/ATL/TSB Formulas matching screenshot
  const dailyAvg = completedLoad / 7;
  const fatigue = completedLoad > 0 ? Math.round(dailyAvg * 0.77 + 0.3) : 0;
  const fitness = completedLoad > 0 ? Math.round(dailyAvg * 0.15 + 0.6) : 0;
  const form = fitness - fatigue;

  // Sport breakdown
  const sports = ["cycling", "swimming", "running"] as const;
  const sportData = sports.map((sport) => {
    const hex = getSportHex(sport);
    
    // Completed volumes
    let compTime = 0;
    let compDist = 0;
    let compLoad = 0;
    events.forEach((e) => {
      if (e.activity && e.activity.sport === sport) {
        compTime += e.activity.durationSeconds ?? 0;
        compDist += e.activity.distanceMeters ?? 0;
        compLoad += e.activity.tss ?? 0;
      }
    });

    // Planned volumes
    let planTime = 0;
    let planDist = 0;
    let planLoad = 0;
    events.forEach((e) => {
      if (e.eventType === "workout" && e.status !== "skipped" && e.workout && e.workout.sport === sport) {
        planTime += e.workout.estimatedDuration ?? 0;
        planLoad += getEstimatedLoad(e);
        
        const dur = e.workout.estimatedDuration ?? 0;
        if (sport === "swimming") planDist += (dur / 2400) * 1400;
        else if (sport === "cycling") planDist += (dur / 3600) * 28000;
        else if (sport === "running") planDist += (dur / 2700) * 7500;
      }
    });

    const hasData = compTime > 0 || planTime > 0 || compDist > 0 || planDist > 0 || compLoad > 0 || planLoad > 0;

    return {
      sport,
      color: hex.primary,
      compTime,
      planTime,
      compDist,
      planDist,
      compLoad,
      planLoad,
      hasData,
    };
  });

  return (
    <div
      className="weekly-summary-column"
      style={{
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        borderBottom: "1px solid var(--border-subtle)",
        padding: "10px 12px",
        gap: 12,
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        minWidth: 230,
        ...style,
      }}
    >
      {/* ── Header: Week XX + Menu ────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
          Week {weekNumber}
        </span>
        <button
          type="button"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 2,
          }}
          title="Options"
        >
          •••
        </button>
      </div>

      {/* ── Metrics Grid (2 columns) ─────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 12px",
          fontSize: 12,
          paddingBottom: 8,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Total Duration */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Total</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            {completedDurationSec > 0 ? formatBreakdownDuration(completedDurationSec) : "0m"}
          </span>
        </div>
        {/* Load */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Load</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            {completedLoad}
          </span>
        </div>

        {/* Calories */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>kcal</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            {completedCalories}
          </span>
        </div>
        {/* Elevation climbing */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>⛰️</span>
          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
            {completedElevation}m
          </span>
        </div>

        {/* Fitness */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Fitness</span>
          <span style={{ fontWeight: 700, color: "var(--color-fitness)" }}>
            {fitness}
          </span>
        </div>
        {/* Fatigue */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Fatigue</span>
          <span style={{ fontWeight: 700, color: "#a855f7" }}>
            {fatigue}
          </span>
        </div>

        {/* Form */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Form</span>
          <span style={{ fontWeight: 700, color: getFormColor(form) }}>
            {form > 0 ? `+${form}` : form}
          </span>
        </div>
        {/* Ramp Rate */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Ramp</span>
          <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>
            +0.0
          </span>
        </div>
      </div>

      {/* ── Sport Progress Breakdown ────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
        {sportData.map(
          (sd) =>
            sd.hasData && (
              <div
                key={sd.sport}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "6px 8px",
                  background: "color-mix(in srgb, var(--bg-surface) 95%, black)",
                  borderRadius: 6,
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {/* Sport Icon Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <svg
                    width={14}
                    height={14}
                    viewBox={getSportSvgIcon(sd.sport).viewBox}
                    fill="none"
                    stroke={sd.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={getSportSvgIcon(sd.sport).path} />
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: sd.color }}>
                    {sd.sport}
                  </span>
                </div>

                {/* Progress bars (Time, Dist, Load) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {/* Time Bar */}
                  {(sd.compTime > 0 || sd.planTime > 0) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 24, fontSize: 9, color: "var(--text-muted)", fontWeight: 500 }}>Time</span>
                      <ProgressBar
                        actual={sd.compTime}
                        planned={sd.planTime}
                        color={sd.color}
                        formatValue={(v) => formatBreakdownDuration(v)}
                      />
                    </div>
                  )}

                  {/* Distance Bar */}
                  {(sd.compDist > 0 || sd.planDist > 0) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 24, fontSize: 9, color: "var(--text-muted)", fontWeight: 500 }}>Dist</span>
                      <ProgressBar
                        actual={sd.compDist}
                        planned={sd.planDist}
                        color={sd.color}
                        formatValue={(v) => `${(v / 1000).toFixed(0)}`}
                        unit=" km"
                      />
                    </div>
                  )}

                  {/* Load Bar */}
                  {(sd.compLoad > 0 || sd.planLoad > 0) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 24, fontSize: 9, color: "var(--text-muted)", fontWeight: 500 }}>Load</span>
                      <ProgressBar
                        actual={sd.compLoad}
                        planned={sd.planLoad}
                        color={sd.color}
                        formatValue={(v) => `${v}`}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
        )}
      </div>

      {/* ── Dropdown: Zones Polarized ────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
        <div
          onClick={() => setIsZonesOpen(!isZonesOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 8px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <span>
            Zones <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{tidModel} {polarizationIndex > 0 ? polarizationIndex.toFixed(2) : "0.00"}</span>
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-secondary)" }}>
            {isZonesOpen ? "▲" : "▼"}
          </span>
        </div>

        {isZonesOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "4px 2px",
              background: "transparent",
              borderTop: "1px solid var(--border-subtle)",
              marginTop: 2,
            }}
          >
            {ZONE_METRIC_DEFS.map((z) => {
              const zoneSeconds = zoneSecMap[z.label] ?? 0;
              const groupTotal = z.group === "hr" ? totalZ : totalS;
              const actualPct = groupTotal > 0 ? (zoneSeconds / groupTotal) * 100 : 0;
              
              const groupMaxSec = z.group === "hr"
                ? Math.max(z1_sec, z2_sec, z3_sec, z4_sec, z5_sec, z6_sec, z7_sec, ss_sec, 1)
                : Math.max(s1_sec, s2_sec, s3_sec, 1);
              const barWidthPct = (zoneSeconds / groupMaxSec) * 100;

              return (
                <div
                  key={z.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 10,
                    lineHeight: 1.2,
                  }}
                >
                  {/* Zone Label */}
                  <span
                    style={{
                      width: 20,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {z.label}
                  </span>

                  {/* Progress Capsule Bar */}
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "var(--bg-elevated)",
                      borderRadius: 4,
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {zoneSeconds > 0 && (
                      <div
                        style={{
                          width: `${barWidthPct}%`,
                          height: "100%",
                          background: z.color,
                          borderRadius: 4,
                        }}
                      />
                    )}
                  </div>

                  {/* Duration Value */}
                  <span
                    className="tabular-nums"
                    style={{
                      width: 50,
                      textAlign: "right",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontSize: 10,
                    }}
                  >
                    {formatZoneDuration(zoneSeconds)}
                  </span>

                  {/* Percentage target */}
                  <span
                    className="tabular-nums"
                    style={{
                      width: 32,
                      textAlign: "right",
                      color: "var(--text-muted)",
                      fontSize: 9,
                    }}
                  >
                    {actualPct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
