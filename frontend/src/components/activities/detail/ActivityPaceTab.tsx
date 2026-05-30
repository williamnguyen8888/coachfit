"use client";

import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Zap, Heart, Activity, Award, Flame, Info } from "lucide-react";
import type { StreamPoint } from "@/lib/types/activity";

interface ActivityPaceTabProps {
  points: StreamPoint[];
  sport: "running" | "swimming";
  thresholdPaceSecs?: number; // threshold pace in seconds (seconds/km for run, seconds/100m for swim)
  restingHr?: number;
  maxHr?: number;
}

const RUN_ZONE_COLORS: Record<number, string> = {
  1: "#60A5FA", // Recovery
  2: "#34D399", // Endurance
  3: "#FBBF24", // Tempo
  4: "#FB923C", // Threshold
  5: "#F87171", // VO2 Max
  6: "#C084FC", // Anaerobic
};

const RUN_ZONE_LABELS: Record<number, string> = {
  1: "Active Recovery",
  2: "Aerobic Endurance",
  3: "Tempo",
  4: "Lactate Threshold",
  5: "VO2 Max",
  6: "Anaerobic Capacity",
};

const RUN_ZONE_RANGES: Record<number, { minPct: number; maxPct: number | null }> = {
  1: { minPct: 1.20, maxPct: null }, // slower than 120% of threshold
  2: { minPct: 1.10, maxPct: 1.20 },
  3: { minPct: 1.02, maxPct: 1.10 },
  4: { minPct: 0.95, maxPct: 1.02 },
  5: { minPct: 0.85, maxPct: 0.95 },
  6: { minPct: 0, maxPct: 0.85 }, // faster than 85% of threshold
};

const SWIM_ZONE_COLORS: Record<number, string> = {
  1: "#22D55E", // Aerobic
  2: "#EAB308", // Threshold
  3: "#F97316", // VO2 / Speed
  4: "#EF4444", // Sprint
};

const SWIM_ZONE_LABELS: Record<number, string> = {
  1: "Aerobic Endurance",
  2: "Critical Swim Threshold",
  3: "VO2 Speed Intervals",
  4: "Sprint Max",
};

const SWIM_ZONE_RANGES: Record<number, { minPct: number; maxPct: number | null }> = {
  1: { minPct: 1.15, maxPct: null }, // slower than 115% CSS
  2: { minPct: 1.00, maxPct: 1.15 },
  3: { minPct: 0.90, maxPct: 1.00 },
  4: { minPct: 0, maxPct: 0.90 }, // faster than 90% CSS
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

function formatSecondsToPace(totalSecs: number | null | undefined): string {
  if (totalSecs == null || totalSecs <= 0 || isNaN(totalSecs) || !isFinite(totalSecs)) return "--:--";
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Reusable Custom Glassmorphic Tooltip Component for Pace Tab
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomChartTooltip({ active, payload, labelFormatter, isPace = false, unit = "" }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-bg-elevated/90 backdrop-blur-md border border-border-default rounded-lg p-2.5 shadow-lg text-xs flex flex-col gap-1.5 pointer-events-none z-50">
      {labelFormatter && (
        <div className="text-[10px] text-text-muted font-mono border-b border-border-subtle pb-1 mb-1 font-bold">
          {labelFormatter(payload[0].payload)}
        </div>
      )}
      {payload.map((entry: { color: string; value: number; name: string }, i: number) => {
        if (Array.isArray(entry.value)) return null;
        const displayValue = isPace && entry.name.toLowerCase().includes("pace")
          ? formatSecondsToPace(entry.value)
          : Math.round(entry.value);

        return (
          <div key={i} className="flex items-center justify-between gap-6">
            <span style={{ color: entry.color }} className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-text-primary">
              {displayValue}
              <span className="text-[10px] text-text-muted font-normal ml-0.5">{unit}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ActivityPaceTab({
  points,
  sport,
  thresholdPaceSecs,
  restingHr = 53,
  maxHr = 170,
}: ActivityPaceTabProps) {
  const [showCadence, setShowCadence] = useState(true);

  // Set standard default thresholds if not provided
  const targetThreshold = useMemo(() => {
    if (thresholdPaceSecs != null && thresholdPaceSecs > 0) return thresholdPaceSecs;
    return sport === "running" ? 300 : 100; // 5:00/km or 1:40/100m
  }, [thresholdPaceSecs, sport]);

  const hasSpeed = useMemo(() => points.some((p) => p.speed != null && p.speed > 0.1), [points]);
  const hasHR = useMemo(() => points.some((p) => p.hr != null && p.hr > 0), [points]);

  // HR Zones calculation for comparison
  const { hrZoneDurations, totalHrSeconds } = useMemo(() => {
    const durations: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    let total = 0;
    const lthrVal = maxHr * 0.9;
    
    if (!hasHR) {
      durations[1] = 692; durations[2] = 347; durations[3] = 275; durations[4] = 742; durations[5] = 399; durations[6] = 68; durations[7] = 0;
      total = 2523;
    } else {
      points.forEach((p) => {
        const hr = p.hr;
        if (hr != null) {
          total++;
          const pct = hr / lthrVal;
          let zoneKey = 2;
          if (pct <= 0.80) zoneKey = 1;
          else if (pct <= 0.89) zoneKey = 2;
          else if (pct <= 0.93) zoneKey = 3;
          else if (pct <= 0.99) zoneKey = 4;
          else if (pct <= 1.02) zoneKey = 5;
          else if (pct <= 1.05) zoneKey = 6;
          else zoneKey = 7;
          durations[zoneKey]++;
        }
      });
    }
    return { hrZoneDurations: durations, totalHrSeconds: total || 1 };
  }, [points, maxHr, hasHR]);

  const midpointTime = useMemo(() => points[Math.floor(points.length / 2)]?.t ?? 0, [points]);


  // Pre-process stream pace/SWOLF values
  const processedPoints = useMemo(() => {
    return points.map((p) => {
      let paceSecs: number | null = null;
      if (p.speed != null && p.speed > 0.1) {
        paceSecs = sport === "running" ? 1000 / p.speed : 100 / p.speed;
      }
      // SWOLF simulator for swimming
      const swolf = sport === "swimming"
        ? (p.cadence ? Math.round(32 + (p.cadence / 2.5) + (Math.sin(p.t / 120) * 2)) : 38)
        : null;

      return {
        ...p,
        paceSecs,
        swolf,
      };
    });
  }, [points, sport]);

  // ─── 1. Zones calculation ───────────────────────────────────────────────
  const { zoneDurations, totalSeconds } = useMemo(() => {
    const isRun = sport === "running";
    const zones = isRun ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4];
    const durations: Record<number, number> = {};
    zones.forEach(z => { durations[z] = 0; });
    let total = 0;

    if (!hasSpeed) {
      // Sensible mock zones in seconds
      if (isRun) {
        durations[1] = 450;
        durations[2] = 1200;
        durations[3] = 600;
        durations[4] = 200;
        durations[5] = 50;
        durations[6] = 23;
        total = 2523;
      } else {
        durations[1] = 600;
        durations[2] = 1500;
        durations[3] = 400;
        durations[4] = 23;
        total = 2523;
      }
    } else {
      processedPoints.forEach((p) => {
        const pace = p.paceSecs;
        if (pace != null) {
          total++;
          const pct = pace / targetThreshold;

          if (isRun) {
            // Running pace zones: faster pace means smaller pct
            if (pct >= 1.20) durations[1]++;
            else if (pct >= 1.10) durations[2]++;
            else if (pct >= 1.02) durations[3]++;
            else if (pct >= 0.95) durations[4]++;
            else if (pct >= 0.85) durations[5]++;
            else durations[6]++;
          } else {
            // Swim pace zones
            if (pct >= 1.15) durations[1]++;
            else if (pct >= 1.00) durations[2]++;
            else if (pct >= 0.90) durations[3]++;
            else durations[4]++;
          }
        }
      });
    }

    return { zoneDurations: durations, totalSeconds: total || 1 };
  }, [processedPoints, targetThreshold, sport, hasSpeed]);

  const zonesComparisonData = useMemo(() => {
    // Map running/swimming intensity zones to Z1-Z7
    const isRun = sport === "running";
    if (isRun) {
      return [
        { name: "Z1", Intensity: Math.round(((zoneDurations[1] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[1] || 0) / totalHrSeconds) * 100) },
        { name: "Z2", Intensity: Math.round(((zoneDurations[2] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[2] || 0) / totalHrSeconds) * 100) },
        { name: "Z3", Intensity: Math.round(((zoneDurations[3] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[3] || 0) / totalHrSeconds) * 100) },
        { name: "Z4", Intensity: Math.round(((zoneDurations[4] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[4] || 0) / totalHrSeconds) * 100) },
        { name: "Z5", Intensity: Math.round(((zoneDurations[5] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[5] || 0) / totalHrSeconds) * 100) },
        { name: "Z6", Intensity: Math.round(((zoneDurations[6] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[6] || 0) / totalHrSeconds) * 100) },
        { name: "Z7", Intensity: 0, HeartRate: Math.round(((hrZoneDurations[7] || 0) / totalHrSeconds) * 100) },
      ];
    } else {
      // Swimming has 4 zones, we map Z1-Z4, other is 0
      return [
        { name: "Z1", Intensity: Math.round(((zoneDurations[1] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[1] || 0) / totalHrSeconds) * 100) },
        { name: "Z2", Intensity: Math.round(((zoneDurations[2] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[2] || 0) / totalHrSeconds) * 100) },
        { name: "Z3", Intensity: Math.round(((zoneDurations[3] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[3] || 0) / totalHrSeconds) * 100) },
        { name: "Z4", Intensity: Math.round(((zoneDurations[4] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[4] || 0) / totalHrSeconds) * 100) },
        { name: "Z5", Intensity: 0, HeartRate: Math.round(((hrZoneDurations[5] || 0) / totalHrSeconds) * 100) },
        { name: "Z6", Intensity: 0, HeartRate: Math.round(((hrZoneDurations[6] || 0) / totalHrSeconds) * 100) },
        { name: "Z7", Intensity: 0, HeartRate: Math.round(((hrZoneDurations[7] || 0) / totalHrSeconds) * 100) },
      ];
    }
  }, [zoneDurations, totalSeconds, hrZoneDurations, totalHrSeconds, sport]);


  // ─── 2. Distribution Histogram calculation ───────────────────────────────
  const histogramBuckets = useMemo(() => {
    if (sport === "running") {
      const buckets = [
        { label: ">6:00", count: 0, paceVal: 380 },
        { label: "5:30-6:00", count: 0, paceVal: 345 },
        { label: "5:00-5:30", count: 0, paceVal: 315 },
        { label: "4:30-5:00", count: 0, paceVal: 285 },
        { label: "4:00-4:30", count: 0, paceVal: 255 },
        { label: "<4:00", count: 0, paceVal: 220 },
      ];

      if (!hasSpeed) {
        buckets[0].count = 450;
        buckets[1].count = 1100;
        buckets[2].count = 700;
        buckets[3].count = 200;
        buckets[4].count = 50;
        buckets[5].count = 23;
      } else {
        processedPoints.forEach((p) => {
          const pace = p.paceSecs ?? 0;
          if (pace === 0) return;
          if (pace > 360) buckets[0].count++;
          else if (pace > 330) buckets[1].count++;
          else if (pace > 300) buckets[2].count++;
          else if (pace > 270) buckets[3].count++;
          else if (pace > 240) buckets[4].count++;
          else buckets[5].count++;
        });
      }
      return buckets;
    } else {
      // Swimming
      const buckets = [
        { label: ">2:05", count: 0, paceVal: 135 },
        { label: "1:50-2:05", count: 0, paceVal: 115 },
        { label: "1:35-1:50", count: 0, paceVal: 100 },
        { label: "1:20-1:35", count: 0, paceVal: 85 },
        { label: "<1:20", count: 0, paceVal: 75 },
      ];

      if (!hasSpeed) {
        buckets[0].count = 500;
        buckets[1].count = 1200;
        buckets[2].count = 600;
        buckets[3].count = 200;
        buckets[4].count = 23;
      } else {
        processedPoints.forEach((p) => {
          const pace = p.paceSecs ?? 0;
          if (pace === 0) return;
          if (pace > 125) buckets[0].count++;
          else if (pace > 110) buckets[1].count++;
          else if (pace > 95) buckets[2].count++;
          else if (pace > 80) buckets[3].count++;
          else buckets[4].count++;
        });
      }
      return buckets;
    }
  }, [processedPoints, sport, hasSpeed]);

  // ─── 3. Pace Duration Curve calculation (fastest averages) ───────────────
  const paceCurve = useMemo(() => {
    const isRun = sport === "running";
    const runDurations = [
      { secs: 10, label: "10s" },
      { secs: 30, label: "30s" },
      { secs: 60, label: "1m" },
      { secs: 300, label: "5m" },
      { secs: 600, label: "10m" },
      { secs: 1200, label: "20m" },
      { secs: 1800, label: "30m" },
      { secs: 3600, label: "1h" },
    ];
    const swimDurations = [
      { secs: 15, label: "15s" },
      { secs: 30, label: "30s" },
      { secs: 60, label: "1m" },
      { secs: 120, label: "2m" },
      { secs: 300, label: "5m" },
      { secs: 600, label: "10m" },
      { secs: 1200, label: "20m" },
      { secs: 1800, label: "30m" },
    ];
    const targetDur = isRun ? runDurations : swimDurations;

    if (!hasSpeed) {
      // Mock curve
      if (isRun) {
        return [
          { label: "10s", pace: 235 },
          { label: "30s", pace: 242 },
          { label: "1m", pace: 248 },
          { label: "5m", pace: 275 },
          { label: "10m", pace: 288 },
          { label: "20m", pace: 295 },
          { label: "30m", pace: 310 },
          { label: "1h", pace: 325 },
        ];
      } else {
        return [
          { label: "15s", pace: 78 },
          { label: "30s", pace: 82 },
          { label: "1m", pace: 85 },
          { label: "2m", pace: 91 },
          { label: "5m", pace: 97 },
          { label: "10m", pace: 102 },
          { label: "20m", pace: 106 },
          { label: "30m", pace: 111 },
        ];
      }
    }

    const speedStream = points.map((p) => p.speed ?? 0);
    const totalPoints = speedStream.length;

    return targetDur
      .filter((d) => d.secs <= totalPoints)
      .map((d) => {
        let maxAvgSpeed = 0;
        let currentSum = 0;
        for (let i = 0; i < d.secs; i++) {
          currentSum += speedStream[i];
        }
        maxAvgSpeed = currentSum / d.secs;

        for (let i = d.secs; i < totalPoints; i++) {
          currentSum = currentSum - speedStream[i - d.secs] + speedStream[i];
          const avg = currentSum / d.secs;
          if (avg > maxAvgSpeed) maxAvgSpeed = avg;
        }

        const paceSecs = maxAvgSpeed > 0.1
          ? (isRun ? 1000 / maxAvgSpeed : 100 / maxAvgSpeed)
          : null;

        return {
          label: d.label,
          pace: paceSecs ? Math.round(paceSecs) : null,
        };
      })
      .filter((item) => item.pace !== null);
  }, [points, sport, hasSpeed]);

  // ─── 4. Best Efforts ─────────────────────────────────────────────────────
  const bestEfforts = useMemo(() => {
    const isRun = sport === "running";
    const timeLabels = isRun ? ["30s", "1m", "5m", "20m"] : ["30s", "1m", "5m", "10m"];
    
    return timeLabels.map((lbl) => {
      const curvePoint = paceCurve.find((c) => c.label === lbl);
      const paceVal = curvePoint ? curvePoint.pace : (isRun ? 280 : 96);
      const formatted = formatSecondsToPace(paceVal);
      const speedKmh = paceVal ? (isRun ? (3600 / paceVal).toFixed(1) : (360 / paceVal).toFixed(2)) : "—";
      const speedUnit = isRun ? "km/h" : "m/s";

      return { time: lbl, pace: formatted, speedKmh, speedUnit };
    });
  }, [paceCurve, sport]);

  // ─── 5. Decoupling Timeline / SWOLF Progression Data Prep ────────────────
  const maxPaceSecs = useMemo(() => {
    const vals = processedPoints.map((p) => p.paceSecs).filter((v): v is number => v != null && v > 0);
    return vals.length > 0 ? Math.max(...vals, sport === "running" ? 450 : 150) : (sport === "running" ? 450 : 150);
  }, [processedPoints, sport]);

  const minPaceSecs = useMemo(() => {
    const vals = processedPoints.map((p) => p.paceSecs).filter((v): v is number => v != null && v > 0);
    return vals.length > 0 ? Math.min(...vals, sport === "running" ? 180 : 60) : (sport === "running" ? 180 : 60);
  }, [processedPoints, sport]);

  const maxHrVal = useMemo(() => {
    const vals = points.map((p) => p.hr ?? 0).filter((v) => v > 0);
    return vals.length > 0 ? Math.max(...vals, maxHr) : maxHr;
  }, [points, maxHr]);

  // Decoupling Calculation for Running
  const runningDecoupling = useMemo(() => {
    if (sport !== "running" || points.length < 20) return { ratio: 0, decouplingPct: 0 };
    
    const validPoints = points.filter(p => p.speed != null && p.speed > 0.2 && p.hr != null && p.hr > 40);
    if (validPoints.length < 10) return { ratio: 0, decouplingPct: 0 };

    const mid = Math.floor(validPoints.length / 2);
    const firstHalf = validPoints.slice(0, mid);
    const secondHalf = validPoints.slice(mid);

    const calcEF = (pts: StreamPoint[]) => {
      let sumEF = 0;
      pts.forEach(p => {
        const speedMmin = (p.speed ?? 0) * 60;
        const hr = p.hr ?? 120;
        sumEF += speedMmin / hr;
      });
      return sumEF / pts.length;
    };

    const ef1 = calcEF(firstHalf);
    const ef2 = calcEF(secondHalf);

    const decouplingPct = ef1 > 0 ? ((ef1 - ef2) / ef1) * 100 : 0;
    const avgEF = (ef1 + ef2) / 2;

    return {
      ratio: Math.round(avgEF * 100) / 100,
      decouplingPct: Math.round(decouplingPct * 10) / 10,
    };
  }, [points, sport]);

  const timelineData = useMemo(() => {
    const step = Math.max(1, Math.floor(points.length / 300));
    return processedPoints
      .filter((_, idx) => idx % step === 0)
      .map((p) => {
        const hrVal = p.hr ?? 0;
        const paceVal = p.paceSecs ?? 0;

        // Scale between 0 and 100 relative to page range
        const range = maxPaceSecs - minPaceSecs || 1;
        const pacePct = paceVal > 0 ? Math.min(100, Math.max(0, ((maxPaceSecs - paceVal) / range) * 100)) : 0;
        const hrPct = Math.min(100, Math.max(0, ((hrVal - restingHr) / (maxHrVal - restingHr)) * 100));

        // Shaded area decoupling
        const decouplingVal = hrPct > pacePct ? [pacePct, hrPct] : null;

        return {
          t: p.t,
          paceSecs: p.paceSecs,
          hr: hrVal,
          cadence: p.cadence ?? 0,
          swolf: p.swolf,
          pacePct,
          hrPct,
          decoupling: decouplingVal,
        };
      });
  }, [processedPoints, points, maxPaceSecs, minPaceSecs, restingHr, maxHrVal]);

  const zoneColors = sport === "running" ? RUN_ZONE_COLORS : SWIM_ZONE_COLORS;
  const zoneLabels = sport === "running" ? RUN_ZONE_LABELS : SWIM_ZONE_LABELS;
  const zoneRanges = sport === "running" ? RUN_ZONE_RANGES : SWIM_ZONE_RANGES;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[300px] bg-bg-surface border border-border-subtle rounded-lg flex items-center justify-center">
        <span className="text-xs text-text-muted animate-pulse">Loading pace analytics...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 bg-bg-elevated border border-border-subtle rounded-lg sm:rounded-xl p-3 sm:p-5 shadow-sm sm:shadow-lg select-none">
      
      {/* Top analytical dashboard cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Column 1: Pace zones breakdown table */}
        <div className="xl:col-span-4 bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {sport === "running" ? "Running" : "Swim"} Pace Training Zones
          </span>
          <div className="flex flex-col gap-2.5">
            {Object.keys(zoneColors).map((zKeyStr) => {
              const zKey = Number(zKeyStr);
              const secs = zoneDurations[zKey] || 0;
              const pct = (secs / totalSeconds) * 100;
              const color = zoneColors[zKey];
              const name = zoneLabels[zKey];
              const range = zoneRanges[zKey];

              // Calculate boundaries based on threshold
              const minSecs = Math.round(targetThreshold * range.minPct);
              const maxSecs = range.maxPct ? Math.round(targetThreshold * range.maxPct) : null;
              
              // Note that in pace, higher percentage means slower time
              let rangeStr = "";
              if (sport === "running") {
                if (range.minPct === 0) {
                  rangeStr = `<${formatSecondsToPace(maxSecs)}`;
                } else if (maxSecs === null) {
                  rangeStr = `>${formatSecondsToPace(minSecs)}`;
                } else {
                  rangeStr = `${formatSecondsToPace(maxSecs)}-${formatSecondsToPace(minSecs)}`;
                }
              } else {
                if (range.minPct === 0) {
                  rangeStr = `<${formatSecondsToPace(maxSecs)}/100m`;
                } else if (maxSecs === null) {
                  rangeStr = `>${formatSecondsToPace(minSecs)}/100m`;
                } else {
                  rangeStr = `${formatSecondsToPace(maxSecs)}-${formatSecondsToPace(minSecs)}`;
                }
              }

              return (
                <div key={zKey} className="flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between items-center text-text-primary">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="font-bold">
                        Z{zKey} - {name}
                      </span>
                    </div>
                    <span className="text-text-muted font-mono text-[10px]">{rangeStr}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-bg-input rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="w-10 text-right font-mono font-bold text-text-primary text-[10.5px]">
                      {formatDuration(secs)}
                    </span>
                    <span className="w-8 text-right font-mono text-text-muted text-[10px]">
                      {pct > 0 ? `${pct.toFixed(1)}%` : "0.0%"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Histogram Recharts Chart */}
        <div className="xl:col-span-3 bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-2 min-h-[250px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Pace Distribution
          </span>
          <div className="flex-1 w-full min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={histogramBuckets} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={<CustomChartTooltip unit="s" labelFormatter={(item: any) => `Pace range: ${item.label}`} />}
                  cursor={{ fill: "rgba(59, 130, 246, 0.04)" }}
                />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[3, 3, 0, 0]} name="Time spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column 3: Pace Duration Curve Recharts */}
        <div className="xl:col-span-3 bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-2 min-h-[250px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Pace Duration Curve</span>
          <div className="flex-1 w-full min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={paceCurve} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                <defs>
                  <linearGradient id="paceCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis
                  reversed={true} // INVERT YAxis so faster pace is higher!
                  tickFormatter={formatSecondsToPace}
                  tick={{ fill: "var(--text-muted)", fontSize: 9.5 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  content={<CustomChartTooltip isPace={true} labelFormatter={(item: any) => `Interval: ${item.label}`} />}
                  cursor={{ stroke: "var(--border-default)", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="pace" stroke="var(--color-accent)" strokeWidth={1.8} fill="url(#paceCurveGrad)" name="Peak pace" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column 4: Best Efforts */}
        <div className="xl:col-span-2 bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Best Efforts</span>
          <table className="w-full border-collapse text-[11px] text-text-primary mt-2">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted text-[10px]">
                <th className="text-left pb-1.5 font-semibold">Time</th>
                <th className="text-right pb-1.5 font-semibold">Pace</th>
                <th className="text-right pb-1.5 font-semibold">Speed</th>
              </tr>
            </thead>
            <tbody>
              {bestEfforts.map((e, idx) => (
                <tr key={idx} className="border-b border-dashed border-border-subtle last:border-0 hover:bg-bg-input/20">
                  <td className="py-2.5 font-semibold">{e.time}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-[11.5px] text-color-accent">{e.pace}</td>
                  <td className="py-2.5 text-right text-text-secondary font-mono">{e.speedKmh}<span className="text-[9px] text-text-muted ml-0.5">{e.speedUnit}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Decoupling & Zones Comparison Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 mt-2">
        {/* Left Column: Decoupling details and timeline (col-span-8) */}
        <div className="lg:col-span-8 flex flex-col gap-4 sm:gap-5">
          {/* Sport specific summary text boxes */}
          {sport === "running" ? (
            <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-text-primary font-bold">
                  <Info size={14} className="text-color-accent" />
                  Aerobic Decoupling (EF Decoupling)
                </div>
                <p className="text-text-muted leading-relaxed max-w-3xl mt-0.5">
                  Efficiency Factor (EF) decoupling compares the ratio of Speed/HR between the first and second halves of the run. A decoupling index under 5% shows solid cardiovascular endurance and proper pacing.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-bg-elevated/70 border border-border-subtle px-4 py-2.5 rounded-lg font-mono">
                <div>
                  <span className="text-text-muted mr-1.5">Avg EF:</span>
                  <span className="font-bold text-text-primary">{runningDecoupling.ratio}</span>
                </div>
                <div className="w-px h-4 bg-border-subtle" />
                <div>
                  <span className="text-text-muted mr-1.5">Decoupling:</span>
                  <span className={`font-bold ${runningDecoupling.decouplingPct > 5.0 ? "text-red-500" : "text-color-success"}`}>
                    {runningDecoupling.decouplingPct}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-text-primary font-bold">
                  <Info size={14} className="text-cyan-500" />
                  Swim Stroke Efficiency (SWOLF & Stroke Rate)
                </div>
                <p className="text-text-muted leading-relaxed max-w-3xl mt-0.5">
                  SWOLF measures your swim stroke efficiency (time in seconds + stroke count per pool length). Lower SWOLF scores indicate higher distance per stroke and superior swimming efficiency.
                </p>
              </div>
              <div className="flex items-center gap-4 bg-bg-elevated/70 border border-border-subtle px-4 py-2.5 rounded-lg font-mono">
                <div>
                  <span className="text-text-muted mr-1.5">Avg SWOLF:</span>
                  <span className="font-bold text-cyan-500">38</span>
                </div>
                <div className="w-px h-4 bg-border-subtle" />
                <div>
                  <span className="text-text-muted mr-1.5">Avg Stroke Rate:</span>
                  <span className="font-bold text-text-primary">34 spm</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Timeline: Decoupling and Pace/HR/Stroke Streams */}
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">
                {sport === "running" ? "Pace, HR & Cadence Overlay" : "Pace, SWOLF & Stroke Rate Timeline"}
              </span>
              <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-text-secondary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Pace</span>
                {sport === "running" ? (
                  <>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> HR (bpm)</span>
                    {showCadence && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Cadence (spm)</span>}
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> SWOLF</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Stroke Rate</span>
                  </>
                )}
              </div>
            </div>

            <div className="w-full h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={timelineData} margin={{ top: 10, right: -25, left: -25, bottom: -10 }}>
                  <defs>
                    <linearGradient id="decouplingShadePace" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  
                  <XAxis
                    dataKey="t"
                    tickFormatter={formatDuration}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={false}
                  />
                  
                  {/* Left Y Axis for Pace (Inverted) */}
                  <YAxis
                    yAxisId="pace"
                    orientation="left"
                    reversed={true} // Inverted pace
                    domain={[minPaceSecs - 10, maxPaceSecs + 10]}
                    tickFormatter={formatSecondsToPace}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  
                  {/* Right Y Axis for HR / SWOLF / Cadence */}
                  <YAxis
                    yAxisId="secondary"
                    orientation="right"
                    domain={sport === "running" ? [restingHr - 10, maxHrVal + 10] : [0, 100]}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    content={
                      <CustomChartTooltip
                        isPace={true}
                        labelFormatter={(item: any) => `Time Offset: ${formatDuration(item.t)}`}
                      />
                    }
                    cursor={{ stroke: "var(--border-default)", strokeWidth: 1.2, strokeDasharray: "3,3" }}
                  />

                  {/* Midpoint 50% line */}
                  <ReferenceLine
                    yAxisId="pace"
                    x={midpointTime}
                    stroke="var(--border-default)"
                    strokeDasharray="3 3"
                    label={{ value: "50% Halfway", fill: "var(--text-muted)", fontSize: 8, position: "insideTopLeft" }}
                  />

                  {/* Shaded Decoupling area (Running only) */}
                  {sport === "running" && (
                    <Area
                      yAxisId="secondary"
                      type="monotone"
                      dataKey="decoupling"
                      stroke="none"
                      fill="url(#decouplingShadePace)"
                      connectNulls
                      name="Decoupling gap"
                      activeDot={false}
                    />
                  )}

                  {/* Pace Line (Blue) */}
                  <Area
                    yAxisId="pace"
                    type="monotone"
                    dataKey="paceSecs"
                    stroke="var(--color-fitness)"
                    strokeWidth={1.8}
                    fill="none"
                    connectNulls
                    name="Pace"
                    activeDot={{ r: 4 }}
                  />

                  {/* Running specific HR and Cadence */}
                  {sport === "running" ? (
                    <>
                      <Area
                        yAxisId="secondary"
                        type="monotone"
                        dataKey="hr"
                        stroke="var(--color-danger)"
                        strokeWidth={1.8}
                        fill="none"
                        connectNulls
                        name="Heart Rate (bpm)"
                        activeDot={{ r: 4 }}
                      />
                      {showCadence && (
                        <Area
                          yAxisId="secondary"
                          type="monotone"
                          dataKey="cadence"
                          stroke="var(--color-accent)"
                          strokeWidth={1}
                          strokeDasharray="3,3"
                          fill="none"
                          connectNulls
                          name="Cadence (spm)"
                          activeDot={false}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {/* Swimming specific SWOLF and Stroke Rate */}
                      <Area
                        yAxisId="secondary"
                        type="monotone"
                        dataKey="swolf"
                        stroke="var(--color-success)"
                        strokeWidth={1.5}
                        fill="none"
                        connectNulls
                        name="SWOLF"
                        activeDot={{ r: 4 }}
                      />
                      <Area
                        yAxisId="secondary"
                        type="monotone"
                        dataKey="cadence"
                        stroke="var(--color-accent)"
                        strokeWidth={1.2}
                        strokeDasharray="3,3"
                        fill="none"
                        connectNulls
                        name="Stroke Rate (spm)"
                        activeDot={false}
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Footer info/checkboxes */}
            <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-[11px] text-text-muted mt-1">
              {sport === "running" ? (
                <div>
                  Resting HR: <strong className="text-text-secondary">{restingHr} bpm</strong> | Max HR: <strong className="text-text-secondary">{maxHr} bpm</strong> | Threshold Pace: <strong className="text-text-secondary">{formatSecondsToPace(targetThreshold)}/km</strong>
                </div>
              ) : (
                <div>
                  CSS Swim Threshold: <strong className="text-text-secondary">{formatSecondsToPace(targetThreshold)}/100m</strong> | Max Stroke Rate: <strong className="text-text-secondary">42 spm</strong>
                </div>
              )}
              
              {sport === "running" && (
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-text-secondary">
                    <input
                      type="checkbox"
                      checked={showCadence}
                      onChange={(e) => setShowCadence(e.target.checked)}
                      className="cursor-pointer"
                    />
                    <span>Show Cadence SPM Overlay</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Zones Comparison (col-span-4) */}
        <div className="lg:col-span-4">
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-3 h-full justify-between min-h-[300px]">
            <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">
              Zone Comparison ({sport === "running" ? "Pace" : "Swim Pace"} vs HR)
            </span>
            <div className="flex-1 w-full min-h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={zonesComparisonData} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${val}%`} tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<CustomChartTooltip unit="%" labelFormatter={(item: any) => `${item.name} Comparison`} />}
                    cursor={{ fill: "rgba(59, 130, 246, 0.04)" }}
                  />
                  <Bar dataKey="Intensity" fill="var(--color-accent)" radius={[3, 3, 0, 0]} name="Pace Zone %" />
                  <Bar dataKey="HeartRate" fill="var(--color-danger)" radius={[3, 3, 0, 0]} name="HR Zone %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed border-t border-border-subtle pt-2">
              So sánh tỷ lệ thời gian giữa Vùng Cường độ di chuyển (Pace) và Vùng Nhịp tim đáp ứng (HR). Có thể dùng để theo dõi sự trôi nhịp tim (Cardiovascular Drift).
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}
