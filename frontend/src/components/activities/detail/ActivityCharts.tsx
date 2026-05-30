"use client";

/**
 * ActivityCharts — time-series charts for heart rate, power, altitude etc.
 *
 * Uses Recharts AreaChart with dark CoachFit design tokens.
 * Tabs let the user switch between streams.
 * Mobile: horizontal scroll on tab bar.
 */

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { StreamPoint } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Downsampling                                                         */
/* ------------------------------------------------------------------ */

function downsample(points: StreamPoint[], maxPoints = 400): StreamPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  return points.filter((_, i) => i % step === 0);
}

/* ------------------------------------------------------------------ */
/*  Formatters                                                           */
/* ------------------------------------------------------------------ */

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}h`;
  return `${m}m`;
}

/* ------------------------------------------------------------------ */
/*  Custom tooltip                                                       */
/* ------------------------------------------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 12px",
        boxShadow: "var(--shadow-md)",
        fontSize: "var(--text-sm)",
      }}
    >
      <p style={{ color: "var(--text-muted)", marginBottom: 4, fontSize: "var(--text-xs)" }}>
        {fmtTime(label ?? 0)}
      </p>
      {payload.map((entry: { color: string; value: number; name: string }, i: number) => (
        <p key={i} style={{ color: entry.color, margin: "2px 0", fontWeight: 500 }}>
          {Number(entry.value).toFixed(0)}{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{entry.name}</span>
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab config                                                           */
/* ------------------------------------------------------------------ */

type ChartTab = "hr" | "power" | "altitude" | "speed" | "cadence";

interface TabConfig {
  id: ChartTab;
  label: string;
  dataKey: keyof StreamPoint;
  unit: string;
  color: string;
}

const TABS: TabConfig[] = [
  { id: "hr",       label: "Heart Rate", dataKey: "hr",       unit: "bpm", color: "#F87171" },
  { id: "power",    label: "Power",      dataKey: "power",    unit: "W",   color: "#8B5CF6" },
  { id: "altitude", label: "Elevation",  dataKey: "altitude", unit: "m",   color: "#60A5FA" },
  { id: "speed",    label: "Speed",      dataKey: "speed",    unit: "m/s", color: "#34D399" },
  { id: "cadence",  label: "Cadence",    dataKey: "cadence",  unit: "rpm", color: "#FBBF24" },
];

/* ------------------------------------------------------------------ */
/*  ActivityCharts                                                       */
/* ------------------------------------------------------------------ */

interface ActivityChartsProps {
  points: StreamPoint[] | null;
}

export function ActivityCharts({ points }: ActivityChartsProps) {
  const [activeTab, setActiveTab] = React.useState<ChartTab>("hr");

  const sampled = React.useMemo(
    () => (points ? downsample(points, 400) : []),
    [points]
  );

  const availableTabs = React.useMemo(
    () => TABS.filter((tab) => sampled.some((p) => p[tab.dataKey] != null)),
    [sampled]
  );

  React.useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  if (availableTabs.length === 0) {
    return (
      <Card>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-4)" }}>
          Performance Charts
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center", padding: "var(--space-8) 0" }}>
          No time-series data available
        </p>
      </Card>
    );
  }

  return (
    <Card noPadding>
      <div style={{ padding: "var(--space-5) var(--space-5) 0", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Performance Charts
        </h2>

        <div role="tablist" aria-label="Chart metric" style={{ display: "flex", gap: "var(--space-1)", overflowX: "auto", paddingBottom: 1 }}>
          {availableTabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`chart-tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`chart-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-full)",
                  border: isActive ? `1px solid ${tab.color}66` : "1px solid var(--border-subtle)",
                  background: isActive ? `${tab.color}1A` : "transparent",
                  color: isActive ? tab.color : "var(--text-secondary)",
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all var(--duration-micro) ease-out",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`chart-panel-${activeTab}`}
        aria-labelledby={`chart-tab-${activeTab}`}
        style={{ padding: "var(--space-4) var(--space-2)" }}
      >
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={sampled} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${currentTab.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={currentTab.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={currentTab.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={fmtTime}
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={{ stroke: "var(--border-subtle)" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={42}
              tickFormatter={(v: number) => v.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-default)", strokeWidth: 1, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey={currentTab.dataKey as string}
              name={currentTab.unit}
              stroke={currentTab.color}
              strokeWidth={2}
              fill={`url(#grad-${currentTab.id})`}
              dot={false}
              activeDot={{ r: 4, fill: currentTab.color }}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
