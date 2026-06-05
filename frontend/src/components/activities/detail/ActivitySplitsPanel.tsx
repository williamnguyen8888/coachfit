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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Layers } from "lucide-react";
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

  if (splits.length === 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <Layers size={16} className="mt-0.5 text-text-muted" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">No splits available</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Splits require GPS distance data. Upload a file that includes distance stream.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const barColor = activity.sport === "cycling" ? "#3b82f6" : activity.sport === "swimming" ? "#06b6d4" : "#22c55e";

  return (
    <div className="flex flex-col gap-5">
      {/* Pace/speed trend bar chart */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={16} style={{ color: barColor }} />
            <h2 className="text-base font-bold text-text-primary">{splitLabel}</h2>
          </div>
          <span className="text-[10px] text-text-muted">{splits.length} splits</span>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={splits} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--text-muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              unit=" s"
              width={38}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => [
                activity.sport === "swimming"
                  ? fmtPace(Number(v) / 10, "/100m")
                  : fmtPace(Number(v), "/km"),
                "Pace",
              ]}
            />
            <Bar dataKey="paceSecsPerUnit" radius={[4, 4, 0, 0]}>
              {splits.map((s) => (
                <Cell key={s.splitIndex} fill={paceColor(splits, s.paceSecsPerUnit)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <p className="mt-2 text-[10px] text-text-muted">
          🟢 fastest · 🟡 average · 🔴 slowest
        </p>
      </Card>

      {/* Splits detail table */}
      <Card noPadding>
        <div className="px-5 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-text-primary">Split Detail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border-subtle bg-bg-elevated/30">
                <th className="px-4 py-2.5 text-left font-semibold text-text-muted">Split</th>
                <th className="px-4 py-2.5 text-right font-semibold text-text-muted">Time</th>
                <th className="px-4 py-2.5 text-right font-semibold text-text-muted">
                  {activity.sport === "cycling" ? "Speed" : `Pace ${unitLabel}`}
                </th>
                {hasHR && (
                  <th className="px-4 py-2.5 text-right font-semibold text-text-muted">Avg HR</th>
                )}
                {hasPower && (
                  <th className="px-4 py-2.5 text-right font-semibold text-text-muted">Avg W</th>
                )}
                {hasCadence && (
                  <th className="px-4 py-2.5 text-right font-semibold text-text-muted">Cadence</th>
                )}
              </tr>
            </thead>
            <tbody>
              {splits.map((s, i) => (
                <tr
                  key={s.splitIndex}
                  className={`border-b border-border-subtle/50 last:border-0 ${
                    i % 2 === 0 ? "bg-bg-elevated/20" : ""
                  }`}
                >
                  <td className="px-4 py-2.5 font-bold text-text-primary">{s.label}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                    {fmtClock(s.durationSeconds)}
                  </td>
                  <td
                    className="px-4 py-2.5 text-right font-bold"
                    style={{ color: paceColor(splits, s.paceSecsPerUnit) }}
                  >
                    {activity.sport === "cycling"
                      ? `${((1000 / s.paceSecsPerUnit) * 3.6).toFixed(1)} km/h`
                      : activity.sport === "swimming"
                      ? fmtPace(s.paceSecsPerUnit / 10, "/100m")
                      : fmtPace(s.paceSecsPerUnit, "/km")}
                  </td>
                  {hasHR && (
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {s.avgHR != null ? `${s.avgHR} bpm` : "—"}
                    </td>
                  )}
                  {hasPower && (
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {s.avgPower != null ? `${s.avgPower} W` : "—"}
                    </td>
                  )}
                  {hasCadence && (
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {s.avgCadence != null
                        ? `${s.avgCadence} ${activity.sport === "swimming" ? "spm" : "rpm"}`
                        : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
