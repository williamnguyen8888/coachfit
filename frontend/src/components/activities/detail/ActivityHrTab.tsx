"use client";

import { useState, useMemo } from "react";
import type { StreamPoint } from "@/lib/types/activity";

interface ActivityHrTabProps {
  points: StreamPoint[];
  lthr?: number; // default to 154
  restingHr?: number; // default to 53
  maxHr?: number; // default to 170
  estimatedLoad?: number; // default to 48
  actualLoad?: number; // default to 49
}

const ZONE_COLORS: Record<number, string> = {
  1: "#0D9488", // Teal/Recovery
  2: "#22C55E", // Green/Aerobic
  3: "#EAB308", // Yellow/Tempo
  4: "#F97316", // Orange/SubThreshold
  5: "#EF4444", // Red/SuperThreshold
  6: "#A855F7", // Purple/Aerobic Capacity
  7: "#EC4899", // Pink/Anaerobic
};

const ZONE_NAMES: Record<number, string> = {
  1: "Recovery",
  2: "Aerobic",
  3: "Tempo",
  4: "SubThreshold",
  5: "SuperThreshold",
  6: "Aerobic Capacity",
  7: "Anaerobic",
};

const ZONE_RANGES: Record<number, { minPct: number; maxPct: number | null }> = {
  1: { minPct: 0, maxPct: 0.80 },
  2: { minPct: 0.81, maxPct: 0.89 },
  3: { minPct: 0.90, maxPct: 0.93 },
  4: { minPct: 0.94, maxPct: 0.99 },
  5: { minPct: 1.00, maxPct: 1.02 },
  6: { minPct: 1.03, maxPct: 1.05 },
  7: { minPct: 1.06, maxPct: null },
};

function formatDuration(secs: number): string {
  if (secs <= 0) return "0s";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  if (m > 0) return `${m}m${s > 0 ? `${s}s` : ""}`;
  return `${s}s`;
}

export function ActivityHrTab({
  points,
  lthr = 154,
  restingHr = 53,
  maxHr = 170,
  estimatedLoad = 48,
  actualLoad = 49,
}: ActivityHrTabProps) {
  // Interactive chart states
  const [hoverHistoIdx, setHoverHistoIdx] = useState<number | null>(null);
  const [hoverCurveIdx, setHoverCurveIdx] = useState<number | null>(null);
  const [hoverCumIdx, setHoverCumIdx] = useState<number | null>(null);

  const hasHR = useMemo(() => points.some((p) => p.hr != null && p.hr > 0), [points]);

  // ─── 1. Calculate Zone Durations ─────────────────────────────────────────
  const { zoneDurations, totalSeconds } = useMemo(() => {
    const durations: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    let total = 0;

    if (!hasHR) {
      // Mock durations matching 42m03s (2523s) from the screenshot
      durations[1] = 692; // Z1: 11m32s
      durations[2] = 347; // Z2: 5m47s
      durations[3] = 275; // Z3: 4m35s
      durations[4] = 742; // Z4: 12m22s
      durations[5] = 399; // Z5: 6m39s
      durations[6] = 68;  // Z6: 1m08s
      durations[7] = 0;   // Z7: 0s
      total = 2523;
    } else {
      points.forEach((p) => {
        const hr = p.hr;
        if (hr != null) {
          total++;
          const pct = hr / lthr;
          let zoneKey = 2;

          if (pct <= 0.80) zoneKey = 1;
          else if (pct <= 0.89) zoneKey = 2;
          else if (pct <= 0.93) zoneKey = 3;
          else if (pct <= 0.99) zoneKey = 4;
          else if (pct <= 1.02) zoneKey = 5;
          else if (pct <= 1.05) zoneKey = 6;
          else zoneKey = 7;

          durations[zoneKey as keyof typeof durations]++;
        }
      });
    }

    return { zoneDurations: durations, totalSeconds: total || 1 };
  }, [points, lthr, hasHR]);

  // ─── 2. HR Distribution Histogram calculation ────────────────────────────
  const histogramBuckets = useMemo(() => {
    const buckets = [
      { label: "80", count: 0 },
      { label: "100", count: 0 },
      { label: "120", count: 0 },
      { label: "140", count: 0 },
      { label: "160", count: 0 },
    ];

    if (!hasHR) {
      // Mock histogram aligned to intervals.icu screenshot
      buckets[0].count = 10;
      buckets[1].count = 180;
      buckets[2].count = 520;
      buckets[3].count = 1200;
      buckets[4].count = 613;
    } else {
      points.forEach((p) => {
        const h = p.hr ?? 0;
        if (h <= 90) buckets[0].count++;
        else if (h <= 110) buckets[1].count++;
        else if (h <= 130) buckets[2].count++;
        else if (h <= 150) buckets[3].count++;
        else buckets[4].count++;
      });
    }

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({
      ...b,
      heightPct: (b.count / maxCount) * 100,
    }));
  }, [points, hasHR]);

  // ─── 3. HR Duration Curve calculation ────────────────────────────────────
  const hrCurve = useMemo(() => {
    if (!hasHR) {
      // Mock peak HR curve matching the ride efforts
      return [
        { label: "1s", bpm: 159 },
        { label: "5s", bpm: 159 },
        { label: "10s", bpm: 158 },
        { label: "30s", bpm: 157 },
        { label: "1m", bpm: 157 },
        { label: "2m", bpm: 156 },
        { label: "5m", bpm: 155 },
        { label: "10m", bpm: 154 },
        { label: "20m", bpm: 151 },
        { label: "30m", bpm: 135 },
      ];
    }

    const hrStream = points.map((p) => p.hr ?? 0);
    const totalPoints = hrStream.length;
    const targetDurations = [
      { secs: 1, label: "1s" },
      { secs: 5, label: "5s" },
      { secs: 10, label: "10s" },
      { secs: 30, label: "30s" },
      { secs: 60, label: "1m" },
      { secs: 120, label: "2m" },
      { secs: 300, label: "5m" },
      { secs: 600, label: "10m" },
      { secs: 1200, label: "20m" },
      { secs: 1800, label: "30m" },
    ];

    return targetDurations
      .filter((d) => d.secs <= totalPoints)
      .map((d) => {
        let maxAvg = 0;
        let currentSum = 0;
        for (let i = 0; i < d.secs; i++) {
          currentSum += hrStream[i];
        }
        maxAvg = currentSum / d.secs;

        for (let i = d.secs; i < totalPoints; i++) {
          currentSum = currentSum - hrStream[i - d.secs] + hrStream[i];
          const avg = currentSum / d.secs;
          if (avg > maxAvg) maxAvg = avg;
        }

        return {
          label: d.label,
          bpm: Math.round(maxAvg),
        };
      });
  }, [points, hasHR]);

  // ─── 4. HR Cumulative Time Curve calculation ─────────────────────────────
  const cumulativePoints = useMemo(() => {
    // Generate 10 points between 110 bpm and maxHr
    const numPoints = 10;
    const step = (maxHr - 110) / numPoints;
    const hrScale: number[] = [];
    for (let i = 0; i <= numPoints; i++) {
      hrScale.push(Math.round(110 + i * step));
    }

    const hrStream = points.map((p) => p.hr ?? 0);

    return hrScale.map((h) => {
      let count = 0;
      if (!hasHR) {
        // Mock downward curve matching screenshot
        const ratio = (maxHr - h) / (maxHr - 110);
        count = Math.round(ratio * ratio * 2000);
      } else {
        count = hrStream.filter((val) => val >= h).length;
      }

      return {
        bpm: h,
        seconds: count,
      };
    });
  }, [points, maxHr, hasHR]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        justifyContent: "space-between",
        background: "var(--bg-elevated)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Component 1: Heart Rate Zones Table */}
      <div
        style={{
          flex: "1 1 230px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          minWidth: "230px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {[1, 2, 3, 4, 5, 6, 7].map((zNum) => {
            const secs = zoneDurations[zNum] || 0;
            const pct = (secs / totalSeconds) * 100;
            const color = ZONE_COLORS[zNum];
            const name = ZONE_NAMES[zNum];
            const range = ZONE_RANGES[zNum];

            const minB = Math.round(lthr * range.minPct);
            const maxB = range.maxPct ? Math.round(lthr * range.maxPct) : maxHr;
            const rangeStr = range.maxPct ? `${minB}-${maxB}` : `>${minB}`;

            return (
              <div key={zNum} style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "11px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-primary)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "1px", background: color }} />
                    <span style={{ fontWeight: 600 }}>
                      Z{zNum} {name}
                    </span>
                  </div>
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                    {rangeStr} bpm
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, height: "5px", background: "var(--bg-input)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px" }} />
                  </div>
                  <span style={{ width: "42px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 600, fontSize: "10px", color: secs > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {formatDuration(secs)}
                  </span>
                  <span style={{ width: "32px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontSize: "10px", color: pct > 0 ? "var(--text-secondary)" : "var(--text-muted)" }}>
                    {pct > 0 ? `${pct.toFixed(1)}%` : "0.0%"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Component 2: HR Distribution Histogram */}
      <div
        style={{
          flex: "1 1 150px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          minWidth: "150px",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>HR DISTRIBUTION</span>
          <span style={{ fontSize: "10px", color: "var(--text-muted)", cursor: "pointer" }}>✏️</span>
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: "4px", minHeight: "180px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "4px", position: "relative" }}>
          {histogramBuckets.map((b, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoverHistoIdx(idx)}
              onMouseLeave={() => setHoverHistoIdx(null)}
            >
              <div
                style={{
                  width: "100%",
                  height: `${b.heightPct}%`,
                  background: "var(--color-danger)",
                  opacity: hoverHistoIdx === null ? 0.85 : hoverHistoIdx === idx ? 1.0 : 0.35,
                  borderRadius: "1px 1px 0 0",
                  transition: "all 0.2s ease",
                  boxShadow: hoverHistoIdx === idx ? "0 0 8px var(--color-danger)" : "none",
                }}
              />
            </div>
          ))}

          {/* Floating Glassmorphic Tooltip */}
          {hoverHistoIdx !== null && (
            <div
              style={{
                position: "absolute",
                left: `${((hoverHistoIdx + 0.5) / histogramBuckets.length) * 100}%`,
                bottom: `calc(${histogramBuckets[hoverHistoIdx].heightPct}% + 10px)`,
                transform: "translateX(-50%)",
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                pointerEvents: "none",
                zIndex: 10,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
                whiteSpace: "nowrap",
                fontSize: "10px",
                color: "var(--text-primary)",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--color-danger)" }}>
                {histogramBuckets[hoverHistoIdx].label} bpm Bucket
              </div>
              <div>
                Duration: <strong style={{ color: "var(--text-primary)" }}>{formatDuration(histogramBuckets[hoverHistoIdx].count)}</strong>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "9px" }}>
                {((histogramBuckets[hoverHistoIdx].count / totalSeconds) * 100).toFixed(1)}% of ride
              </div>
            </div>
          )}
        </div>
        {/* X axis labels */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "var(--text-muted)", marginTop: "4px" }}>
          <span>80</span>
          <span>100</span>
          <span>120</span>
          <span>140</span>
          <span>160</span>
        </div>
      </div>

      {/* Component 3: HR Duration Curve */}
      <div
        style={{
          flex: "1.2 1 200px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          minWidth: "200px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)" }}>HR CURVES</span>
          <span style={{ fontSize: "9px", color: "var(--text-muted)", fontStyle: "italic" }}>This ride</span>
        </div>

        <div style={{ flex: 1, minHeight: "180px", position: "relative" }}>
          <svg
            viewBox="0 0 200 130"
            style={{ width: "100%", height: "180px", overflow: "visible", cursor: "crosshair" }}
            onMouseMove={(e) => {
              const svg = e.currentTarget;
              const rect = svg.getBoundingClientRect();
              const relativeX = (e.clientX - rect.left) / rect.width;
              const svgX = relativeX * 200; // viewBox width is 200
              const len = hrCurve.length;
              if (len === 0) return;

              let closestIdx = 0;
              let minDiff = Infinity;
              for (let i = 0; i < len; i++) {
                const x = 25 + (i / (len - 1)) * 160;
                const diff = Math.abs(x - svgX);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = i;
                }
              }
              setHoverCurveIdx(closestIdx);
            }}
            onMouseLeave={() => setHoverCurveIdx(null)}
          >
            {/* Grid lines mapped to 120 bpm - 170 bpm */}
            {[120, 130, 140, 150, 160, 170].map((bpm, i) => {
              const y = 10 + 95 - ((bpm - 120) / 50) * 95;
              return (
                <line
                  key={i}
                  x1="20"
                  y1={y}
                  x2="190"
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth={0.5}
                />
              );
            })}
            {/* HR Curve path */}
            <path
              d={hrCurve.map((d, i) => {
                const x = 25 + (i / (hrCurve.length - 1)) * 160;
                const y = 10 + 95 - ((Math.min(170, Math.max(120, d.bpm)) - 120) / 50) * 95;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ")}
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth={1.5}
            />
            {/* X ticks */}
            {["1s", "1m", "5m", "30m"].map((lbl, idx) => {
              const x = 25 + (idx * 50);
              return (
                <text key={idx} x={x} y="122" textAnchor="middle" fontSize="7.5" fill="var(--text-muted)">
                  {lbl}
                </text>
              );
            })}

            {/* Snapping Interactive Elements */}
            {hoverCurveIdx !== null && (
              <g>
                <line
                  x1={25 + (hoverCurveIdx / (hrCurve.length - 1)) * 160}
                  y1={10}
                  x2={25 + (hoverCurveIdx / (hrCurve.length - 1)) * 160}
                  y2={105}
                  stroke="var(--text-muted)"
                  strokeWidth={0.8}
                  strokeDasharray="2,2"
                />
                <circle
                  cx={25 + (hoverCurveIdx / (hrCurve.length - 1)) * 160}
                  cy={10 + 95 - ((Math.min(170, Math.max(120, hrCurve[hoverCurveIdx].bpm)) - 120) / 50) * 95}
                  r={3.5}
                  fill="var(--color-danger)"
                  stroke="var(--bg-surface)"
                  strokeWidth={1}
                />
              </g>
            )}
          </svg>

          {/* Floating Glassmorphic Tooltip */}
          {hoverCurveIdx !== null && (
            <div
              style={{
                position: "absolute",
                left: `${(25 + (hoverCurveIdx / (hrCurve.length - 1)) * 160) / 2}%`,
                top: `${(10 + 95 - ((Math.min(170, Math.max(120, hrCurve[hoverCurveIdx].bpm)) - 120) / 50) * 95) * 100 / 130}%`,
                transform: "translate(-50%, -120%)",
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                pointerEvents: "none",
                zIndex: 10,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
                whiteSpace: "nowrap",
                fontSize: "10px",
                color: "var(--text-primary)",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: "9px" }}>
                Duration: {hrCurve[hoverCurveIdx].label}
              </div>
              <div>
                Peak HR: <strong style={{ color: "var(--color-danger)" }}>{hrCurve[hoverCurveIdx].bpm} bpm</strong>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: "9px" }}>
                {((hrCurve[hoverCurveIdx].bpm / lthr) * 100).toFixed(0)}% of LTHR
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", fontSize: "9.5px", fontWeight: 700, color: "var(--text-secondary)", marginTop: "6px" }}>
          <span style={{ cursor: "pointer" }}>HR CURVES ▾</span>
          <span style={{ cursor: "pointer" }}>CURVE CSV</span>
        </div>
      </div>

      {/* Component 4: Cumulative Time Curve */}
      <div
        style={{
          flex: "1.2 1 200px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          minWidth: "200px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>
          CUMULATIVE TIME
        </span>

        <div style={{ flex: 1, minHeight: "180px", position: "relative" }}>
          <svg
            viewBox="0 0 200 120"
            style={{ width: "100%", height: "180px", overflow: "visible", cursor: "crosshair" }}
            onMouseMove={(e) => {
              const svg = e.currentTarget;
              const rect = svg.getBoundingClientRect();
              const relativeX = (e.clientX - rect.left) / rect.width;
              const svgX = relativeX * 200; // viewBox width is 200
              const len = cumulativePoints.length;
              if (len === 0) return;

              let closestIdx = 0;
              let minDiff = Infinity;
              for (let i = 0; i < len; i++) {
                const x = 25 + (i / (len - 1)) * 160;
                const diff = Math.abs(x - svgX);
                if (diff < minDiff) {
                  minDiff = diff;
                  closestIdx = i;
                }
              }
              setHoverCumIdx(closestIdx);
            }}
            onMouseLeave={() => setHoverCumIdx(null)}
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((pct, i) => {
              const y = 10 + 88 - pct * 88;
              return (
                <line
                  key={i}
                  x1="20"
                  y1={y}
                  x2="190"
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth={0.5}
                />
              );
            })}
            {/* Cumulative Curve path */}
            <path
              d={cumulativePoints.map((p, idx) => {
                const x = 25 + (idx / (cumulativePoints.length - 1)) * 160;
                // Log scale approximation for Y axis: map 0 to 2500s into Y: 10 to 98
                const logVal = Math.log10(p.seconds + 1);
                const maxLog = Math.log10(2523);
                const y = 10 + 88 - (logVal / maxLog) * 88;
                return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ")}
              fill="none"
              stroke="#EF4444"
              strokeWidth={1.5}
            />
            {/* X labels (bpm) */}
            {["120", "140", "160", "170"].map((lbl, idx) => {
              const x = 25 + (idx * 53);
              return (
                <text key={idx} x={x} y="112" textAnchor="middle" fontSize="7.5" fill="var(--text-muted)">
                  {lbl}
                </text>
              );
            })}

            {/* Interactive Snap Crosshairs and Marker */}
            {hoverCumIdx !== null && (
              <g>
                {/* Horizontal line to Y-axis */}
                <line
                  x1={25}
                  y1={10 + 88 - (Math.log10(cumulativePoints[hoverCumIdx].seconds + 1) / Math.log10(2523)) * 88}
                  x2={25 + (hoverCumIdx / (cumulativePoints.length - 1)) * 160}
                  y2={10 + 88 - (Math.log10(cumulativePoints[hoverCumIdx].seconds + 1) / Math.log10(2523)) * 88}
                  stroke="var(--text-muted)"
                  strokeWidth={0.8}
                  strokeDasharray="2,2"
                />
                {/* Vertical line to X-axis */}
                <line
                  x1={25 + (hoverCumIdx / (cumulativePoints.length - 1)) * 160}
                  y1={10 + 88 - (Math.log10(cumulativePoints[hoverCumIdx].seconds + 1) / Math.log10(2523)) * 88}
                  x2={25 + (hoverCumIdx / (cumulativePoints.length - 1)) * 160}
                  y2={98}
                  stroke="var(--text-muted)"
                  strokeWidth={0.8}
                  strokeDasharray="2,2"
                />
                {/* Snapped Dot */}
                <circle
                  cx={25 + (hoverCumIdx / (cumulativePoints.length - 1)) * 160}
                  cy={10 + 88 - (Math.log10(cumulativePoints[hoverCumIdx].seconds + 1) / Math.log10(2523)) * 88}
                  r={3.5}
                  fill="#EF4444"
                  stroke="var(--bg-surface)"
                  strokeWidth={1}
                />
              </g>
            )}
          </svg>

          {/* Floating Glassmorphic Tooltip */}
          {hoverCumIdx !== null && (
            <div
              style={{
                position: "absolute",
                left: `${(25 + (hoverCumIdx / (cumulativePoints.length - 1)) * 160) / 2}%`,
                top: `${(10 + 88 - (Math.log10(cumulativePoints[hoverCumIdx].seconds + 1) / Math.log10(2523)) * 88) * 100 / 120}%`,
                transform: "translate(-50%, -120%)",
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "6px 10px",
                pointerEvents: "none",
                zIndex: 10,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
                whiteSpace: "nowrap",
                fontSize: "10px",
                color: "var(--text-primary)",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 600, color: "var(--text-muted)", fontSize: "9px" }}>
                Threshold: {cumulativePoints[hoverCumIdx].bpm} bpm
              </div>
              <div>
                Time &ge; HR: <strong style={{ color: "#EF4444" }}>{formatDuration(cumulativePoints[hoverCumIdx].seconds)}</strong>
              </div>
            </div>
          )}
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: "9px", margin: "6px 0 0", lineHeight: "1.3" }}>
          Lighter red areas show that your zones boundaries are working correctly.
        </p>
      </div>

      {/* Component 5: HR Training Load Details */}
      <div
        style={{
          flex: "1.4 1 240px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          minWidth: "240px",
          fontSize: "11px",
          lineHeight: "1.4",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px" }}>
          TRAINING LOAD ESTIMATES
        </span>

        <p style={{ color: "var(--text-muted)", fontSize: "9.5px", margin: "0 0 8px" }}>
          This activity has power data so its load ({actualLoad}) is from Coggan. HRSS (Normalized TRIMP) estimate is {estimatedLoad} based on threshold relative metrics.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px", borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Resting HR</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{restingHr}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Threshold HR</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{lthr}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Max HR</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{maxHr}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Est. Load</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-accent)" }}>{estimatedLoad}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text-muted)" }}>Actual Load</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-success)" }}>{actualLoad}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
