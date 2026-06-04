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
      {/* Key metrics */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Heart size={16} className="text-red-400" />
          <h2 className="text-base font-bold text-text-primary">Heart Rate Analysis</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {activity.avgHeartRate != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Avg HR</div>
              <div className="mt-1 text-xl font-bold text-text-primary">{activity.avgHeartRate} bpm</div>
            </div>
          )}
          {activity.maxHeartRate != null && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Peak HR</div>
              <div className="mt-1 text-xl font-bold text-red-400">{activity.maxHeartRate} bpm</div>
            </div>
          )}
          {zoneConfig?.lthr != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">LTHR Reference</div>
              <div className="mt-1 text-xl font-bold text-amber-400">{zoneConfig.lthr} bpm</div>
              <div className="text-[10px] text-text-muted">Lactate Threshold HR</div>
            </div>
          )}
          {timeAboveLTHR != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Time ≥ LTHR</div>
              <div className="mt-1 text-xl font-bold text-text-primary">{fmtDuration(timeAboveLTHR)}</div>
              <div className="text-[10px] text-text-muted">Threshold + work</div>
            </div>
          )}
          {zoneConfig?.maxHr != null && (
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Max HR Ref</div>
              <div className="mt-1 text-xl font-bold text-text-primary">{zoneConfig.maxHr} bpm</div>
            </div>
          )}
        </div>
      </Card>

      {/* Aerobic decoupling */}
      {decoupling != null && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text-primary">
              Aerobic Decoupling ({activity.sport === "cycling" ? "Pw:HR" : "Pa:HR"})
            </h3>
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">1st Half EF</div>
              <div className="mt-1 text-lg font-bold text-text-primary">{decoupling.firstHalfEF.toFixed(3)}</div>
            </div>
            <div className="rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">2nd Half EF</div>
              <div className="mt-1 text-lg font-bold text-text-primary">{decoupling.secondHalfEF.toFixed(3)}</div>
            </div>
            <div
              className={`rounded-xl border px-4 py-3 ${
                decoupling.isGood
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-red-500/30 bg-red-500/10"
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Decoupling</div>
              <div
                className={`mt-1 text-lg font-bold ${decoupling.isGood ? "text-green-400" : "text-red-400"}`}
              >
                {decoupling.value.toFixed(1)}%
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-text-muted">
            {decoupling.isGood
              ? "< 5%: Excellent aerobic fitness. Your efficiency was maintained throughout the workout."
              : Math.abs(decoupling.value) < 10
                ? "5–10%: Acceptable. Some aerobic fatigue or heat stress present."
                : "> 10%: Significant decoupling. Consider hydration, pacing, or aerobic base work."}
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Peak HR curve */}
        {peakCurve.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Peak HR by Duration</h3>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={peakCurve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} unit=" bpm" width={56} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Math.round(Number(v))} bpm`, "Peak HR"]}
                />
                <Area type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} fill="url(#hrGrad)" dot={{ fill: "#ef4444", r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* HR zone distribution */}
        {zoneDurations.length > 0 && zoneDurations.some((z) => z.pct > 0) && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">HR Zone Distribution</h3>
              {zoneConfig?.effectiveDate && (
                <span className="text-[10px] text-text-muted">
                  from {new Date(zoneConfig.effectiveDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              {zoneDurations.map((z) => (
                <div key={z.zone}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: z.color }} />
                      <span className="font-semibold text-text-primary">Z{z.zone} — {z.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-text-secondary">
                      <span>{fmtDuration(z.seconds)}</span>
                      <span className="w-10 text-right font-bold text-text-primary">{z.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-input">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, Math.min(100, z.pct))}%`, background: z.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
