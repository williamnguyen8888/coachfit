"use client";

// src/components/coach/tabs/AthletePmcTab.tsx
// Performance Management Chart for an athlete (CTL/ATL/TSB over time).

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { athleteDataService } from "@/lib/services/coach";

interface PmcEntry {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
}

interface AthletePmcTabProps {
  athleteId: string;
}

const RANGE_OPTIONS = [
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
] as const;

export function AthletePmcTab({ athleteId }: AthletePmcTabProps) {
  const [data, setData] = useState<PmcEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRange, setSelectedRange] = useState<90 | 180 | 365>(90);

  const load = useCallback(async () => {
    setLoading(true);
    const to = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - selectedRange * 86400_000)
      .toISOString()
      .split("T")[0];
    try {
      const res = await athleteDataService.getPmc(athleteId, from, to);
      setData(res.entries ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [athleteId, selectedRange]);

  useEffect(() => {
    load();
  }, [load]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: { value: number; name: string; color: string }[];
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    return (
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "var(--space-3) var(--space-4)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            marginBottom: "var(--space-2)",
          }}
        >
          {label}
        </div>
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center gap-2"
            style={{ fontSize: "var(--text-sm)" }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: entry.color,
                display: "inline-block",
              }}
            />
            <span style={{ color: "var(--text-secondary)" }}>
              {entry.name.toUpperCase()}:
            </span>
            <span
              className="font-metric tabular-nums"
              style={{ color: entry.color, fontWeight: 600 }}
            >
              {entry.value?.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Range selector */}
      <div className="flex items-center justify-between">
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Performance Management Chart
        </span>
        <div
          className="flex"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          {RANGE_OPTIONS.map(({ label, days }) => (
            <button
              key={days}
              onClick={() =>
                setSelectedRange(days as typeof selectedRange)
              }
              style={{
                padding: "4px 12px",
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background:
                  selectedRange === days
                    ? "var(--color-accent)"
                    : "transparent",
                color:
                  selectedRange === days
                    ? "white"
                    : "var(--text-muted)",
                transition: "all var(--duration-micro)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div
          style={{
            height: 280,
            borderRadius: "var(--radius-md)",
            background:
              "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)",
            backgroundSize: "400px 100%",
            animation: "skeleton-shimmer 1.6s ease-in-out infinite",
          }}
        />
      ) : data.length === 0 ? (
        <div
          style={{
            height: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            fontSize: "var(--text-sm)",
          }}
        >
          No PMC data available
        </div>
      ) : (
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, bottom: 4, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{
                  fontSize: 10,
                  fill: "var(--text-muted)",
                }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  paddingTop: 8,
                }}
              />
              <Line
                type="monotone"
                dataKey="ctl"
                name="CTL"
                stroke="var(--color-fitness)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-fitness)" }}
              />
              <Line
                type="monotone"
                dataKey="atl"
                name="ATL"
                stroke="var(--color-fatigue)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-fatigue)" }}
              />
              <Line
                type="monotone"
                dataKey="tsb"
                name="TSB"
                stroke="var(--color-form)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-form)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend guide */}
      <div
        className="flex gap-6"
        style={{
          padding: "var(--space-3) var(--space-4)",
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {[
          { color: "var(--color-fitness)", label: "CTL", desc: "Fitness" },
          { color: "var(--color-fatigue)", label: "ATL", desc: "Fatigue" },
          { color: "var(--color-form)", label: "TSB", desc: "Form" },
        ].map(({ color, label, desc }) => (
          <div key={label} className="flex items-center gap-2">
            <span
              style={{
                width: 12,
                height: 3,
                borderRadius: 2,
                background: color,
                display: "inline-block",
              }}
            />
            <span
              style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
            >
              <strong style={{ color }}>{label}</strong> — {desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
