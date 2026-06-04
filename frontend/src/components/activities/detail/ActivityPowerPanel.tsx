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
} from "recharts";
import { AlertCircle, Info, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, StreamPoint } from "@/lib/types/activity";
import type { SportZones } from "@/lib/types/settings";
import {
  buildSeries,
  computePeakRollingAverages,
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

interface MetricTile {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  description?: string;
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

  // Derived metrics
  const vi = useMemo(
    () => computeVI(activity.normalizedPower, activity.avgPower),
    [activity.normalizedPower, activity.avgPower],
  );
  const ef = useMemo(
    () => computeEF(activity.normalizedPower, activity.avgSpeed, activity.avgHeartRate, activity.sport),
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

  // Build metric tiles
  const tiles: MetricTile[] = [];

  if (activity.normalizedPower != null) {
    tiles.push({
      label: "Normalized Power",
      value: `${activity.normalizedPower} W`,
      sub: "NP",
      accent: true,
      description: "Power you could maintain for same physiological cost at constant effort",
    });
  }
  if (activity.avgPower != null) {
    tiles.push({
      label: "Average Power",
      value: `${activity.avgPower} W`,
      sub: "AP",
    });
  }
  if (activity.intensityFactor != null) {
    tiles.push({
      label: "Intensity Factor",
      value: activity.intensityFactor.toFixed(3),
      sub: "IF = NP/FTP",
      accent: true,
      description: "Ratio of normalized power to your FTP. 1.0 = threshold effort",
    });
  }
  if (activity.tss != null) {
    tiles.push({
      label: "TSS",
      value: Math.round(activity.tss).toString(),
      sub: "Training Stress Score",
      accent: true,
      description: "Overall training stress: (duration × NP × IF) / (FTP × 3600) × 100",
    });
  }
  if (vi != null) {
    tiles.push({
      label: "Variability Index",
      value: vi.toFixed(3),
      sub: "VI = NP/AP",
      description: "1.0 = perfectly steady. Higher = more variable pacing",
    });
  }
  if (ef != null) {
    tiles.push({
      label: "Efficiency Factor",
      value: ef.toFixed(2),
      sub: "NP/Avg HR",
      description: "Aerobic efficiency: higher = more watts per heartbeat",
    });
  }
  if (activity.maxPower != null) {
    tiles.push({ label: "Peak Power", value: `${activity.maxPower} W`, sub: "Max" });
  }
  if (zoneConfig?.ftp != null) {
    tiles.push({ label: "FTP Reference", value: `${zoneConfig.ftp} W`, sub: "Threshold" });
  }

  const avgPowerCalc = weightedAverage(series);
  const peakPowerStream = seriesMax(series);

  return (
    <div className="flex flex-col gap-5">
      {/* Metrics grid */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Zap size={16} className="text-blue-400" />
          <h2 className="text-base font-bold text-text-primary">Power Analysis</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <div
              key={t.label}
              title={t.description}
              className={`rounded-xl border px-4 py-3 ${
                t.accent
                  ? "border-blue-500/30 bg-blue-500/10"
                  : "border-border-subtle bg-bg-elevated/40"
              }`}
            >
              <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                {t.label}
              </div>
              <div
                className={`mt-1 text-xl font-bold leading-tight ${
                  t.accent ? "text-blue-400" : "text-text-primary"
                }`}
              >
                {t.value}
              </div>
              {t.sub && (
                <div className="mt-0.5 text-[10px] text-text-muted">{t.sub}</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* MMP Curve */}
        {mmpCurve.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                Mean Maximal Power (MMP) Curve
              </h3>
              <span className="text-[10px] text-text-muted">
                Best power for each duration
              </span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={mmpCurve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mmpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
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
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${Math.round(Number(v))} W`, "Peak Power"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#mmpGrad)"
                  dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }}
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
                    <tr key={r.label} className="border-b border-border-subtle/30 last:border-0">
                      <td className="py-1.5 font-medium text-text-secondary">{r.label}</td>
                      <td className="py-1.5 text-right font-bold text-text-primary">
                        {Math.round(r.value)}
                      </td>
                      {zoneConfig?.ftp && (
                        <td className="py-1.5 text-right text-text-secondary">
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

        {/* Power zone distribution */}
        {zoneDurations.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Power Zone Distribution</h3>
              {zoneConfig?.effectiveDate && (
                <span className="text-[10px] text-text-muted">
                  Profile from{" "}
                  {new Date(zoneConfig.effectiveDate).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              {zoneDurations.map((z) => (
                <div key={z.zone}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: z.color }}
                      />
                      <span className="font-semibold text-text-primary">
                        Z{z.zone} — {z.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-text-secondary">
                      <span>{fmtDuration(z.seconds)}</span>
                      <span className="w-10 text-right font-bold text-text-primary">
                        {z.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-input">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(0, Math.min(100, z.pct))}%`,
                        background: z.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* No zone config note */}
            {!zoneConfig?.zones?.length && (
              <p className="mt-3 text-xs text-text-muted">
                Configure your power zones in Settings → Training Zones to see zone distribution.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
