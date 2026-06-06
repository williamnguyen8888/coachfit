/**
 * ActivityHRPanel.tsx
 * Professional Heart Rate analysis panel.
 * Shows: HR zone distribution, avg/peak HR, LTHR time, aerobic decoupling,
 * HR peak curve (60s, 5m, 20m), and Pw:HR efficiency factor.
 */
"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { AlertCircle, Heart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, StreamPoint } from "@/lib/types/activity";
import type { SportZones } from "@/lib/types/settings";
import {
  buildSeries,
  computePeakRollingAverages,
  computeAerobicDecoupling,
  totalDuration,
  fmtDuration,
} from "@/lib/utils/streamUtils";

const HR_ZONE_COLORS = [
  "#64748b", // Z1 recovery
  "#3b82f6", // Z2 aerobic
  "#22c55e", // Z3 tempo
  "#f59e0b", // Z4 threshold
  "#ef4444", // Z5 VO2max
];

const HR_PEAK_WINDOWS = [60, 300, 1200, 3600];

interface Props {
  activity: ActivityDetail;
  points: StreamPoint[];
  zoneConfig: SportZones | null | undefined;
}

export function ActivityHRPanel({ activity, points, zoneConfig }: Props) {
  const series = useMemo(() => buildSeries(points, (p) => p.hr, 0), [points]);

  const peakCurve = useMemo(
    () => computePeakRollingAverages(series, HR_PEAK_WINDOWS, false),
    [series],
  );

  const decoupling = useMemo(
    () => computeAerobicDecoupling(points, activity.sport === "cycling" ? "power" : "pace"),
    [points, activity.sport],
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
      color: HR_ZONE_COLORS[(band.zone - 1) % HR_ZONE_COLORS.length],
    }));
  }, [series, zoneConfig]);

  const timeAboveLTHR = useMemo(() => {
    if (!zoneConfig?.lthr) return null;
    const secs = series.filter((s) => s.value >= zoneConfig.lthr!).reduce((a, s) => a + s.duration, 0);
    return secs;
  }, [series, zoneConfig]);

  // HR over time (downsampled for rendering)
  const hrOverTime = useMemo(() => {
    const step = Math.max(1, Math.floor(series.length / 500));
    return series
      .filter((_, i) => i % step === 0)
      .map((s) => ({ t: s.t, hr: Math.round(s.value) }));
  }, [series]);

  // HR reserve % (if max HR configured)
  const hrReservePct = useMemo(() => {
    if (!activity.avgHeartRate || !zoneConfig?.maxHr) return null;
    const restHR = 45; // approx resting HR fallback
    const reserve = zoneConfig.maxHr - restHR;
    if (reserve <= 0) return null;
    return Math.round(((activity.avgHeartRate - restHR) / reserve) * 100);
  }, [activity.avgHeartRate, zoneConfig?.maxHr]);

  // %MaxHR for avg HR circle
  const pctMaxHr = useMemo(() => {
    if (!activity.avgHeartRate || !zoneConfig?.maxHr) return null;
    return Math.round((activity.avgHeartRate / zoneConfig.maxHr) * 100);
  }, [activity.avgHeartRate, zoneConfig?.maxHr]);

  if (series.length === 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-border-subtle bg-bg-elevated p-2 text-text-muted">
            <AlertCircle size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">No heart rate data</h3>
            <p className="mt-1 text-sm text-text-secondary">
              This activity does not include a heart rate stream. Use a chest strap or optical
              heart rate monitor to unlock HR analysis.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Hero metrics card ────────────────────────────────────────── */}
      <Card>
        <div className="mb-5 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20">
            <Heart size={14} className="text-red-400" />
          </div>
          <h2 className="text-base font-bold text-text-primary">Heart Rate Analysis</h2>
        </div>

        {/* Primary 3-col hero */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Avg HR — glassmorphism */}
          {activity.avgHeartRate != null && (
            <div
              className="relative overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-900/5 px-5 py-4"
              style={{ boxShadow: "0 0 0 1px rgba(239,68,68,0.1), 0 8px 32px rgba(239,68,68,0.08)" }}
            >
              <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl bg-gradient-to-b from-red-400 to-red-600" />
              <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400/70">
                Avg Heart Rate
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-bold leading-none text-red-400">
                  {activity.avgHeartRate}
                </span>
                <span className="text-base font-normal text-red-400/60">bpm</span>
              </div>

              {/* Mini %MaxHR arc indicator */}
              {pctMaxHr != null && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-input">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-700"
                      style={{ width: `${Math.min(100, pctMaxHr)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-red-400/70">{pctMaxHr}% max</span>
                </div>
              )}
              {pctMaxHr == null && (
                <div className="mt-1 text-[10px] text-text-muted">Average across activity</div>
              )}
            </div>
          )}

          {/* Peak HR */}
          {activity.maxHeartRate != null && (
            <div className="flex flex-col justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-red-400/70">
                Peak Heart Rate
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-bold leading-none text-red-400">
                  {activity.maxHeartRate}
                </span>
                <span className="text-base font-normal text-red-400/60">bpm</span>
              </div>
              {zoneConfig?.maxHr && (
                <div className="mt-2 text-[10px] text-text-muted">
                  {Math.round((activity.maxHeartRate / zoneConfig.maxHr) * 100)}% of configured max
                </div>
              )}
            </div>
          )}

          {/* HR Reserve */}
          {hrReservePct != null && (
            <div className="flex flex-col justify-center rounded-2xl border border-border-subtle bg-bg-elevated/40 px-5 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                HR Reserve Used
              </div>
              <div className="mt-1.5 font-mono text-3xl font-bold leading-none text-text-primary">
                {hrReservePct}
                <span className="ml-1 text-base font-normal text-text-muted">%</span>
              </div>
              <div className="mt-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-input">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-400 transition-all duration-700"
                    style={{ width: `${Math.min(100, hrReservePct)}%` }}
                  />
                </div>
              </div>
              <div className="mt-1 text-[10px] text-text-muted">of HRR</div>
            </div>
          )}
        </div>

        {/* Secondary tiles */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {zoneConfig?.lthr != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">LTHR Ref</div>
              <div className="mt-1 font-mono text-lg font-bold text-amber-400">{zoneConfig.lthr} bpm</div>
              <div className="mt-0.5 text-[9px] text-text-muted">Lactate Threshold HR</div>
            </div>
          )}
          {timeAboveLTHR != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Time ≥ LTHR</div>
              <div className="mt-1 font-mono text-lg font-bold text-text-primary">{fmtDuration(timeAboveLTHR)}</div>
              <div className="mt-0.5 text-[9px] text-text-muted">Threshold+ work</div>
            </div>
          )}
          {zoneConfig?.maxHr != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/30 px-3.5 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-widest text-text-muted">Max HR Ref</div>
              <div className="mt-1 font-mono text-lg font-bold text-text-primary">{zoneConfig.maxHr} bpm</div>
              <div className="mt-0.5 text-[9px] text-text-muted">Configured max</div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Aerobic Decoupling ────────────────────────────────────────── */}
      {decoupling != null && (
        <Card>
          {/* Colored left accent border based on result */}
          <div className="flex gap-4">
            <div
              className="w-1 flex-shrink-0 rounded-full"
              style={{
                background: decoupling.isGood
                  ? "#22c55e"
                  : Math.abs(decoupling.value) < 10
                  ? "#f59e0b"
                  : "#ef4444",
              }}
            />
            <div className="flex-1">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-md"
                    style={{
                      background: decoupling.isGood
                        ? "rgba(34,197,94,0.15)"
                        : Math.abs(decoupling.value) < 10
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(239,68,68,0.15)",
                    }}
                  >
                    <Heart
                      size={12}
                      style={{
                        color: decoupling.isGood
                          ? "#22c55e"
                          : Math.abs(decoupling.value) < 10
                          ? "#f59e0b"
                          : "#ef4444",
                      }}
                    />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Aerobic Decoupling ({activity.sport === "cycling" ? "Pw:HR" : "Pa:HR"})
                  </h3>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    decoupling.isGood
                      ? "bg-green-500/20 text-green-400"
                      : Math.abs(decoupling.value) < 10
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {decoupling.isGood ? "Well Coupled" : "Decoupled"}
                </span>
              </div>

              {/* 1st EF → 2nd EF with large arrow */}
              <div className="flex items-center gap-4">
                <div className="flex-1 rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">1st Half EF</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-text-primary">
                    {decoupling.firstHalfEF.toFixed(2)}
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="flex flex-col items-center gap-1">
                  <span
                    className="text-2xl font-bold"
                    style={{
                      color: decoupling.isGood
                        ? "#22c55e"
                        : Math.abs(decoupling.value) < 10
                        ? "#f59e0b"
                        : "#ef4444",
                    }}
                  >
                    {decoupling.isGood ? "→" : "↑"}
                  </span>
                  <span className="text-[9px] text-text-muted">drift</span>
                </div>

                <div className="flex-1 rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3 text-center">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">2nd Half EF</div>
                  <div className="mt-1 font-mono text-2xl font-bold text-text-primary">
                    {decoupling.secondHalfEF.toFixed(2)}
                  </div>
                </div>

                {/* % badge */}
                <div
                  className={`flex flex-col items-center justify-center rounded-xl border px-4 py-3 text-center ${
                    decoupling.isGood
                      ? "border-green-500/30 bg-green-500/10"
                      : Math.abs(decoupling.value) < 10
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">Decoup.</div>
                  <div
                    className={`mt-1 font-mono text-2xl font-bold ${
                      decoupling.isGood
                        ? "text-green-400"
                        : Math.abs(decoupling.value) < 10
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {decoupling.value.toFixed(1)}%
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
                {decoupling.isGood
                  ? "< 5%: Excellent fitness. Efficiency was maintained throughout."
                  : Math.abs(decoupling.value) < 10
                    ? "5–10%: Acceptable. Some fatigue or heat stress detected."
                    : "> 10%: Significant decoupling. Check base aerobic fitness."}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── HR Zone Distribution ──────────────────────────────────────── */}
      {zoneDurations.length > 0 && zoneDurations.some((z) => z.pct > 0) && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15">
                <Heart size={12} className="text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">HR Zone Distribution</h3>
            </div>
            {zoneConfig?.effectiveDate && (
              <span className="rounded-full bg-bg-elevated/60 px-2.5 py-0.5 text-[10px] text-text-muted">
                from {new Date(zoneConfig.effectiveDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
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
              <div key={z.zone} className="group flex items-center gap-3">
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
                    {z.pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── HR Over Time ─────────────────────────────────────────────── */}
      {hrOverTime.length > 20 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15">
                <Heart size={12} className="text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">Heart Rate Over Time</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              {activity.avgHeartRate && <span>Avg: <span className="font-bold text-red-400">{activity.avgHeartRate} bpm</span></span>}
              {activity.maxHeartRate && <span>Peak: <span className="font-bold text-red-400">{activity.maxHeartRate} bpm</span></span>}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hrOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hrTimeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.3} vertical={false} />
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
                unit=" bpm"
                width={48}
                domain={["dataMin - 10", "dataMax + 5"]}
              />
              <Tooltip
                contentStyle={{ background: "#1e1e30", border: "1px solid #2e2e44", borderRadius: 8, fontSize: 12, color: "#e8e8ed", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                itemStyle={{ color: "#e8e8ed" }}
                labelStyle={{ color: "#8b8b9e", marginBottom: 2 }}
                formatter={(v) => [`${Number(v)} bpm`, "Heart Rate"]}
                labelFormatter={(t) => {
                  const h = Math.floor(Number(t) / 3600);
                  const m = Math.floor((Number(t) % 3600) / 60);
                  const s = Number(t) % 60;
                  return h > 0 ? `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}` : `${m}:${s.toString().padStart(2,"0")}`;
                }}
              />
              {zoneConfig?.lthr && (
                <ReferenceLine
                  y={zoneConfig.lthr}
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: `LTHR ${zoneConfig.lthr}`, position: "right", fill: "#f59e0b", fontSize: 10 }}
                />
              )}
              {zoneConfig?.maxHr && (
                <ReferenceLine
                  y={zoneConfig.maxHr}
                  stroke="#ef4444"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{ value: `Max ${zoneConfig.maxHr}`, position: "right", fill: "#ef4444", fontSize: 10 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="hr"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#hrTimeGrad)"
                dot={false}
                connectNulls
                activeDot={{ r: 5, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Peak HR by Duration ───────────────────────────────────────── */}
      {peakCurve.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/15">
                <Heart size={12} className="text-red-400" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">Peak HR by Duration</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={peakCurve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} unit=" bpm" width={48} />
              <Tooltip
                contentStyle={{ background: "#1e1e30", border: "1px solid #2e2e44", borderRadius: 8, fontSize: 12, color: "#e8e8ed", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                itemStyle={{ color: "#e8e8ed" }}
                labelStyle={{ color: "#8b8b9e", marginBottom: 2 }}
                formatter={(v: any) => [`${Math.round(Number(v))} bpm`, "Peak HR"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#hrGrad)"
                dot={{ fill: "#ef4444", r: 5, stroke: "#fff", strokeWidth: 2 }}
                activeDot={{ r: 6, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
