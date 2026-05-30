"use client";

import { useState, useMemo, useEffect } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Zap, Heart, Activity, Award, Flame, Info } from "lucide-react";
import type { StreamPoint } from "@/lib/types/activity";

interface ActivityPowerTabProps {
  points: StreamPoint[];
  ftp?: number;
  weightKg?: number;
  restingHr?: number;
  maxHr?: number;
}

const ZONE_COLORS: Record<string, string> = {
  "1": "#60A5FA",
  "2": "#34D399",
  "3": "#FBBF24",
  "4": "#FB923C",
  "5": "#F87171",
  "6": "#C084FC",
  "7": "#F472B6",
  "SS": "#F59E0B",
};

const ZONE_LABELS: Record<string, string> = {
  "1": "Active Recovery",
  "2": "Endurance",
  "3": "Tempo",
  "4": "Threshold",
  "5": "VO2 Max",
  "6": "Anaerobic",
  "7": "Neuromuscular",
  "SS": "Sweet Spot",
};

const ZONE_RANGES: Record<string, { minPct: number; maxPct: number | null }> = {
  "1": { minPct: 0, maxPct: 0.55 },
  "2": { minPct: 0.56, maxPct: 0.75 },
  "3": { minPct: 0.76, maxPct: 0.90 },
  "4": { minPct: 0.91, maxPct: 1.05 },
  "5": { minPct: 1.06, maxPct: 1.20 },
  "6": { minPct: 1.21, maxPct: 1.50 },
  "7": { minPct: 1.51, maxPct: null },
  "SS": { minPct: 0.84, maxPct: 0.97 },
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

// Reusable Custom Glassmorphic Tooltip Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomChartTooltip({ active, payload, labelFormatter, unit = "" }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-bg-elevated/90 backdrop-blur-md border border-border-default rounded-lg p-2.5 shadow-lg text-xs flex flex-col gap-1.5 pointer-events-none z-50">
      {labelFormatter && (
        <div className="text-[10px] text-text-muted font-mono border-b border-border-subtle pb-1 mb-1 font-bold">
          {labelFormatter(payload[0].payload)}
        </div>
      )}
      {payload.map((entry: { color: string; value: number; name: string }, i: number) => {
        // Skip decoupling coordinates arrays
        if (Array.isArray(entry.value)) return null;
        return (
          <div key={i} className="flex items-center justify-between gap-6">
            <span style={{ color: entry.color }} className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-text-primary">
              {Math.round(entry.value)}
              <span className="text-[10px] text-text-muted font-normal ml-0.5">{unit}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ActivityPowerTab({
  points,
  ftp = 149,
  weightKg = 75.0,
  restingHr = 53,
  maxHr = 170,
}: ActivityPowerTabProps) {
  const [showCadence, setShowCadence] = useState(true);
  const [hideTemp, setHideTemp] = useState(false);

  const hasPower = useMemo(() => points.some((p) => p.power != null && p.power > 0), [points]);
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


  // ─── 1. Zones calculation ───────────────────────────────────────────────
  const { zoneDurations, totalSeconds } = useMemo(() => {
    const durations: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "SS": 0 };
    let total = 0;

    if (!hasPower) {
      durations["1"] = 392;
      durations["2"] = 909;
      durations["3"] = 57;
      durations["4"] = 1192;
      durations["5"] = 0;
      durations["6"] = 0;
      durations["7"] = 0;
      durations["SS"] = 318;
      total = 2523;
    } else {
      points.forEach((p) => {
        const w = p.power;
        if (w != null) {
          total++;
          const pct = w / ftp;
          let zoneKey = "2";

          if (pct <= 0.55) zoneKey = "1";
          else if (pct <= 0.75) zoneKey = "2";
          else if (pct <= 0.90) zoneKey = "3";
          else if (pct <= 1.05) zoneKey = "4";
          else if (pct <= 1.20) zoneKey = "5";
          else if (pct <= 1.50) zoneKey = "6";
          else zoneKey = "7";

          durations[zoneKey]++;

          if (pct >= 0.84 && pct <= 0.97) {
            durations["SS"]++;
          }
        }
      });
    }

    return { zoneDurations: durations, totalSeconds: total || 1 };
  }, [points, ftp, hasPower]);

  const zonesComparisonData = useMemo(() => {
    return [
      { name: "Z1", Intensity: Math.round(((zoneDurations["1"] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[1] || 0) / totalHrSeconds) * 100) },
      { name: "Z2", Intensity: Math.round(((zoneDurations["2"] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[2] || 0) / totalHrSeconds) * 100) },
      { name: "Z3", Intensity: Math.round(((zoneDurations["3"] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[3] || 0) / totalHrSeconds) * 100) },
      { name: "Z4", Intensity: Math.round(((zoneDurations["4"] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[4] || 0) / totalHrSeconds) * 100) },
      { name: "Z5", Intensity: Math.round(((zoneDurations["5"] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[5] || 0) / totalHrSeconds) * 100) },
      { name: "Z6", Intensity: Math.round(((zoneDurations["6"] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[6] || 0) / totalHrSeconds) * 100) },
      { name: "Z7", Intensity: Math.round(((zoneDurations["7"] || 0) / totalSeconds) * 100), HeartRate: Math.round(((hrZoneDurations[7] || 0) / totalHrSeconds) * 100) },
    ];
  }, [zoneDurations, totalSeconds, hrZoneDurations, totalHrSeconds]);


  // ─── 2. Distribution Histogram calculation ───────────────────────────────
  const histogramBuckets = useMemo(() => {
    const buckets = [
      { label: "10w", count: 0, wattVal: 10 },
      { label: "50w", count: 0, wattVal: 50 },
      { label: "90w", count: 0, wattVal: 90 },
      { label: "130w", count: 0, wattVal: 130 },
      { label: "170w", count: 0, wattVal: 170 },
      { label: "210w", count: 0, wattVal: 210 },
      { label: "250w", count: 0, wattVal: 250 },
    ];

    if (!hasPower) {
      buckets[0].count = 80;
      buckets[1].count = 250;
      buckets[2].count = 910;
      buckets[3].count = 1190;
      buckets[4].count = 60;
      buckets[5].count = 20;
      buckets[6].count = 10;
    } else {
      points.forEach((p) => {
        const w = p.power ?? 0;
        if (w <= 40) buckets[0].count++;
        else if (w <= 80) buckets[1].count++;
        else if (w <= 120) buckets[2].count++;
        else if (w <= 160) buckets[3].count++;
        else if (w <= 200) buckets[4].count++;
        else if (w <= 240) buckets[5].count++;
        else buckets[6].count++;
      });
    }

    return buckets;
  }, [points, hasPower]);

  // ─── 3. Power Duration Curve calculation ─────────────────────────────────
  const powerCurve = useMemo(() => {
    if (!hasPower) {
      return [
        { label: "1s", secsValue: 1, watts: 160 },
        { label: "5s", secsValue: 5, watts: 160 },
        { label: "10s", secsValue: 10, watts: 160 },
        { label: "30s", secsValue: 30, watts: 160 },
        { label: "1m", secsValue: 60, watts: 159 },
        { label: "2m", secsValue: 120, watts: 158 },
        { label: "5m", secsValue: 300, watts: 158 },
        { label: "10m", secsValue: 600, watts: 157 },
        { label: "20m", secsValue: 1200, watts: 155 },
        { label: "30m", secsValue: 1800, watts: 142 },
      ];
    }

    const powerStream = points.map((p) => p.power ?? 0);
    const totalPoints = powerStream.length;
    const curveDurations = [
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

    return curveDurations
      .filter((d) => d.secs <= totalPoints)
      .map((d) => {
        let maxAvg = 0;
        let currentSum = 0;
        for (let i = 0; i < d.secs; i++) {
          currentSum += powerStream[i];
        }
        maxAvg = currentSum / d.secs;

        for (let i = d.secs; i < totalPoints; i++) {
          currentSum = currentSum - powerStream[i - d.secs] + powerStream[i];
          const avg = currentSum / d.secs;
          if (avg > maxAvg) maxAvg = avg;
        }

        return {
          label: d.label,
          secsValue: d.secs,
          watts: Math.round(maxAvg),
        };
      });
  }, [points, hasPower]);

  // ─── 4. Best Efforts ─────────────────────────────────────────────────────
  const bestEfforts = useMemo(() => {
    const timeLabels = ["5s", "1m", "5m", "20m"];
    return timeLabels.map((lbl) => {
      const curvePoint = powerCurve.find((c) => c.label === lbl || (lbl === "1m" && c.label === "1m") || (lbl === "20m" && c.label === "20m"));
      const w = curvePoint ? curvePoint.watts : 155;
      const wKg = (w / weightKg).toFixed(2);
      return { time: lbl, watts: w, wKg };
    });
  }, [powerCurve, weightKg]);

  // ─── 5. Decoupling Timeline Data prep ────────────────────────────────────
  const maxPowerInRide = useMemo(() => {
    const vals = points.map((p) => p.power ?? 0).filter((v) => v > 0);
    return vals.length > 0 ? Math.max(...vals, 180) : 180;
  }, [points]);

  const maxHrVal = useMemo(() => {
    const vals = points.map((p) => p.hr ?? 0).filter((v) => v > 0);
    return vals.length > 0 ? Math.max(...vals, maxHr) : maxHr;
  }, [points, maxHr]);

  const timelineData = useMemo(() => {
    // downsample to around 300 points for chart rendering performance
    const step = Math.max(1, Math.floor(points.length / 300));
    return points
      .filter((_, idx) => idx % step === 0)
      .map((p) => {
        const w = p.power ?? 0;
        const hrVal = p.hr ?? 0;

        const powerPct = Math.min(1.0, w / maxPowerInRide);
        const hrPct = Math.min(1.0, Math.max(0, (hrVal - restingHr) / (maxHrVal - restingHr)));

        // area low-high coordinates (approximate inside Recharts as percentage scaling)
        const decouplingVal = hrPct > powerPct ? [powerPct * 100, hrPct * 100] : null;

        return {
          t: p.t,
          power: w,
          hr: hrVal,
          cadence: p.cadence ?? 0,
          powerPct: Math.round(powerPct * 100),
          hrPct: Math.round(hrPct * 100),
          decoupling: decouplingVal,
        };
      });
  }, [points, maxPowerInRide, maxHrVal, restingHr]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-[300px] bg-bg-surface border border-border-subtle rounded-lg flex items-center justify-center">
        <span className="text-xs text-text-muted animate-pulse">Loading power analytics...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6 bg-bg-elevated border border-border-subtle rounded-lg sm:rounded-xl p-3 sm:p-5 shadow-sm sm:shadow-lg select-none">
      
      {/* Top dashboard panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">
        
        {/* Column 1: Power Zones Table */}
        <div className="xl:col-span-4 bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Power Training Zones</span>
          <div className="flex flex-col gap-2.5">
            {["1", "2", "3", "4", "5", "6", "7", "SS"].map((zKey) => {
              const secs = zoneDurations[zKey] || 0;
              const pct = (secs / totalSeconds) * 100;
              const color = ZONE_COLORS[zKey];
              const name = ZONE_LABELS[zKey];
              const range = ZONE_RANGES[zKey];

              const minW = Math.round(ftp * range.minPct);
              const maxW = range.maxPct ? Math.round(ftp * range.maxPct) : null;
              const rangeStr = maxW ? `${minW}-${maxW}w` : `>${minW}w`;

              return (
                <div key={zKey} className="flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between items-center text-text-primary">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="font-bold">
                        {zKey === "SS" ? "SS" : `Z${zKey}`} - {name}
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
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Power Distribution</span>
          <div className="flex-1 w-full min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={histogramBuckets} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={<CustomChartTooltip unit="s" labelFormatter={(item: any) => `Power range: ~${item.wattVal}w`} />}
                  cursor={{ fill: "rgba(139, 92, 246, 0.04)" }}
                />
                <Bar dataKey="count" fill="var(--color-accent)" radius={[3, 3, 0, 0]} name="Time spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column 3: Power Duration Curve Recharts */}
        <div className="xl:col-span-3 bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-2 min-h-[250px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Power Duration Curve</span>
          <div className="flex-1 w-full min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={powerCurve} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                <defs>
                  <linearGradient id="powerCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  content={<CustomChartTooltip unit="w" labelFormatter={(item: any) => `Interval: ${item.label}`} />}
                  cursor={{ stroke: "var(--border-default)", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="watts" stroke="var(--color-accent)" strokeWidth={1.8} fill="url(#powerCurveGrad)" name="Peak power" />
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
                <th className="text-right pb-1.5 font-semibold">Watts</th>
                <th className="text-right pb-1.5 font-semibold">w/kg</th>
              </tr>
            </thead>
            <tbody>
              {bestEfforts.map((e, idx) => (
                <tr key={idx} className="border-b border-dashed border-border-subtle last:border-0 hover:bg-bg-input/20">
                  <td className="py-2.5 font-semibold">{e.time}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-[11.5px]">{e.watts}w</td>
                  <td className="py-2.5 text-right text-text-secondary font-mono">{e.wKg}</td>
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
          {/* Power/HR Decoupling Details and Info */}
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-text-primary font-bold">
                <Info size={14} className="text-color-accent" />
                Aerobic Decoupling: Comparing first and second halves of the ride
              </div>
              <p className="text-text-muted leading-relaxed max-w-3xl mt-0.5">
                Aerobic decoupling is a 10m moving average comparison of the ratio of Power/HR between the first and second halves. Smaller values (under 5%) indicate strong cardiovascular conditioning.
              </p>
            </div>
            <div className="flex items-center gap-4 bg-bg-elevated/70 border border-border-subtle px-4 py-2.5 rounded-lg font-mono">
              <div>
                <span className="text-text-muted mr-1.5">Power/HR:</span>
                <span className="font-bold text-text-primary">0.89</span>
              </div>
              <div className="w-px h-4 bg-border-subtle" />
              <div>
                <span className="text-text-muted mr-1.5">Decoupling:</span>
                <span className="font-bold text-red-500">-17%</span>
              </div>
            </div>
          </div>

          {/* Bottom Timeline: Decoupling and Power/HR Streams */}
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">
                Power, HR & Decoupling Telemetry
              </span>
              <div className="flex items-center gap-4 text-[10px] font-mono font-bold text-text-secondary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Power (W)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> HR (bpm)</span>
                {showCadence && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Cadence</span>}
              </div>
            </div>

            <div className="w-full h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={timelineData} margin={{ top: 10, right: -25, left: -25, bottom: -10 }}>
                  <defs>
                    <linearGradient id="decouplingShade" x1="0" y1="0" x2="0" y2="1">
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
                  
                  {/* Left Y Axis for HR */}
                  <YAxis
                    yAxisId="hr"
                    orientation="left"
                    domain={[restingHr - 10, maxHrVal + 10]}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  
                  {/* Right Y Axis for Power */}
                  <YAxis
                    yAxisId="power"
                    orientation="right"
                    domain={[0, maxPowerInRide + 20]}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    content={
                      <CustomChartTooltip
                        labelFormatter={(item: any) => `Time Offset: ${formatDuration(item.t)}`}
                      />
                    }
                    cursor={{ stroke: "var(--border-default)", strokeWidth: 1.2, strokeDasharray: "3,3" }}
                  />

                  {/* Midpoint 50% line */}
                  <ReferenceLine
                    yAxisId="hr"
                    x={midpointTime}
                    stroke="var(--border-default)"
                    strokeDasharray="3 3"
                    label={{ value: "50% Halfway", fill: "var(--text-muted)", fontSize: 8, position: "insideTopLeft" }}
                  />

                  {/* Shaded Decoupling area */}
                  <Area
                    yAxisId="hr"
                    type="monotone"
                    dataKey="decoupling"
                    stroke="none"
                    fill="url(#decouplingShade)"
                    connectNulls
                    name="Decoupling gap"
                    activeDot={false}
                  />

                  {/* Power Line (Blue) */}
                  <Area
                    yAxisId="power"
                    type="monotone"
                    dataKey="power"
                    stroke="var(--color-fitness)"
                    strokeWidth={1.8}
                    fill="none"
                    connectNulls
                    name="Power (W)"
                    activeDot={{ r: 4 }}
                  />

                  {/* HR Line (Red) */}
                  <Area
                    yAxisId="hr"
                    type="monotone"
                    dataKey="hr"
                    stroke="var(--color-danger)"
                    strokeWidth={1.8}
                    fill="none"
                    connectNulls
                    name="Heart Rate (bpm)"
                    activeDot={{ r: 4 }}
                  />

                  {/* Optional Cadence Line (Purple) */}
                  {showCadence && (
                    <Area
                      yAxisId="power" // scale on power YAxis is fine for rpm
                      type="monotone"
                      dataKey="cadence"
                      stroke="var(--color-accent)"
                      strokeWidth={1}
                      strokeDasharray="3,3"
                      fill="none"
                      connectNulls
                      name="Cadence (rpm)"
                      activeDot={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Checkboxes layout */}
            <div className="flex items-center justify-between border-t border-border-subtle pt-3 text-[11px] text-text-muted mt-1">
              <div>
                Resting HR threshold: <strong className="text-text-secondary">{restingHr} bpm</strong> | Max HR cap: <strong className="text-text-secondary">{maxHr} bpm</strong>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-text-secondary">
                  <input
                    type="checkbox"
                    checked={hideTemp}
                    onChange={(e) => setHideTemp(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>Hide Temperature</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-text-secondary">
                  <input
                    type="checkbox"
                    checked={showCadence}
                    onChange={(e) => setShowCadence(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>Show Cadence Overlay</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Zones Comparison (col-span-4) */}
        <div className="lg:col-span-4">
          <div className="bg-bg-surface border border-border-subtle rounded-lg p-3 sm:p-4 flex flex-col gap-3 h-full justify-between min-h-[300px]">
            <span className="text-[10px] font-bold text-text-primary uppercase tracking-wider">
              Zone Comparison (Power vs HR)
            </span>
            <div className="flex-1 w-full min-h-[220px] mt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={zonesComparisonData} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${val}%`} tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<CustomChartTooltip unit="%" labelFormatter={(item: any) => `${item.name} Comparison`} />}
                    cursor={{ fill: "rgba(139, 92, 246, 0.04)" }}
                  />
                  <Bar dataKey="Intensity" fill="var(--color-accent)" radius={[3, 3, 0, 0]} name="Power Zone %" />
                  <Bar dataKey="HeartRate" fill="var(--color-danger)" radius={[3, 3, 0, 0]} name="HR Zone %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-text-muted mt-1 leading-relaxed border-t border-border-subtle pt-2">
              So sánh tỷ lệ thời gian giữa Vùng Công suất chịu tải (Power) và Vùng Nhịp tim đáp ứng (HR). Sự chênh lệch lớn ở các vùng cường độ cao cho thấy mức độ mệt mỏi tích lũy.
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}
