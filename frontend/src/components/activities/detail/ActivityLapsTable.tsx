/**
 * ActivityLapsTable.tsx
 * Full-width professional laps table with sortable columns.
 * Shows all available lap metrics: duration, distance, pace/speed,
 * avg/max HR, avg/max power, cadence, elevation gain.
 * Clicking a row selects the time range in the main chart.
 */
"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import { ArrowUpDown, BarChart2, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityLap, Sport } from "@/lib/types/activity";
import { fmtPace, fmtClock, fmtDuration } from "@/lib/utils/streamUtils";
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

interface Props {
  laps: ActivityLap[];
  sport: Sport;
  selectedLapIndex: number | null;
  onSelectLap: (lapIndex: number | null, startOffsetSeconds: number, endOffsetSeconds: number) => void;
}

type SortKey =
  | "lapIndex"
  | "durationSeconds"
  | "distanceMeters"
  | "avgHeartRate"
  | "maxHeartRate"
  | "avgPower"
  | "maxPower"
  | "normalizedPower"
  | "avgCadence"
  | "paceOrSpeed"
  | "maxSpeed"
  | "elevationGain"
  | "elevationDescent";

interface ColDef {
  key: SortKey;
  label: string;
  align: "left" | "right";
  render: (lap: ActivityLap, sport: Sport) => string | null;
  visible: (sport: Sport, laps: ActivityLap[]) => boolean;
}

const COLUMNS: ColDef[] = [
  {
    key: "lapIndex",
    label: "Lap",
    align: "left",
    render: (l) => `${(l.lapIndex ?? 0) + 1}`,
    visible: () => true,
  },
  {
    key: "durationSeconds",
    label: "Duration",
    align: "right",
    render: (l) => (l.durationSeconds != null ? fmtClock(l.durationSeconds) : "—"),
    visible: () => true,
  },
  {
    key: "distanceMeters",
    label: "Distance",
    align: "right",
    render: (l, sport) => {
      if (l.distanceMeters == null) return "—";
      if (sport === "swimming") return `${Math.round(l.distanceMeters)} m`;
      return `${(l.distanceMeters / 1000).toFixed(2)} km`;
    },
    visible: (_, laps) => laps.some((l) => l.distanceMeters != null),
  },
  {
    key: "paceOrSpeed",
    label: "Pace/Speed",
    align: "right",
    render: (l, sport) => {
      if (l.avgPace != null && l.avgPace > 0) {
        // avgPace is stored as sec/meter in DB, convert to sec/km or sec/100m
        const secsPerKm = l.avgPace * 1000;
        if (sport === "swimming") return fmtPace(secsPerKm / 10, "/100m");
        return fmtPace(secsPerKm, "/km");
      }
      if (l.avgSpeed != null && l.avgSpeed > 0) {
        if (sport === "running") {
          return fmtPace(1000 / l.avgSpeed, "/km");
        }
        return `${(l.avgSpeed * 3.6).toFixed(1)} km/h`;
      }
      return "—";
    },
    visible: (_, laps) =>
      laps.some((l) => l.avgPace != null || l.avgSpeed != null),
  },
  {
    key: "avgHeartRate",
    label: "Avg HR",
    align: "right",
    render: (l) => (l.avgHeartRate != null ? `${l.avgHeartRate} bpm` : "—"),
    visible: (_, laps) => laps.some((l) => l.avgHeartRate != null),
  },
  {
    key: "maxHeartRate",
    label: "Max HR",
    align: "right",
    render: (l) => (l.maxHeartRate != null ? `${l.maxHeartRate}` : "—"),
    visible: (_, laps) => laps.some((l) => l.maxHeartRate != null),
  },
  {
    key: "avgPower",
    label: "Avg W",
    align: "right",
    render: (l) => (l.avgPower != null ? `${l.avgPower}` : "—"),
    visible: (sport, laps) =>
      sport === "cycling" && laps.some((l) => l.avgPower != null),
  },
  {
    key: "maxPower",
    label: "Max W",
    align: "right",
    render: (l) => (l.maxPower != null ? `${l.maxPower}` : "—"),
    visible: (sport, laps) =>
      sport === "cycling" && laps.some((l) => l.maxPower != null),
  },
  {
    key: "avgCadence",
    label: "Cadence",
    align: "right",
    render: (l, sport) => {
      if (l.avgCadence == null) return "—";
      return sport === "swimming" ? `${l.avgCadence} spm` : `${l.avgCadence} rpm`;
    },
    visible: (_, laps) => laps.some((l) => l.avgCadence != null),
  },
  {
    key: "elevationGain",
    label: "↑ Elev",
    align: "right",
    render: (l) =>
      l.elevationGain != null && l.elevationGain > 0
        ? `+${Math.round(l.elevationGain)} m`
        : "—",
    visible: (_, laps) =>
      laps.some((l) => l.elevationGain != null && l.elevationGain > 0),
  },
  {
    key: "elevationDescent",
    label: "↓ Desc",
    align: "right",
    render: (l) =>
      l.elevationDescent != null && l.elevationDescent > 0
        ? `-${Math.round(l.elevationDescent)} m`
        : "—",
    visible: (_, laps) =>
      laps.some((l) => l.elevationDescent != null && l.elevationDescent > 0),
  },
  {
    key: "normalizedPower",
    label: "NP",
    align: "right",
    render: (l) => (l.normalizedPower != null ? `${l.normalizedPower} W` : "—"),
    visible: (sport, laps) =>
      sport === "cycling" && laps.some((l) => l.normalizedPower != null),
  },
  {
    key: "maxSpeed",
    label: "Max Speed",
    align: "right",
    render: (l, sport) => {
      if (l.maxSpeed == null) return "—";
      if (sport === "running") return fmtPace(1000 / l.maxSpeed, "/km");
      return `${(l.maxSpeed * 3.6).toFixed(1)} km/h`;
    },
    visible: (_, laps) => laps.some((l) => l.maxSpeed != null),
  },
  {
    key: "lapIndex" as SortKey,  // re-using lapIndex sort key for trigger (no sort)
    label: "Trigger",
    align: "right",
    render: (l) => {
      if (!l.lapTrigger) return "—";
      return l.lapTrigger;
    },
    visible: (_, laps) => laps.some((l) => l.lapTrigger != null),
  },
];

function sortLaps(laps: ActivityLap[], key: SortKey, dir: "asc" | "desc"): ActivityLap[] {
  return [...laps].sort((a, b) => {
    let av: number | null = null;
    let bv: number | null = null;

    if (key === "lapIndex") { av = a.lapIndex; bv = b.lapIndex; }
    else if (key === "durationSeconds") { av = a.durationSeconds; bv = b.durationSeconds; }
    else if (key === "distanceMeters") { av = a.distanceMeters; bv = b.distanceMeters; }
    else if (key === "avgHeartRate") { av = a.avgHeartRate; bv = b.avgHeartRate; }
    else if (key === "maxHeartRate") { av = a.maxHeartRate; bv = b.maxHeartRate; }
    else if (key === "avgPower") { av = a.avgPower; bv = b.avgPower; }
    else if (key === "maxPower") { av = a.maxPower; bv = b.maxPower; }
    else if (key === "normalizedPower") { av = a.normalizedPower; bv = b.normalizedPower; }
    else if (key === "avgCadence") { av = a.avgCadence; bv = b.avgCadence; }
    else if (key === "elevationGain") { av = a.elevationGain; bv = b.elevationGain; }
    else if (key === "elevationDescent") { av = a.elevationDescent; bv = b.elevationDescent; }
    else if (key === "maxSpeed") { av = a.maxSpeed; bv = b.maxSpeed; }
    else if (key === "paceOrSpeed") {
      av = a.avgSpeed ?? (a.avgPace ? 1 / a.avgPace : null);
      bv = b.avgSpeed ?? (b.avgPace ? 1 / b.avgPace : null);
    }

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return dir === "asc" ? av - bv : bv - av;
  });
}

/**
 * Computes the elapsed-time offset (from activity start) of each lap.
 * Laps in the DB don't store start_offset explicitly, only startTime.
 * We derive offsets by accumulating durationSeconds from lap 0.
 */
function buildLapOffsets(laps: ActivityLap[]): Map<number, { start: number; end: number }> {
  const sorted = [...laps].sort((a, b) => (a.lapIndex ?? 0) - (b.lapIndex ?? 0));
  const map = new Map<number, { start: number; end: number }>();
  let offset = 0;
  for (const lap of sorted) {
    const dur = lap.durationSeconds ?? 0;
    map.set(lap.lapIndex, { start: offset, end: offset + dur });
    offset += dur;
  }
  return map;
}

export function ActivityLapsTable({ laps, sport, selectedLapIndex, onSelectLap }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("lapIndex");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const lapOffsets = useMemo(() => buildLapOffsets(laps), [laps]);

  const sorted = useMemo(
    () => sortLaps(laps, sortKey, sortDir),
    [laps, sortKey, sortDir],
  );

  const visibleCols = useMemo(
    () => COLUMNS.filter((c) => c.visible(sport, laps)),
    [sport, laps],
  );

  const handleSort = useCallback((key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey]);

  const handleRowClick = useCallback(
    (lap: ActivityLap) => {
      const offset = lapOffsets.get(lap.lapIndex);
      if (!offset) return;
      if (selectedLapIndex === lap.lapIndex) {
        onSelectLap(null, 0, 0);
      } else {
        onSelectLap(lap.lapIndex, offset.start, offset.end);
      }
    },
    [lapOffsets, selectedLapIndex, onSelectLap],
  );

  if (laps.length === 0) return null;

  // Build chart data for lap comparison
  const chartLaps = [...laps].sort((a, b) => (a.lapIndex ?? 0) - (b.lapIndex ?? 0));
  const hasPowerLaps = chartLaps.some((l) => l.avgPower != null);
  const hasPaceLaps = chartLaps.some((l) => l.avgSpeed != null || l.avgPace != null);

  // Use power if cycling, else use pace (lower = faster, so we invert)
  const chartData = chartLaps.map((lap) => {
    const lapN = (lap.lapIndex ?? 0) + 1;
    if (hasPowerLaps && lap.avgPower != null) {
      return { lap: lapN, value: lap.avgPower, lapObj: lap, unit: "W" };
    }
    if (hasPaceLaps) {
      const speed = lap.avgSpeed ?? (lap.avgPace ? 1 / lap.avgPace : null);
      if (speed && speed > 0) {
        const paceSecKm = 1000 / speed;
        return { lap: lapN, value: Math.round(paceSecKm), lapObj: lap, unit: "s/km" };
      }
    }
    return { lap: lapN, value: lap.durationSeconds ?? 0, lapObj: lap, unit: "s" };
  });

  const allValues = chartData.map((d) => d.value).filter((v) => v > 0);
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1;
  const isPace = chartData[0]?.unit === "s/km";

  const formatChartValue = (v: number): string => {
    if (chartData[0]?.unit === "W") return `${v} W`;
    if (isPace) return fmtPace(v, sport === "swimming" ? "/100m" : "/km");
    return fmtDuration(v);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Visual lap comparison */}
      {chartData.length >= 2 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-text-muted" />
              <h3 className="text-sm font-bold text-text-primary">
                Lap {hasPowerLaps ? "Power" : isPace ? "Pace" : "Duration"} Comparison
              </h3>
            </div>
            <span className="text-[10px] text-text-muted">Click bar to highlight</span>
          </div>
          <ResponsiveContainer width="100%" height={Math.min(180, 40 + chartData.length * 24)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 48, bottom: 0, left: 4 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.3} horizontal={false} />
              <XAxis
                type="number"
                domain={isPace ? [minVal - 5, maxVal + 5] : [minVal * 0.95, maxVal * 1.05]}
                tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatChartValue}
                hide
              />
              <YAxis
                type="category"
                dataKey="lap"
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `L${v}`}
                width={24}
              />
              <Tooltip
                contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [formatChartValue(Number(v)), hasPowerLaps ? "Avg Power" : "Avg Pace"]}
                labelFormatter={(v) => `Lap ${v}`}
              />
              <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={18}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(data: any) => {
                  if (data?.lapObj) {
                    handleRowClick(data.lapObj as ActivityLap);
                  }
                }}
              >
                {chartData.map((d) => {
                  const isSelected = selectedLapIndex === d.lapObj.lapIndex;
                  // For pace: lower is faster = greener; higher is slower = redder
                  // For power: higher is harder = use accent
                  let color: string;
                  if (isSelected) {
                    color = "var(--color-accent)";
                  } else if (allValues.length > 1) {
                    const t = (d.value - minVal) / (maxVal - minVal);
                    // pace: higher t (slower pace) = more red; power: higher t (more power) = blue
                    const r = isPace ? Math.round(80 + t * 160) : Math.round(59 + (1 - t) * 60);
                    const g = isPace ? Math.round(200 - t * 150) : Math.round(130 + t * 60);
                    const b = isPace ? 100 : Math.round(230 - t * 60);
                    color = `rgb(${r},${g},${b})`;
                  } else {
                    color = "#3b82f6";
                  }
                  return <Cell key={d.lap} fill={color} fillOpacity={isSelected ? 1 : 0.75} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Value labels on bars */}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {chartData.map((d) => {
              const isSelected = selectedLapIndex === d.lapObj.lapIndex;
              return (
                <button
                  key={d.lap}
                  onClick={() => handleRowClick(d.lapObj)}
                  className={`flex items-center gap-1 text-[10px] transition-colors ${
                    isSelected ? "font-bold text-accent" : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span>L{d.lap}</span>
                  <span className="font-mono">{formatChartValue(d.value)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      )}
      <Card noPadding>
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div className="flex items-center gap-2">
          <Layers size={15} className="text-text-muted" />
          <h2 className="text-sm font-bold text-text-primary">
            Laps ({laps.length})
          </h2>
        </div>
        <span className="text-[10px] text-text-muted">Click a row to highlight on chart</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-elevated/30">
              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none whitespace-nowrap px-4 py-2.5 font-semibold text-text-muted transition-colors hover:text-text-primary ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? (
                        <ChevronUp size={11} />
                      ) : (
                        <ChevronDown size={11} />
                      )
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((lap, rowIdx) => {
              const isSelected = selectedLapIndex === lap.lapIndex;
              return (
                <tr
                  key={lap.lapIndex}
                  id={`lap-row-${lap.lapIndex}`}
                  onClick={() => handleRowClick(lap)}
                  className={`cursor-pointer border-b border-border-subtle/50 transition-colors last:border-0 ${
                    isSelected
                      ? "bg-accent/15"
                      : rowIdx % 2 === 0
                        ? "hover:bg-bg-elevated/50"
                        : "bg-bg-elevated/20 hover:bg-bg-elevated/50"
                  }`}
                >
                  {visibleCols.map((col) => (
                    <td
                      key={col.key + col.label}
                      className={`whitespace-nowrap px-4 py-2.5 ${
                        col.align === "right" ? "text-right" : "text-left"
                      } ${
                        col.key === "lapIndex"
                          ? "font-bold text-text-primary"
                          : col.key === "avgPower" || col.key === "avgHeartRate"
                            ? "font-semibold text-text-primary"
                            : "text-text-secondary"
                      } ${isSelected ? "text-accent" : ""}`}
                    >
                      {col.label === "Trigger" && col.render(lap, sport) !== "—" ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            col.render(lap, sport) === "manual"
                              ? "bg-blue-500/20 text-blue-400"
                              : col.render(lap, sport) === "distance"
                              ? "bg-green-500/20 text-green-400"
                              : col.render(lap, sport) === "time"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          {col.render(lap, sport)}
                        </span>
                      ) : (
                        col.render(lap, sport) ?? "—"
                      )}
                    </td>
                  ))}
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
