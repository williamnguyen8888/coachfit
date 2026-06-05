/**
 * ActivityRunningFormPanel.tsx
 * Running dynamics panel — Vertical Oscillation, Ground Contact Time,
 * Stride Length over time + summary metric tiles.
 * Shown only when sport === "running" and running dynamics data is present.
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
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, StreamPoint } from "@/lib/types/activity";
import { downsample } from "@/lib/utils/streamUtils";

interface Props {
  activity: ActivityDetail;
  points: StreamPoint[];
}

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface MetricTile {
  label: string;
  value: string;
  sub: string;
  color: string;
}

interface MiniChartProps {
  data: { t: number; value: number | null }[];
  color: string;
  unit: string;
  label: string;
  gradientId: string;
}

function MiniChart({ data, color, unit, label, gradientId }: MiniChartProps) {
  const hasData = data.some((d) => d.value != null);
  if (!hasData) return null;

  return (
    <Card>
      <div className="mb-3 text-xs font-bold text-text-primary">{label}</div>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="t"
            tickFormatter={formatTime}
            tick={{ fill: "var(--text-muted)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--text-muted)", fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            unit={` ${unit}`}
            width={46}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [`${Number(v).toFixed(1)} ${unit}`, label]}
            labelFormatter={(t) => formatTime(Number(t))}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ActivityRunningFormPanel({ activity, points }: Props) {
  const hasRunningDynamics =
    activity.avgVerticalOscillation != null ||
    activity.avgGroundContactTime != null ||
    activity.avgStepLength != null;

  const sampledPoints = useMemo(() => downsample(points, 500), [points]);

  // Derive stride length from cadence + speed when not directly available
  const strideData = useMemo(() => {
    return sampledPoints
      .filter((p) => p.cadence != null && p.speed != null && p.cadence > 0)
      .map((p) => {
        const stridesPerSec = (p.cadence ?? 0) / 60;
        const strideLen = stridesPerSec > 0 ? (p.speed ?? 0) / stridesPerSec : null;
        return { t: p.t, value: strideLen != null ? Math.round(strideLen * 1000) : null };
      });
  }, [sampledPoints]);

  // Cadence over time (steps/min = cadence × 2 for running)
  const cadenceData = useMemo(() => {
    return sampledPoints
      .filter((p) => p.cadence != null && p.cadence > 0)
      .map((p) => ({ t: p.t, value: p.cadence ?? null }));
  }, [sampledPoints]);

  // GCT over time (if in stream)
  const gctData = useMemo(() => {
    return sampledPoints
      .filter((p) => (p as { groundContactTime?: number }).groundContactTime != null)
      .map((p) => ({ t: p.t, value: (p as { groundContactTime?: number }).groundContactTime ?? null }));
  }, [sampledPoints]);

  const tiles: MetricTile[] = [];

  if (activity.avgVerticalOscillation != null) {
    tiles.push({
      label: "Avg Vertical Oscillation",
      value: `${activity.avgVerticalOscillation.toFixed(1)} mm`,
      sub: "VO — lower is more efficient",
      color: "#8b5cf6",
    });
  }
  if (activity.avgGroundContactTime != null) {
    tiles.push({
      label: "Avg Ground Contact Time",
      value: `${Math.round(activity.avgGroundContactTime)} ms`,
      sub: "GCT — lower is better",
      color: "#f59e0b",
    });
  }
  if (activity.avgStepLength != null) {
    tiles.push({
      label: "Avg Step Length",
      value: `${(activity.avgStepLength / 1000).toFixed(2)} m`,
      sub: "per step",
      color: "#22c55e",
    });
  }
  if (activity.avgVerticalRatio != null) {
    tiles.push({
      label: "Vertical Ratio",
      value: `${activity.avgVerticalRatio.toFixed(1)} %`,
      sub: "VO / stride length",
      color: "#ef4444",
    });
  }

  if (!hasRunningDynamics && strideData.length === 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <Activity size={16} className="mt-0.5 text-text-muted" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">No running dynamics data</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Running dynamics (Vertical Oscillation, Ground Contact Time, Stride Length) require a
              compatible running dynamics sensor or pod (e.g. a foot pod or wrist sensor with
              advanced biomechanics support).
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {tiles.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={16} className="text-purple-400" />
            <h2 className="text-base font-bold text-text-primary">Running Form Metrics</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="rounded-xl border border-border-subtle bg-bg-elevated/40 px-4 py-3"
                style={{ borderColor: `${tile.color}30` }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {tile.label}
                </div>
                <div className="mt-1 text-xl font-bold" style={{ color: tile.color }}>
                  {tile.value}
                </div>
                <div className="mt-0.5 text-[10px] text-text-muted">{tile.sub}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Elite runners: VO &lt; 70 mm · GCT &lt; 200 ms · Vertical Ratio &lt; 9%
          </p>
        </Card>
      )}

      {strideData.length > 20 && (
        <MiniChart
          data={strideData}
          color="#22c55e"
          unit="mm"
          label="Stride Length over Time (cadence × speed derived)"
          gradientId="strideGrad"
        />
      )}

      {cadenceData.length > 20 && (
        <MiniChart
          data={cadenceData}
          color="#a78bfa"
          unit="rpm"
          label="Cadence over Time (steps/min)"
          gradientId="cadGrad"
        />
      )}

      {gctData.length > 20 && (
        <MiniChart
          data={gctData}
          color="#f59e0b"
          unit="ms"
          label="Ground Contact Time over Time"
          gradientId="gctGrad"
        />
      )}
    </div>
  );
}
