/**
 * ActivityPowerPanel.tsx
 * Professional power analysis panel for cycling activities.
 * Shows: MMP curve, power zone distribution, key metrics (NP, IF, VI, EF, TSS).
 * No fabricated data — all values from real stream or activity detail.
 */
"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { AlertCircle, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, StreamPoint } from "@/lib/types/activity";
import type { SportZones } from "@/lib/types/settings";
import {
  buildSeries,
  computePeakRollingAverages,
  computePowerHistogram,
  computeVI,
  computeEF,
  totalDuration,
  weightedAverage,
  seriesMax,
  fmtDuration,
  fmtNumber,
} from "@/lib/utils/streamUtils";

// MMP windows: 1s, 5s, 30s, 1m, 2m, 5m, 10m, 20m, 30m, 60m
const MMP_WINDOWS = [1, 5, 30, 60, 120, 300, 600, 1200, 1800, 3600];

const ZONE_COLORS = [
  "#64748b", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#9333ea", "#ec4899",
];

interface Props {
  activity: ActivityDetail;
  points: StreamPoint[];
  zoneConfig: SportZones | null | undefined;
}

function getTssLabel(tss: number): { label: string; color: string; bg: string } {
  if (tss < 50) return { label: "Low", color: "#22c55e", bg: "rgba(34,197,94,0.15)" };
  if (tss < 100) return { label: "Moderate", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" };
  if (tss < 150) return { label: "High", color: "#f97316", bg: "rgba(249,115,22,0.15)" };
  return { label: "Very High", color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
}

export function ActivityPowerPanel({ activity, points, zoneConfig }: Props) {
  const series = useMemo(
    () => buildSeries(points, (p) => p.power, 0),
    [points],
  );

  const mmpCurve = useMemo(
    () => computePeakRollingAverages(series, MMP_WINDOWS, false),
    [series],
  );

  const zoneDurations = useMemo(() => {
    if (!zoneConfig?.zones?.length) return [];
    const sorted = [...zoneConfig.zones].sort((a, b) => a.zone - b.zone);
    const totalSecs = totalDuration(series);
    const map = new Map<number, number>();
    for (const band of sorted) map.set(band.zone, 0);

    for (const s of series) {
      const band = sorted.find((b, idx) => {
        const min = b.min ?? Number.NEGATIVE_INFINITY;
        const max = b.max ?? Number.POSITIVE_INFINITY;
        return s.value >= min && (idx === sorted.length - 1 ? s.value <= max : s.value < max);
      });
      if (band) map.set(band.zone, (map.get(band.zone) ?? 0) + s.duration);
    }

    return sorted.map((band) => ({
      zone: band.zone,
      name: band.name,
      seconds: map.get(band.zone) ?? 0,
      pct: totalSecs > 0 ? ((map.get(band.zone) ?? 0) / totalSecs) * 100 : 0,
      color: ZONE_COLORS[(band.zone - 1) % ZONE_COLORS.length],
    }));
  }, [series, zoneConfig]);

  // Power histogram: 25W buckets
  const powerHistogram = useMemo(() => {
    return computePowerHistogram(series, 25);
  }, [series]);

  // Power over time (downsampled for rendering)
  const powerOverTime = useMemo(() => {
    const step = Math.max(1, Math.floor(series.length / 500));
    return series
      .filter((_, i) => i % step === 0)
      .map((s) => ({ t: s.t, power: Math.round(s.value) }));
  }, [series]);

  // Derived metrics
  const vi = useMemo(
    () => computeVI(activity.normalizedPower, activity.avgPower),
    [activity.normalizedPower, activity.avgPower],
  );
  const ef = useMemo(
    () => computeEF(activity.normalizedPower, activity.avgSpeed, activity.avgHeartRate, activity.sport as "cycling" | "running" | "swimming" | "strength" | "other"),
    [activity],
  );

  if (series.length === 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-border-subtle bg-bg-elevated p-2 text-text-muted">
            <AlertCircle size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">No power data</h3>
            <p className="mt-1 text-sm text-text-secondary">
              This activity does not include a power meter stream. Install a power meter
              (pedals, spider, or hub) to unlock power analysis.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const avgPowerCalc = weightedAverage(series);
  const peakPowerStream = seriesMax(series);

  const tssInfo = activity.tss != null ? getTssLabel(activity.tss) : null;
  const ifRatio = activity.intensityFactor != null
    ? Math.min(1, activity.intensityFactor)
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Hero metrics row ───────────────────────────────────────────── */}
      <Card>
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
            <Zap size={14} className="text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-text-primary">Power Analysis</h2>
        </div>

        {/* Hero 3-col row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* NP — glassmorphism hero card */}
          {activity.normalizedPower != null && (
            <div
              className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-900/5 px-5 py-4"
              style={{ boxShadow: "0 0 0 1px rgba(59,130,246,0.1), 0 8px 32px rgba(59,130,246,0.08)" }}
            >
              {/* accent left bar */}
              <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-blue-400 to-blue-600" />
              <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-400/70">
                Normalized Power
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold leading-none text-blue-400">
                {activity.normalizedPower}
                <span className="ml-1.5 text-base font-normal text-blue-400/60">W</span>
              </div>
              <div className="mt-1 text-[10px] text-text-muted">
                Physiological cost equivalent
              </div>
              {activity.avgPower != null && (
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="text-[10px] text-text-muted">Avg:</span>
                  <span className="font-mono text-xs font-semibold text-text-secondary">
                    {activity.avgPower} W
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TSS — ring badge */}
          {activity.tss != null && tssInfo != null && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border-subtle bg-bg-elevated/40 px-4 py-4">
              <div
                className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4"
                style={{
                  borderColor: tssInfo.color,
                  background: tssInfo.bg,
                  boxShadow: `0 0 24px ${tssInfo.color}30`,
                }}
              >
                <span className="font-mono text-2xl font-bold leading-none" style={{ color: tssInfo.color }}>
                  {Math.round(activity.tss)}
                </span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                  TSS
                </span>
              </div>
              <div
                className="mt-2.5 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: tssInfo.color, background: tssInfo.bg }}
              >
                {tssInfo.label}
              </div>
              <div className="mt-1 text-[10px] text-text-muted">Training Stress Score</div>
            </div>
          )}

          {/* IF — progress bar */}
          {activity.intensityFactor != null && (
            <div className="flex flex-col justify-center rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-transparent px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70">
                Intensity Factor
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold leading-none text-violet-400">
                {activity.intensityFactor.toFixed(3)}
              </div>
              <div className="mt-1 text-[10px] text-text-muted">IF = NP / FTP · 1.0 = Threshold</div>
              {/* Progress bar */}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[9px] text-text-muted">
                  <span>0</span>
                  <span className="font-semibold text-violet-400/70">
                    {(activity.intensityFactor * 100).toFixed(1)}%
                  </span>
                  <span>1.0</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-input">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, activity.intensityFactor * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Secondary metrics 4-col grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {vi != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Variability Index</div>
              <div className="mt-1 font-mono text-lg font-bold text-slate-400">{vi.toFixed(3)}</div>
              <div className="mt-0.5 text-[9px] text-text-muted">NP / AP</div>
            </div>
          )}
          {ef != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Efficiency Factor</div>
              <div className="mt-1 font-mono text-lg font-bold text-emerald-400">{ef.toFixed(2)}</div>
              <div className="mt-0.5 text-[9px] text-text-muted">NP / Avg HR</div>
            </div>
          )}
          {activity.avgPower != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Avg Power</div>
              <div className="mt-1 font-mono text-lg font-bold text-text-primary">{activity.avgPower} W</div>
              <div className="mt-0.5 text-[9px] text-text-muted">Mean output</div>
            </div>
          )}
          {activity.maxPower != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Peak Power</div>
              <div className="mt-1 font-mono text-lg font-bold text-amber-400">{activity.maxPower} W</div>
              <div className="mt-0.5 text-[9px] text-text-muted">Max recorded</div>
            </div>
          )}
          {zoneConfig?.ftp != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">FTP Reference</div>
              <div className="mt-1 font-mono text-lg font-bold text-text-primary">{zoneConfig.ftp} W</div>
              <div className="mt-0.5 text-[9px] text-text-muted">Threshold</div>
            </div>
          )}
          {activity.aerobicTrainingEffect != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Aerobic TE</div>
              <div className="mt-1 font-mono text-lg font-bold text-cyan-400">{activity.aerobicTrainingEffect.toFixed(1)}</div>
              <div className="mt-0.5 text-[9px] text-text-muted">1.0 – 5.0 scale</div>
            </div>
          )}
          {activity.anaerobicTrainingEffect != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Anaerobic TE</div>
              <div className="mt-1 font-mono text-lg font-bold text-pink-400">{activity.anaerobicTrainingEffect.toFixed(1)}</div>
              <div className="mt-0.5 text-[9px] text-text-muted">High-intensity benefit</div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Zone Distribution ─────────────────────────────────────────── */}
      {zoneDurations.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15">
                <Zap size={12} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">Power Zone Distribution</h3>
            </div>
            {zoneConfig?.effectiveDate && (
              <span className="rounded-full bg-bg-elevated/60 px-2.5 py-0.5 text-[10px] text-text-muted">
                Profile {new Date(zoneConfig.effectiveDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Horizontal stacked bar */}
          <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-bg-input">
            {zoneDurations.map((z) => (
              <div
                key={z.zone}
                title={`Z${z.zone} ${z.name}: ${z.pct.toFixed(1)}%`}
                className="h-full transition-all duration-700"
                style={{ width: `${Math.max(0, z.pct)}%`, background: z.color }}
              />
            ))}
          </div>

          {/* Zone rows */}
          <div className="flex flex-col gap-2.5">
            {zoneDurations.map((z) => (
              <div
                key={z.zone}
                className="group flex items-center gap-3"
              >
                {/* Zone badge */}
                <div
                  className="flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
                  style={{ background: `${z.color}22`, color: z.color, border: `1px solid ${z.color}44` }}
                >
                  Z{z.zone}
                </div>

                {/* Name */}
                <span className="w-24 flex-shrink-0 truncate text-xs font-semibold text-text-secondary">
                  {z.name}
                </span>

                {/* Bar */}
                <div className="relative flex-1 overflow-hidden rounded-full bg-bg-input" style={{ height: "12px" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500 group-hover:brightness-125"
                    style={{
                      width: `${Math.max(0, Math.min(100, z.pct))}%`,
                      background: z.color,
                      boxShadow: `0 0 8px ${z.color}50`,
                    }}
                  />
                </div>

                {/* Stats */}
                <div className="flex w-28 flex-shrink-0 items-center justify-end gap-2.5 text-[11px]">
                  <span className="text-text-secondary">{fmtDuration(z.seconds)}</span>
                  <span
                    className="w-10 text-right font-bold tabular-nums"
                    style={{ color: z.pct > 5 ? z.color : "var(--text-muted)" }}
                  >
                    {z.pct.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── MMP Curve ─────────────────────────────────────────────────── */}
        {mmpCurve.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15">
                  <Zap size={12} className="text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  Mean Maximal Power (MMP)
                </h3>
              </div>
              <span className="text-[10px] text-text-muted">
                Best power per duration
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mmpCurve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mmpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="W"
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1e1e30",
                    border: "1px solid #2e2e44",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "#e8e8ed",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  }}
                  itemStyle={{ color: "#e8e8ed" }}
                  labelStyle={{ color: "#8b8b9e", marginBottom: 2 }}
                  formatter={(v) => [`${Math.round(Number(v))} W`, "Peak Power"]}
                />
                {zoneConfig?.ftp && (
                  <ReferenceLine
                    y={zoneConfig.ftp}
                    stroke="#f59e0b"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: `FTP ${zoneConfig.ftp}W`, position: "insideTopRight", fill: "#f59e0b", fontSize: 10 }}
                  />
                )}
                {activity.normalizedPower && (
                  <ReferenceLine
                    y={activity.normalizedPower}
                    stroke="#3b82f6"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={{ value: `NP ${activity.normalizedPower}W`, position: "insideBottomRight", fill: "#3b82f6", fontSize: 10 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#mmpGrad)"
                  dot={{ fill: "#3b82f6", r: 3, stroke: "#fff", strokeWidth: 1 }}
                  activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Best efforts table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="pb-2 text-left font-semibold text-text-muted">Window</th>
                    <th className="pb-2 text-right font-semibold text-text-muted">Peak (W)</th>
                    {zoneConfig?.ftp && (
                      <th className="pb-2 text-right font-semibold text-text-muted">% FTP</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {mmpCurve.map((r) => (
                    <tr key={r.label} className="border-b border-border-subtle/30 last:border-0 hover:bg-bg-elevated/30">
                      <td className="py-1.5 font-medium text-text-secondary">{r.label}</td>
                      <td className="py-1.5 text-right font-bold tabular-nums text-text-primary">
                        {Math.round(r.value)}
                      </td>
                      {zoneConfig?.ftp && (
                        <td className="py-1.5 text-right tabular-nums text-text-secondary">
                          {((r.value / zoneConfig.ftp) * 100).toFixed(0)}%
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Power Over Time ───────────────────────────────────────────── */}
        {powerOverTime.length > 20 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15">
                  <Zap size={12} className="text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">Power Over Time</h3>
              </div>
              {activity.normalizedPower && (
                <span className="text-xs text-text-muted">
                  NP: <span className="font-bold text-blue-400">{activity.normalizedPower} W</span>
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={powerOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="powerTimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.35} vertical={false} />
                <XAxis
                  dataKey="t"
                  tickFormatter={(t: number) => {
                    const h = Math.floor(t / 3600);
                    const m = Math.floor((t % 3600) / 60);
                    return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m}m`;
                  }}
                  tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  unit="W"
                  width={44}
                />
                <Tooltip
                  contentStyle={{ background: "#1e1e30", border: "1px solid #2e2e44", borderRadius: 8, fontSize: 12, color: "#e8e8ed", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                  itemStyle={{ color: "#e8e8ed" }}
                  labelStyle={{ color: "#8b8b9e", marginBottom: 2 }}
                  formatter={(v) => [`${Number(v)} W`, "Power"]}
                  labelFormatter={(t) => {
                    const h = Math.floor(Number(t) / 3600);
                    const m = Math.floor((Number(t) % 3600) / 60);
                    const s = Number(t) % 60;
                    return h > 0 ? `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}` : `${m}:${s.toString().padStart(2,"0")}`;
                  }}
                />
                {activity.normalizedPower && (
                  <ReferenceLine y={activity.normalizedPower} stroke="#3b82f6" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: `NP ${activity.normalizedPower}W`, position: "right", fill: "#3b82f6", fontSize: 10 }} />
                )}
                {zoneConfig?.ftp && (
                  <ReferenceLine y={zoneConfig.ftp} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: `FTP ${zoneConfig.ftp}W`, position: "right", fill: "#f59e0b", fontSize: 10 }} />
                )}
                <Area
                  type="monotone"
                  dataKey="power"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#powerTimeGrad)"
                  dot={false}
                  connectNulls
                  activeDot={{ r: 5, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* ── Power Distribution histogram ──────────────────────────────── */}
      {powerHistogram.length > 3 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/15">
                <Zap size={12} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Power Distribution</h3>
                <p className="mt-0.5 text-[11px] text-text-muted">Time spent at each 25-watt power band</p>
              </div>
            </div>
            {activity.avgPower != null && (
              <span className="text-xs text-text-muted">
                Avg: <span className="font-bold text-text-primary">{activity.avgPower} W</span>
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={powerHistogram}
              margin={{ top: 4, right: 12, bottom: 40, left: 0 }}
              barCategoryGap="15%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#8b8b9e", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                angle={-35}
                textAnchor="end"
                height={44}
              />
              <YAxis
                tick={{ fill: "#8b8b9e", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                unit="%"
                width={36}
                tickFormatter={(v) => v.toFixed(0)}
              />
              <Tooltip
                contentStyle={{
                  background: "#1e1e30",
                  border: "1px solid #2e2e44",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e8e8ed",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
                itemStyle={{ color: "#e8e8ed" }}
                labelStyle={{ color: "#8b8b9e", fontWeight: 600, marginBottom: 4 }}
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, _name: any, props: any) => [
                  `${Number(v).toFixed(1)}%  ·  ${fmtDuration(props.payload?.seconds)}`,
                  `${props.payload?.wattMin}–${props.payload?.wattMax} W`,
                ]}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {powerHistogram.map((entry) => {
                  // Color by zone if we have zone config
                  const zone = zoneConfig?.zones?.find((z, idx, arr) => {
                    const min = z.min ?? 0;
                    const max = z.max ?? Infinity;
                    const isLast = idx === arr.length - 1;
                    return entry.wattMin >= min && (isLast ? entry.wattMin <= max : entry.wattMin < max);
                  });
                  const color = zone
                    ? ZONE_COLORS[(zone.zone - 1) % ZONE_COLORS.length]
                    : "#3b82f6";
                  return <Cell key={entry.label} fill={color} fillOpacity={0.85} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Zone legend strip */}
          {zoneConfig?.zones && zoneConfig.zones.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2.5">
              {[...zoneConfig.zones]
                .sort((a, b) => a.zone - b.zone)
                .map((z) => {
                  const color = ZONE_COLORS[(z.zone - 1) % ZONE_COLORS.length];
                  const label = z.max != null
                    ? `${z.min ?? 0}–${z.max} W`
                    : `>${z.min ?? 0} W`;
                  return (
                    <div key={z.zone} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: color }}
                      />
                      <span className="text-[10px] text-text-muted">
                        <span className="font-bold" style={{ color }}>Z{z.zone}</span>
                        {" "}
                        <span className="text-text-muted/70">{z.name}</span>
                        {" "}
                        <span className="font-mono text-[9px]">{label}</span>
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
