/**
 * streamUtils.ts
 * Pure utility functions for stream processing, derived metrics computation,
 * and formatting — aligned to TrainingPeaks methodology.
 *
 * All calculations use ONLY real data from streams or activity detail.
 * No synthetic defaults are injected.
 */

import type { StreamPoint } from "@/lib/types/activity";

// ─── Sentinel filtering ───────────────────────────────────────────────────────

const INT_SENTINEL = -2147483648;  // Integer.MIN_VALUE
const SHORT_SENTINEL = -32768;     // Short.MIN_VALUE

export function isSentinel(v: number | null | undefined): boolean {
  if (v == null) return true;
  return v === INT_SENTINEL || v === SHORT_SENTINEL || !Number.isFinite(v);
}

// ─── Duration helpers ─────────────────────────────────────────────────────────

/** Returns the "sample duration" of point[i] in seconds (delta to next point, capped at 60s). */
export function sampleDuration(points: StreamPoint[], index: number): number {
  if (points.length <= 1) return 1;
  const current = points[index];
  const next = points[index + 1];
  const prev = points[index - 1];
  const delta = next != null
    ? next.t - current.t
    : current.t - (prev?.t ?? current.t - 1);
  if (!Number.isFinite(delta) || delta <= 0 || delta > 60) return 1;
  return delta;
}

// ─── Series building ──────────────────────────────────────────────────────────

export interface SeriesPoint {
  t: number;
  value: number;
  duration: number;
}

export function buildSeries(
  points: StreamPoint[],
  extractor: (p: StreamPoint) => number | null | undefined,
  minValue = 0,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const v = extractor(points[i]);
    if (v == null || !Number.isFinite(v) || v <= minValue) continue;
    out.push({ t: points[i].t, value: v, duration: sampleDuration(points, i) });
  }
  return out;
}

// ─── Weighted statistics ──────────────────────────────────────────────────────

export function weightedAverage(series: SeriesPoint[]): number | null {
  if (series.length === 0) return null;
  let weightedSum = 0;
  let totalDuration = 0;
  for (const s of series) {
    weightedSum += s.value * s.duration;
    totalDuration += s.duration;
  }
  return totalDuration > 0 ? weightedSum / totalDuration : null;
}

export function seriesMax(series: SeriesPoint[]): number | null {
  if (series.length === 0) return null;
  return series.reduce((m, s) => Math.max(m, s.value), series[0].value);
}

export function totalDuration(series: SeriesPoint[]): number {
  return series.reduce((sum, s) => sum + s.duration, 0);
}

// ─── Peak rolling average (Mean Maximal Power / best efforts) ─────────────────

export interface PeakResult {
  windowSeconds: number;
  label: string;
  value: number;
}

function formatWindowLabel(seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

/**
 * Computes the best (highest or lowest) rolling average for each window.
 * Uses a prefix-sum sweep — O(n) per window.
 */
export function computePeakRollingAverages(
  series: SeriesPoint[],
  windowsSeconds: number[],
  preferLower = false,
): PeakResult[] {
  if (series.length === 0) return [];

  const prefixTime = [0];
  const prefixWeighted = [0];
  for (const s of series) {
    prefixTime.push(prefixTime[prefixTime.length - 1] + s.duration);
    prefixWeighted.push(prefixWeighted[prefixWeighted.length - 1] + s.value * s.duration);
  }

  const totalT = prefixTime[prefixTime.length - 1];

  const results: PeakResult[] = [];
  for (const w of windowsSeconds) {
    if (totalT < w) continue;

    let best: number | null = null;

    // Binary upper-bound helper
    const upperBound = (target: number): number => {
      let lo = 0;
      let hi = prefixTime.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (prefixTime[mid] <= target) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };

    for (let si = 0; si < series.length; si++) {
      if (totalT - prefixTime[si] < w) break;
      const targetT = prefixTime[si] + w;
      const bi = upperBound(targetT) - 1;
      const fullW = prefixWeighted[bi] - prefixWeighted[si];
      const remaining = targetT - prefixTime[bi];
      const partialW = remaining > 0 ? remaining * (series[bi]?.value ?? 0) : 0;
      const avg = (fullW + partialW) / w;

      if (best == null || (preferLower ? avg < best : avg > best)) {
        best = avg;
      }
    }

    if (best != null) {
      results.push({ windowSeconds: w, label: formatWindowLabel(w), value: best });
    }
  }
  return results;
}

// ─── Aerobic Decoupling (Pw:HR or Pa:HR) ─────────────────────────────────────

export interface DecouplingResult {
  /** Percentage difference: positive = decoupled (harder in 2nd half) */
  value: number;
  firstHalfEF: number;
  secondHalfEF: number;
  /** true = good aerobic fitness (<5%), false = decoupled (>5%) */
  isGood: boolean;
}

/**
 * Computes aerobic decoupling (Pw:HR or Pa:HR) by splitting the activity
 * in half (by elapsed time) and comparing efficiency factor in each half.
 *
 * EF_cycling = NP_halfN / avgHR_halfN
 * EF_running = pace_halfN / avgHR_halfN  (pace = s/km, lower = faster)
 *
 * Decoupling = (EF1 - EF2) / EF1 * 100%
 * < 5%: excellent; 5-10%: acceptable; >10%: significant fatigue
 */
export function computeAerobicDecoupling(
  points: StreamPoint[],
  mode: "power" | "pace",
): DecouplingResult | null {
  if (points.length < 10) return null;

  const midT = (points[0].t + points[points.length - 1].t) / 2;

  type HalfStat = { efSum: number; efDuration: number };
  const halves: [HalfStat, HalfStat] = [
    { efSum: 0, efDuration: 0 },
    { efSum: 0, efDuration: 0 },
  ];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!p.hr || p.hr <= 0) continue;

    let metric: number | undefined;
    if (mode === "power") {
      metric = p.power && p.power > 0 ? p.power : undefined;
    } else {
      // pace in s/km — only valid if speed > 0
      metric = p.speed && p.speed > 0.1 ? 1000 / p.speed : undefined;
    }
    if (metric == null) continue;

    const dur = sampleDuration(points, i);
    const ef = mode === "power" ? metric / p.hr : (1 / metric) * 1000; // normalise pace EF
    const half = p.t < midT ? 0 : 1;
    halves[half].efSum += ef * dur;
    halves[half].efDuration += dur;
  }

  if (halves[0].efDuration < 30 || halves[1].efDuration < 30) return null;

  const ef1 = halves[0].efSum / halves[0].efDuration;
  const ef2 = halves[1].efSum / halves[1].efDuration;
  if (ef1 <= 0) return null;

  const decoupling = ((ef1 - ef2) / ef1) * 100;
  return {
    value: decoupling,
    firstHalfEF: ef1,
    secondHalfEF: ef2,
    isGood: Math.abs(decoupling) < 5,
  };
}

// ─── Variability Index ────────────────────────────────────────────────────────

/**
 * VI = Normalized Power / Average Power
 * Values close to 1.0 = steady pacing (ideal for time trials).
 * Higher = more variable (criteriums, mountain biking).
 */
export function computeVI(normalizedPower: number | null | undefined, avgPower: number | null | undefined): number | null {
  if (!normalizedPower || !avgPower || avgPower === 0) return null;
  return normalizedPower / avgPower;
}

// ─── Efficiency Factor ────────────────────────────────────────────────────────

/**
 * EF_cycling = NP / avgHR   (typical range: 1.2–2.5 for trained cyclists)
 * EF_running = NGP(s/km) / avgHR  (typical range: 0.9–1.3)
 *
 * For running without grade stream, we use simple avg pace as proxy for NGP.
 */
export function computeEF(
  normalizedPower: number | null | undefined,
  avgSpeed: number | null | undefined,
  avgHR: number | null | undefined,
  sport: "cycling" | "running" | "swimming" | "strength" | "other",
): number | null {
  if (!avgHR || avgHR <= 0) return null;

  if (sport === "cycling") {
    if (!normalizedPower || normalizedPower <= 0) return null;
    return normalizedPower / avgHR;
  }

  if (sport === "running") {
    if (!avgSpeed || avgSpeed <= 0) return null;
    // pace in min/km — EF = pace (min/km) / avgHR × 100 for readability
    const paceMinKm = 1000 / avgSpeed / 60;
    return (1 / paceMinKm / avgHR) * 100; // higher = more efficient
  }

  return null;
}

// ─── VAM (Velocità Ascensionale Media) ───────────────────────────────────────

/**
 * VAM = elevation gain (m) / duration (h)
 * Elite climbers: >1600 m/h. Cat 1 equivalent: ~1000–1300 m/h.
 */
export function computeVAM(elevationGainMeters: number | null | undefined, durationSeconds: number | null | undefined): number | null {
  if (!elevationGainMeters || elevationGainMeters <= 0) return null;
  if (!durationSeconds || durationSeconds <= 0) return null;
  return (elevationGainMeters / durationSeconds) * 3600;
}

// ─── Km Splits (running/cycling) ─────────────────────────────────────────────

export interface KmSplit {
  km: number;
  durationSeconds: number;
  paceSecsPerKm: number;
  avgHR: number | null;
}

/**
 * Computes per-km splits from a distance + time stream.
 * Returns splits as long as the activity has distance data.
 */
export function computeKmSplits(points: StreamPoint[]): KmSplit[] {
  const withDist = points.filter((p) => p.distance != null && p.t != null);
  if (withDist.length < 2) return [];

  const splits: KmSplit[] = [];
  let kmMark = 1000;
  let lastKmPoint = withDist[0];
  let hrSum = 0;
  let hrCount = 0;

  for (const p of withDist) {
    if (p.hr && p.hr > 0) { hrSum += p.hr; hrCount++; }

    if (p.distance! >= kmMark) {
      // Interpolate exact time of km crossing
      const prevP = withDist[withDist.indexOf(p) - 1] ?? lastKmPoint;
      const frac = (kmMark - (prevP.distance ?? 0)) / ((p.distance ?? 1) - (prevP.distance ?? 0));
      const crossingT = prevP.t + frac * (p.t - prevP.t);
      const splitDuration = crossingT - lastKmPoint.t;

      splits.push({
        km: kmMark / 1000,
        durationSeconds: splitDuration,
        paceSecsPerKm: splitDuration, // same as duration for exactly 1km
        avgHR: hrCount > 0 ? hrSum / hrCount : null,
      });

      lastKmPoint = { ...p, t: crossingT, distance: kmMark };
      hrSum = 0;
      hrCount = 0;
      kmMark += 1000;
    }
  }
  return splits;
}

// ─── Best efforts (standard race distances) ───────────────────────────────────

export interface BestEffort {
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  paceSecsPerKm: number;
}

const BEST_EFFORT_DISTANCES: Array<{ label: string; meters: number }> = [
  { label: "400m", meters: 400 },
  { label: "1km", meters: 1000 },
  { label: "1 mile", meters: 1609 },
  { label: "5km", meters: 5000 },
  { label: "10km", meters: 10000 },
  { label: "Half Marathon", meters: 21097 },
  { label: "Marathon", meters: 42195 },
];

/**
 * Computes best efforts for standard distances using a sliding window over distance stream.
 * Only distances actually covered by the activity are included.
 */
export function computeBestEfforts(points: StreamPoint[]): BestEffort[] {
  const withDist = points.filter((p) => p.distance != null);
  if (withDist.length < 2) return [];

  const totalDistance = withDist[withDist.length - 1].distance ?? 0;
  const results: BestEffort[] = [];

  for (const { label, meters } of BEST_EFFORT_DISTANCES) {
    if (totalDistance < meters) continue;

    let bestDuration = Infinity;

    for (let i = 0; i < withDist.length; i++) {
      const startDist = withDist[i].distance ?? 0;
      const targetDist = startDist + meters;

      // Find end point
      let j = i + 1;
      while (j < withDist.length && (withDist[j].distance ?? 0) < targetDist) j++;
      if (j >= withDist.length) break;

      // Interpolate crossing time
      const prevDist = withDist[j - 1].distance ?? 0;
      const currDist = withDist[j].distance ?? targetDist;
      const frac = (targetDist - prevDist) / Math.max(currDist - prevDist, 1);
      const endT = withDist[j - 1].t + frac * (withDist[j].t - withDist[j - 1].t);
      const duration = endT - withDist[i].t;

      if (duration > 0 && duration < bestDuration) {
        bestDuration = duration;
      }
    }

    if (Number.isFinite(bestDuration)) {
      results.push({
        label,
        distanceMeters: meters,
        durationSeconds: bestDuration,
        paceSecsPerKm: (bestDuration / meters) * 1000,
      });
    }
  }
  return results;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function fmtDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function fmtClock(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fmtPace(secsPerKm: number | null | undefined, unit: "/km" | "/100m" = "/km"): string {
  if (secsPerKm == null || !Number.isFinite(secsPerKm) || secsPerKm <= 0 || secsPerKm > 3600) {
    return "--:--";
  }
  const rounded = Math.round(secsPerKm);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${s.toString().padStart(2, "0")}${unit}`;
}

export function fmtSpeedKph(mps: number | null | undefined): string {
  if (mps == null || !Number.isFinite(mps) || mps <= 0) return "--";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

export function fmtNumber(v: number | null | undefined, decimals = 0): string {
  if (v == null || !Number.isFinite(v)) return "--";
  return v.toFixed(decimals);
}

/** Downsample an array of stream points to at most maxPoints for rendering performance. */
export function downsample(points: StreamPoint[], maxPoints: number): StreamPoint[] {
  if (points.length <= maxPoints) return points;
  const stride = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % stride === 0);
}
