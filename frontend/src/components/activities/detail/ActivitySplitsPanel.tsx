/**
 * ActivitySplitsPanel.tsx
 * Auto-calculated km splits from distance + time streams.
 * Running: every 1 km. Cycling: every 5 km. Swimming: every 100 m.
 * No fabricated data — only calculated from real stream data.
 */
"use client";

import * as React from "react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Heart, Layers, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, StreamPoint, Sport } from "@/lib/types/activity";
import { fmtPace, fmtClock } from "@/lib/utils/streamUtils";

interface Props {
  activity: ActivityDetail;
  points: StreamPoint[];
}

interface SplitRow {
  label: string;         // "1 km", "5 km", "100 m"
  splitIndex: number;
  durationSeconds: number;
  distanceMeters: number;
  paceSecsPerUnit: number;    // sec/km for running, sec/km for cycling, sec/100m for swimming
  avgHR: number | null;
  avgPower: number | null;
  avgCadence: number | null;
}

function getSplitDistance(sport: Sport): number {
  if (sport === "swimming") return 100;    // 100 m
  if (sport === "cycling") return 5000;   // 5 km
  return 1000;                             // 1 km (running, hiking, etc.)
}

function computeSplits(points: StreamPoint[], sport: Sport): SplitRow[] {
  const splitDist = getSplitDistance(sport);
  const withDist = points.filter((p) => p.distance != null);
  if (withDist.length < 2) return [];

  const rows: SplitRow[] = [];
  let splitIndex = 1;
  let boundary = splitDist;
  let splitStart = withDist[0];

  const accHR: number[] = [];
  const accPower: number[] = [];
  const accCadence: number[] = [];

  for (let i = 1; i < withDist.length; i++) {
    const p = withDist[i];
    if (p.hr != null) accHR.push(p.hr);
    if (p.power != null) accPower.push(p.power);
    if (p.cadence != null) accCadence.push(p.cadence);

    if ((p.distance ?? 0) >= boundary) {
      const dur = p.t - splitStart.t;
      const dist = (p.distance ?? 0) - (splitStart.distance ?? 0);
      if (dur > 0 && dist > 0) {
        const speedMps = dist / dur;
        let paceSecsPerUnit: number;
        if (sport === "swimming") {
          paceSecsPerUnit = 100 / speedMps;
        } else {
          paceSecsPerUnit = 1000 / speedMps;
        }

        rows.push({
          label:
            sport === "swimming"
              ? `${Math.round(boundary)} m`
              : sport === "cycling"
              ? `${(boundary / 1000).toFixed(0)} km`
              : `${(boundary / 1000).toFixed(0)} km`,
          splitIndex,
          durationSeconds: dur,
          distanceMeters: dist,
          paceSecsPerUnit,
          avgHR: accHR.length > 0 ? Math.round(accHR.reduce((a, b) => a + b, 0) / accHR.length) : null,
          avgPower: accPower.length > 0 ? Math.round(accPower.reduce((a, b) => a + b, 0) / accPower.length) : null,
          avgCadence: accCadence.length > 0 ? Math.round(accCadence.reduce((a, b) => a + b, 0) / accCadence.length) : null,
        });
      }

      splitStart = p;
      accHR.length = 0;
      accPower.length = 0;
      accCadence.length = 0;
      splitIndex++;
      boundary += splitDist;
    }
  }

  return rows;
}

function paceColor(splits: SplitRow[], pace: number): string {
  if (splits.length === 0) return "#3b82f6";
  const paces = splits.map((s) => s.paceSecsPerUnit);
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  if (max === min) return "#3b82f6";
  const ratio = (pace - min) / (max - min);
  // fastest = green, slowest = red
  if (ratio < 0.33) return "#22c55e";
  if (ratio < 0.66) return "#f59e0b";
  return "#ef4444";
}

function paceBucket(splits: SplitRow[], pace: number): "fast" | "mid" | "slow" {
  if (splits.length === 0) return "mid";
  const paces = splits.map((s) => s.paceSecsPerUnit);
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  if (max === min) return "mid";
  const ratio = (pace - min) / (max - min);
  if (ratio < 0.33) return "fast";
  if (ratio < 0.66) return "mid";
  return "slow";
}

function PaceBadge({ bucket, label }: { bucket: "fast" | "mid" | "slow"; label: string }) {
  const styles = {
    fast: "bg-green-500/15 text-green-400 border border-green-500/30",
    mid: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    slow: "bg-red-500/15 text-red-400 border border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-mono font-semibold ${styles[bucket]}`}>
      {label}
    </span>
  );
}

function TrendIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return <span className="text-text-muted text-xs">—</span>;
  const diff = current - previous;
  const threshold = previous * 0.005; // 0.5% tolerance = same
  if (Math.abs(diff) <= threshold) {
    return <span className="text-text-muted text-xs font-bold">=</span>;
  }
  // Lower pace = faster
  if (diff < 0) {
    return <span className="text-green-400 text-xs font-bold leading-none">↑</span>;
  }
  return <span className="text-red-400 text-xs font-bold leading-none">↓</span>;
}

export function ActivitySplitsPanel({ activity, points }: Props) {
  const splits = useMemo(() => computeSplits(points, activity.sport), [points, activity.sport]);

  const hasPower = splits.some((s) => s.avgPower != null);
  const hasHR = splits.some((s) => s.avgHR != null);
  const hasCadence = splits.some((s) => s.avgCadence != null);

  const unitLabel =
    activity.sport === "swimming"
      ? "/100m"
      : "/km";

  const splitLabel =
    activity.sport === "swimming"
      ? "100m Splits"
      : activity.sport === "cycling"
      ? "5 km Splits"
      : "Km Splits";

  const formatPaceDisplay = (s: SplitRow) => {
    if (activity.sport === "cycling") {
      return `${((1000 / s.paceSecsPerUnit) * 3.6).toFixed(1)} km/h`;
    }
    if (activity.sport === "swimming") {
      // Bug fix: removed incorrect /10
      return fmtPace(s.paceSecsPerUnit, "/100m");
    }
    return fmtPace(s.paceSecsPerUnit, "/km");
  };

  if (splits.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated border border-border-subtle">
            <Layers size={20} className="text-text-muted" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">No splits available</h3>
            <p className="mt-1 text-xs text-text-secondary max-w-xs">
              Splits require GPS distance data. Upload a file that includes distance stream.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const paces = splits.map((s) => s.paceSecsPerUnit);
  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
  const bestSplit = splits.reduce((a, b) => a.paceSecsPerUnit < b.paceSecsPerUnit ? a : b);
  const worstSplit = splits.reduce((a, b) => a.paceSecsPerUnit > b.paceSecsPerUnit ? a : b);

  const barAccentColor = activity.sport === "cycling" ? "#3b82f6" : activity.sport === "swimming" ? "#06b6d4" : "#22c55e";

  return (
    <div className="flex flex-col gap-5">

      {/* Chart card */}
      <Card>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={15} style={{ color: barAccentColor }} />
            <h2 className="text-sm font-bold text-text-primary">{splitLabel}</h2>
          </div>
          <span className="rounded-full bg-bg-elevated border border-border-subtle px-2.5 py-0.5 text-[10px] font-semibold text-text-muted">
            {splits.length} splits
          </span>
        </div>

        {/* Summary stat pills */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {/* Best */}
          <div className="flex flex-col gap-1 rounded-lg border border-green-500/20 bg-green-500/8 px-3 py-2.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-green-500/70">Best</span>
            <span className="font-mono text-sm font-bold text-green-400">{formatPaceDisplay(bestSplit)}</span>
            <span className="text-[10px] text-text-muted">{bestSplit.label}</span>
          </div>
          {/* Avg */}
          <div className="flex flex-col gap-1 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500/70">Avg</span>
            <span className="font-mono text-sm font-bold text-amber-400">
              {activity.sport === "cycling"
                ? `${((1000 / avgPace) * 3.6).toFixed(1)} km/h`
                : activity.sport === "swimming"
                ? fmtPace(avgPace, "/100m")
                : fmtPace(avgPace, "/km")}
            </span>
            <span className="text-[10px] text-text-muted">average</span>
          </div>
          {/* Worst */}
          <div className="flex flex-col gap-1 rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/70">Worst</span>
            <span className="font-mono text-sm font-bold text-red-400">{formatPaceDisplay(worstSplit)}</span>
            <span className="text-[10px] text-text-muted">{worstSplit.label}</span>
          </div>
        </div>

        {/* Bar chart */}
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={splits} margin={{ top: 4, right: 12, bottom: 8, left: 0 }} barGap={4} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#8b8b9e", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8b8b9e", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                const m = Math.floor(v / 60);
                const s = Math.round(v % 60);
                return `${m}:${s.toString().padStart(2, "0")}`;
              }}
              width={42}
              domain={["auto", "auto"]}
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
              formatter={(v) => [
                activity.sport === "swimming"
                  ? fmtPace(Number(v), "/100m")
                  : activity.sport === "cycling"
                  ? `${((1000 / Number(v)) * 3.6).toFixed(1)} km/h`
                  : fmtPace(Number(v), "/km"),
                activity.sport === "cycling" ? "Speed" : "Pace",
              ]}
            />
            <ReferenceLine
              y={avgPace}
              stroke="#f59e0b"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              strokeOpacity={0.7}
            />
            <Bar dataKey="paceSecsPerUnit" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {splits.map((s) => (
                <Cell
                  key={s.splitIndex}
                  fill={paceColor(splits, s.paceSecsPerUnit)}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend pills */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-text-muted mr-1">Legend:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
            Fastest
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
            Average
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
            Slowest
          </span>
        </div>
      </Card>

      {/* Split detail table */}
      <Card noPadding>
        {/* Table header */}
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={13} className="text-text-muted" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-text-primary">Split Detail</h3>
          </div>
          <span className="text-[10px] text-text-muted">{splits.length} splits · {unitLabel}</span>
        </div>

        <div
          className="overflow-x-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "var(--border-subtle) transparent",
          }}
        >
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                  #
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                  {activity.sport === "cycling" ? "Speed" : `Pace ${unitLabel}`}
                </th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                  Time
                </th>
                <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                  Trend
                </th>
                {hasHR && (
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                    <span className="flex items-center justify-end gap-1">
                      <Heart size={9} className="text-red-400" />
                      HR
                    </span>
                  </th>
                )}
                {hasPower && (
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                    <span className="flex items-center justify-end gap-1">
                      <Zap size={9} className="text-blue-400" />
                      Power
                    </span>
                  </th>
                )}
                {hasCadence && (
                  <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-text-muted whitespace-nowrap">
                    Cadence
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {splits.map((s, i) => {
                const prev = i > 0 ? splits[i - 1] : null;
                const bucket = paceBucket(splits, s.paceSecsPerUnit);
                return (
                  <tr
                    key={s.splitIndex}
                    className="group border-b border-border-subtle/40 last:border-0 transition-colors hover:bg-bg-elevated/40"
                    style={{
                      borderLeft: "2px solid transparent",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.borderLeftColor = barAccentColor;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.borderLeftColor = "transparent";
                    }}
                  >
                    {/* Split number badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center justify-center rounded-md bg-bg-elevated border border-border-subtle px-1.5 py-0.5 text-[10px] font-bold text-text-muted min-w-[28px]">
                        #{s.splitIndex}
                      </span>
                    </td>

                    {/* Pace badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PaceBadge bucket={bucket} label={formatPaceDisplay(s)} />
                    </td>

                    {/* Time */}
                    <td className="px-4 py-3 text-right font-mono text-text-secondary whitespace-nowrap">
                      {fmtClock(s.durationSeconds)}
                    </td>

                    {/* Trend */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <TrendIndicator
                        current={s.paceSecsPerUnit}
                        previous={prev ? prev.paceSecsPerUnit : null}
                      />
                    </td>

                    {/* HR */}
                    {hasHR && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {s.avgHR != null ? (
                          <span className="flex items-center justify-end gap-1 font-mono text-text-secondary">
                            <Heart size={9} className="text-red-400/60" />
                            {s.avgHR}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    )}

                    {/* Power */}
                    {hasPower && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {s.avgPower != null ? (
                          <span className="flex items-center justify-end gap-1 font-mono text-text-secondary">
                            <Zap size={9} className="text-blue-400/60" />
                            {s.avgPower} W
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                    )}

                    {/* Cadence */}
                    {hasCadence && (
                      <td className="px-4 py-3 text-right font-mono text-text-secondary whitespace-nowrap">
                        {s.avgCadence != null
                          ? `${s.avgCadence} ${activity.sport === "swimming" ? "spm" : "rpm"}`
                          : <span className="text-text-muted">—</span>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
