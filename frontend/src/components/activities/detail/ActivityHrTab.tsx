"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Heart, Award, Flame, Info } from "lucide-react";
import type { StreamPoint } from "@/lib/types/activity";

interface ActivityHrTabProps {
  points: StreamPoint[];
  lthr?: number;
  restingHr?: number;
  maxHr?: number;
  estimatedLoad?: number;
  actualLoad?: number;
}

const ZONE_COLORS: Record<number, string> = {
  1: "#0D9488",
  2: "#22C55E",
  3: "#EAB308",
  4: "#F97316",
  5: "#EF4444",
  6: "#A855F7",
  7: "#EC4899",
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

// Custom Glassmorphic Tooltip Component for HR Charts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomHrTooltip({ active, payload, labelFormatter, unit = "bpm" }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-bg-elevated/90 backdrop-blur-md border border-border-default rounded-lg p-2.5 shadow-lg text-xs flex flex-col gap-1.5 pointer-events-none z-50">
      {labelFormatter && (
        <div className="text-[10px] text-text-muted font-mono border-b border-border-subtle pb-1 mb-1 font-bold">
          {labelFormatter(payload[0].payload)}
        </div>
      )}
      {payload.map((entry: { color: string; value: number; name: string }, i: number) => (
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
      ))}
    </div>
  );
}

export function ActivityHrTab({
  points,
  lthr = 154,
  restingHr = 53,
  maxHr = 170,
  estimatedLoad = 48,
  actualLoad = 49,
}: ActivityHrTabProps) {
  const hasHR = useMemo(() => points.some((p) => p.hr != null && p.hr > 0), [points]);

  // ─── 1. Calculate Zone Durations ─────────────────────────────────────────
  const { zoneDurations, totalSeconds } = useMemo(() => {
    const durations: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    let total = 0;

    if (!hasHR) {
      durations[1] = 692;
      durations[2] = 347;
      durations[3] = 275;
      durations[4] = 742;
      durations[5] = 399;
      durations[6] = 68;
      durations[7] = 0;
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

          durations[zoneKey]++;
        }
      });
    }

    return { zoneDurations: durations, totalSeconds: total || 1 };
  }, [points, lthr, hasHR]);

  // ─── 2. HR Distribution Histogram calculation ────────────────────────────
  const histogramBuckets = useMemo(() => {
    const buckets = [
      { label: "80", count: 0, bpmVal: 80 },
      { label: "100", count: 0, bpmVal: 100 },
      { label: "120", count: 0, bpmVal: 120 },
      { label: "140", count: 0, bpmVal: 140 },
      { label: "160", count: 0, bpmVal: 160 },
    ];

    if (!hasHR) {
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

    return buckets;
  }, [points, hasHR]);

  // ─── 3. HR Duration Curve calculation ────────────────────────────────────
  const hrCurve = useMemo(() => {
    if (!hasHR) {
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
    const numPoints = 12;
    const startBpm = 110;
    const step = (maxHr - startBpm) / numPoints;
    const hrScale: number[] = [];
    for (let i = 0; i <= numPoints; i++) {
      hrScale.push(Math.round(startBpm + i * step));
    }

    const hrStream = points.map((p) => p.hr ?? 0);

    return hrScale.map((h) => {
      let count = 0;
      if (!hasHR) {
        const ratio = (maxHr - h) / (maxHr - startBpm);
        count = Math.round(Math.max(0, ratio * ratio * 2000));
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
    <div className="flex flex-col gap-6 bg-bg-elevated border border-border-subtle rounded-xl p-5 shadow-lg select-none">
      
      {/* Grid containing heart rate tables and charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
        
        {/* Column 1: Zones Table */}
        <div className="xl:col-span-4 bg-bg-surface border border-border-subtle rounded-lg p-4 flex flex-col gap-3">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Heart Rate Training Zones</span>
          <div className="flex flex-col gap-2.5">
            {[1, 2, 3, 4, 5, 6, 7].map((zNum) => {
              const secs = zoneDurations[zNum] || 0;
              const pct = (secs / totalSeconds) * 100;
              const color = ZONE_COLORS[zNum];
              const name = ZONE_NAMES[zNum];
              const range = ZONE_RANGES[zNum];

              const minB = Math.round(lthr * range.minPct);
              const maxB = range.maxPct ? Math.round(lthr * range.maxPct) : maxHr;
              const rangeStr = range.maxPct ? `${minB}-${maxB} bpm` : `>${minB} bpm`;

              return (
                <div key={zNum} className="flex flex-col gap-1 text-[11px]">
                  <div className="flex justify-between items-center text-text-primary">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="font-bold">
                        Z{zNum} - {name}
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

        {/* Column 2: HR Histogram Chart */}
        <div className="xl:col-span-4 bg-bg-surface border border-border-subtle rounded-lg p-4 flex flex-col gap-2 min-h-[250px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">HR Distribution</span>
          <div className="flex-1 w-full min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramBuckets} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={<CustomHrTooltip unit="s" labelFormatter={(item: any) => `HR range: ~${item.bpmVal} bpm`} />}
                  cursor={{ fill: "rgba(239, 68, 68, 0.04)" }}
                />
                <Bar dataKey="count" fill="var(--color-danger)" radius={[3, 3, 0, 0]} name="Time spent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Column 3: HR Duration Curve */}
        <div className="xl:col-span-4 bg-bg-surface border border-border-subtle rounded-lg p-4 flex flex-col gap-2 min-h-[250px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Peak HR Curves</span>
          <div className="flex-1 w-full min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hrCurve} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                <defs>
                  <linearGradient id="hrCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  content={<CustomHrTooltip unit=" bpm" labelFormatter={(item: any) => `Interval: ${item.label}`} />}
                  cursor={{ stroke: "var(--border-default)", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="bpm" stroke="var(--color-danger)" strokeWidth={1.8} fill="url(#hrCurveGrad)" name="Peak HR" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row containing Cumulative Time and Training load info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Cumulative Time spent above specific Heart Rates */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-4 flex flex-col gap-2 min-h-[260px]">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Cumulative Time</span>
          <div className="flex-1 w-full min-h-[180px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativePoints} margin={{ top: 10, right: 5, left: -25, bottom: -5 }}>
                <defs>
                  <linearGradient id="hrCumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="bpm" tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={{ stroke: "var(--border-subtle)" }} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 9.5 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatDuration(v)} />
                <Tooltip
                  content={
                    <CustomHrTooltip
                      unit=" spent"
                      labelFormatter={(item: any) => `Heart Rate &ge; ${item.bpm} bpm`}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      valueFormatter={(v: any) => formatDuration(v)}
                    />
                  }
                  cursor={{ stroke: "var(--border-default)", strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="seconds" stroke="#EF4444" strokeWidth={1.8} fill="url(#hrCumGrad)" name="Time &ge; HR" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
            The cumulative curve displays the total duration spent at or above each heart rate intensity, highlighting threshold thresholds.
          </p>
        </div>

        {/* Training Load Estimates details card */}
        <div className="bg-bg-surface border border-border-subtle rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Training Load Estimates</span>
            <p className="text-xs text-text-secondary leading-relaxed mt-1">
              Since this activity contains power data, its actual load ({actualLoad}) is calculated via Coggan algorithms. HRSS (Heart Rate Stress Score, Normalized TRIMP) estimates a load of {estimatedLoad} based on heart rate zones and threshold limits.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-border-subtle pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Resting HR</span>
              <span className="text-sm font-extrabold text-text-primary font-mono">{restingHr} bpm</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Threshold HR</span>
              <span className="text-sm font-extrabold text-text-primary font-mono">{lthr} bpm</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Max HR</span>
              <span className="text-sm font-extrabold text-danger font-mono">{maxHr} bpm</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Est. Load (HRSS)</span>
              <span className="text-sm font-extrabold text-color-accent font-mono">{estimatedLoad}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase">Actual Load</span>
              <span className="text-sm font-extrabold text-color-success font-mono">{actualLoad}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
