/**
 * ActivityElevationPanel.tsx
 * Elevation profile, VAM, grade distribution, km splits, and best efforts.
 * For running: includes best effort times for standard distances.
 * For cycling: shows VAM and grade analysis.
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
import { Mountain, Timer } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, StreamPoint, Sport } from "@/lib/types/activity";
import {
  computeVAM,
  computeKmSplits,
  computeBestEfforts,
  fmtPace,
  fmtClock,
  fmtDuration,
  downsample,
} from "@/lib/utils/streamUtils";

interface Props {
  activity: ActivityDetail;
  points: StreamPoint[];
}

export function ActivityElevationPanel({ activity, points }: Props) {
  // Elevation profile data
  const elevationData = useMemo(() => {
    const withAlt = points.filter((p) => p.altitude != null);
    if (withAlt.length < 2) return [];
    const sampled = downsample(withAlt, 500);
    return sampled.map((p) => ({
      t: p.t,
      alt: p.altitude,
      // Use distance as X if available, else time
      x: p.distance != null ? Math.round(p.distance / 100) / 10 : p.t / 60,
    }));
  }, [points]);

  const hasElevation = elevationData.length > 0;
  const hasDistance = points.some((p) => p.distance != null);

  // VAM
  const vam = useMemo(
    () => computeVAM(activity.elevationGainMeters, activity.durationSeconds),
    [activity.elevationGainMeters, activity.durationSeconds],
  );

  // Km splits
  const kmSplits = useMemo(() => computeKmSplits(points), [points]);

  // Best efforts (running only)
  const bestEfforts = useMemo(
    () =>
      activity.sport === "running" || activity.sport === "swimming"
        ? computeBestEfforts(points)
        : [],
    [activity.sport, points],
  );

  // Grade distribution
  const gradeDistribution = useMemo(() => {
    const withGrade = points.filter((p) => p.grade != null && p.distance != null);
    if (withGrade.length < 10) return [];

    const buckets = [
      { label: "> 15%", min: 15, max: Infinity, meters: 0, color: "#ef4444" },
      { label: "8–15%", min: 8, max: 15, meters: 0, color: "#f59e0b" },
      { label: "3–8%", min: 3, max: 8, meters: 0, color: "#22c55e" },
      { label: "-3–3%", min: -3, max: 3, meters: 0, color: "#3b82f6" },
      { label: "-8 to -3%", min: -8, max: -3, meters: 0, color: "#06b6d4" },
      { label: "< -8%", min: -Infinity, max: -8, meters: 0, color: "#9333ea" },
    ];

    for (let i = 1; i < withGrade.length; i++) {
      const prev = withGrade[i - 1];
      const curr = withGrade[i];
      const segDist = (curr.distance ?? 0) - (prev.distance ?? 0);
      if (segDist <= 0) continue;
      const g = curr.grade!;
      const b = buckets.find((bk) => g >= bk.min && g < bk.max);
      if (b) b.meters += segDist;
    }

    const total = buckets.reduce((a, b) => a + b.meters, 0);
    return buckets
      .filter((b) => b.meters > 0)
      .map((b) => ({ ...b, pct: total > 0 ? (b.meters / total) * 100 : 0 }));
  }, [points]);

  if (!hasElevation && kmSplits.length === 0 && bestEfforts.length === 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <Mountain size={16} className="mt-0.5 text-text-muted" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">No elevation or pacing data</h3>
            <p className="mt-1 text-sm text-text-secondary">
              No altitude or distance stream available for this activity.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Elevation + metrics */}
      {hasElevation && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mountain size={16} className="text-emerald-400" />
              <h2 className="text-base font-bold text-text-primary">Elevation Profile</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              {activity.elevationGainMeters != null && activity.elevationGainMeters > 0 && (
                <span>+{Math.round(activity.elevationGainMeters)} m gain</span>
              )}
              {vam != null && (
                <span className="font-semibold text-emerald-400">
                  VAM {Math.round(vam)} m/h
                </span>
              )}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={elevationData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} />
              <XAxis
                dataKey="x"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                unit={hasDistance ? " km" : " min"}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                unit=" m"
                width={52}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [`${Math.round(Number(v))} m`, "Altitude"]}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                labelFormatter={(x: any) =>
                  hasDistance ? `${Number(x).toFixed(1)} km` : `${Math.round(Number(x))} min`
                }
              />
              <Area
                type="monotone"
                dataKey="alt"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#elevGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>

          {/* VAM note */}
          {vam != null && (
            <p className="mt-3 text-xs text-text-muted">
              VAM (Velocità Ascensionale Media) = elevation gain per hour. Elite climbers: &gt;1,600 m/h.
              Cat-1 equivalent: 1,000–1,300 m/h.
            </p>
          )}
        </Card>
      )}

      {/* Grade distribution */}
      {gradeDistribution.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-bold text-text-primary">Grade Distribution</h3>
          <div className="flex flex-col gap-2.5">
            {gradeDistribution.map((g) => (
              <div key={g.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">{g.label}</span>
                  <div className="flex items-center gap-3 text-text-secondary">
                    <span>{(g.meters / 1000).toFixed(1)} km</span>
                    <span className="w-10 text-right font-bold text-text-primary">{g.pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-input">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${g.pct}%`, background: g.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Best Efforts (running / swimming) */}
      {bestEfforts.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Timer size={16} className="text-emerald-400" />
            <h3 className="text-sm font-bold text-text-primary">Best Efforts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="pb-2 text-left font-semibold text-text-muted">Distance</th>
                  <th className="pb-2 text-right font-semibold text-text-muted">Time</th>
                  <th className="pb-2 text-right font-semibold text-text-muted">Pace</th>
                </tr>
              </thead>
              <tbody>
                {bestEfforts.map((e) => (
                  <tr key={e.label} className="border-b border-border-subtle/30 last:border-0">
                    <td className="py-2 font-semibold text-text-primary">{e.label}</td>
                    <td className="py-2 text-right font-bold text-text-primary">
                      {fmtClock(e.durationSeconds)}
                    </td>
                    <td className="py-2 text-right text-text-secondary">
                      {activity.sport === "swimming"
                        ? fmtPace(e.paceSecsPerKm / 10, "/100m")
                        : fmtPace(e.paceSecsPerKm, "/km")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Km splits */}
      {kmSplits.length >= 2 && (
        <Card>
          <h3 className="mb-4 text-sm font-bold text-text-primary">
            {activity.sport === "swimming" ? "100m Splits" : "Km Splits"}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="pb-2 text-left font-semibold text-text-muted">
                    {activity.sport === "swimming" ? "100m" : "Km"}
                  </th>
                  <th className="pb-2 text-right font-semibold text-text-muted">Split Time</th>
                  <th className="pb-2 text-right font-semibold text-text-muted">Pace</th>
                  <th className="pb-2 text-right font-semibold text-text-muted">Avg HR</th>
                </tr>
              </thead>
              <tbody>
                {kmSplits.map((s) => (
                  <tr key={s.km} className="border-b border-border-subtle/30 last:border-0">
                    <td className="py-1.5 font-semibold text-text-primary">
                      {activity.sport === "swimming"
                        ? `${Math.round(s.km * 10) * 100}m`
                        : `${s.km.toFixed(0)} km`}
                    </td>
                    <td className="py-1.5 text-right text-text-secondary">
                      {fmtClock(s.durationSeconds)}
                    </td>
                    <td className="py-1.5 text-right font-bold text-text-primary">
                      {activity.sport === "swimming"
                        ? fmtPace(s.paceSecsPerKm / 10, "/100m")
                        : fmtPace(s.paceSecsPerKm, "/km")}
                    </td>
                    <td className="py-1.5 text-right text-text-secondary">
                      {s.avgHR != null ? `${Math.round(s.avgHR)} bpm` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
