"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Award, Heart, Info, RefreshCw, Thermometer, TrendingUp, Zap, ZoomIn } from "lucide-react";
import type { ActivityLap, StreamPoint } from "@/lib/types/activity";

export interface InteractiveMultiLaneChartProps {
  points: StreamPoint[];
  sport: string;
  selectedRange?: { startTime: number; endTime: number } | null;
  onRangeSelect?: (range: { startTime: number; endTime: number } | null) => void;
  laps?: ActivityLap[];
}

type ChartPoint = StreamPoint & {
  paceSecs?: number | null;
  [key: string]: number | null | undefined;
};

interface ChartMouseEvent {
  activeTooltipIndex?: number | string | null;
  activeLabel?: number | string | null;
}

interface LaneDefinition {
  key: string;
  color: string;
  label: string;
  unit: string;
  icon: ReactNode;
  isPace?: boolean;
}

const MAX_RENDER_POINTS = 900;

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatSecondsToPace(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "--:--";
  }

  const rounded = Math.round(totalSeconds);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSpeedToPace(speedMps: number | null | undefined, type: "run" | "swim"): string {
  if (speedMps == null || speedMps <= 0.1) return "--:--";

  const totalSeconds = type === "run" ? 1000 / speedMps : 100 / speedMps;
  if (totalSeconds > 1800) return "--:--";
  return formatSecondsToPace(totalSeconds);
}

function downsamplePoints(points: StreamPoint[], maxPoints: number): StreamPoint[] {
  if (points.length <= maxPoints) return points;

  const sampled: StreamPoint[] = [];
  const stride = (points.length - 1) / (maxPoints - 1);

  for (let index = 0; index < maxPoints; index += 1) {
    const pointIndex = Math.round(index * stride);
    const point = points[pointIndex];

    if (!point) continue;
    if (sampled[sampled.length - 1] !== point) {
      sampled.push(point);
    }
  }

  const lastPoint = points[points.length - 1];
  if (sampled[sampled.length - 1] !== lastPoint) {
    sampled.push(lastPoint);
  }

  return sampled;
}

function buildLaneDefinitions(sport: string): LaneDefinition[] {
  if (sport === "running") {
    return [
      { key: "paceSecs", color: "#3B82F6", label: "Pace", unit: "/km", icon: <Zap size={12} />, isPace: true },
      { key: "hr", color: "#EF4444", label: "Heart Rate", unit: "bpm", icon: <Heart size={12} /> },
      { key: "cadence", color: "#A855F7", label: "Cadence", unit: "spm", icon: <Activity size={12} /> },
      { key: "altitude", color: "#10B981", label: "Altitude", unit: "m", icon: <Award size={12} /> },
      { key: "temperature", color: "#f59e0b", label: "Temperature", unit: "°C", icon: <Thermometer size={12} /> },
      { key: "grade", color: "#8b5cf6", label: "Grade", unit: "%", icon: <TrendingUp size={12} /> },
    ];
  }

  if (sport === "swimming") {
    return [
      { key: "paceSecs", color: "#06B6D4", label: "Swim Pace", unit: "/100m", icon: <Zap size={12} />, isPace: true },
      { key: "hr", color: "#EF4444", label: "Heart Rate", unit: "bpm", icon: <Heart size={12} /> },
      { key: "cadence", color: "#A855F7", label: "Stroke Rate", unit: "spm", icon: <Activity size={12} /> },
      { key: "temperature", color: "#f59e0b", label: "Temperature", unit: "°C", icon: <Thermometer size={12} /> },
    ];
  }

  return [
    { key: "power", color: "#3B82F6", label: "Power", unit: "W", icon: <Zap size={12} /> },
    { key: "hr", color: "#EF4444", label: "Heart Rate", unit: "bpm", icon: <Heart size={12} /> },
    { key: "cadence", color: "#A855F7", label: "Cadence", unit: "rpm", icon: <Activity size={12} /> },
    { key: "altitude", color: "#10B981", label: "Altitude", unit: "m", icon: <Award size={12} /> },
    { key: "temperature", color: "#f59e0b", label: "Temperature", unit: "°C", icon: <Thermometer size={12} /> },
    { key: "grade", color: "#8b5cf6", label: "Grade", unit: "%", icon: <TrendingUp size={12} /> },
  ];
}

function buildChartPoint(point: StreamPoint, sport: string): ChartPoint {
  const chartPoint: ChartPoint = { ...point };

  if (point.speed != null && point.speed > 0.1) {
    if (sport === "running") {
      chartPoint.paceSecs = 1000 / point.speed;
    } else if (sport === "swimming") {
      chartPoint.paceSecs = 100 / point.speed;
    }
  } else if (sport === "running" || sport === "swimming") {
    chartPoint.paceSecs = null;
  }

  return chartPoint;
}

export function InteractiveMultiLaneChart({
  points,
  sport,
  selectedRange: selectedRangeProp,
  onRangeSelect,
  laps,
}: InteractiveMultiLaneChartProps) {
  const [zoomRange, setZoomRange] = useState<{ startTime: number; endTime: number } | null>(null);
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [internalSelectedRange, setInternalSelectedRange] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [hoverData, setHoverData] = useState<{ time: number; point: ChartPoint } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // Track which lanes are collapsed (key = lane.key)
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());

  const selectedRange =
    selectedRangeProp !== undefined ? selectedRangeProp : internalSelectedRange;

  const setSelectedRange = (range: { startTime: number; endTime: number } | null) => {
    if (onRangeSelect) {
      onRangeSelect(range);
    }
    setInternalSelectedRange(range);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const laneDefinitions = useMemo(() => {
    const allDefs = buildLaneDefinitions(sport);
    return allDefs.filter((lane) => {
      return points.some((p) => {
        if (lane.key === "paceSecs") {
          return p.speed != null && p.speed > 0.1;
        }
        const val = p[lane.key as keyof StreamPoint];
        return val != null && (typeof val !== "number" || !Number.isNaN(val));
      });
    });
  }, [sport, points]);

  const [visibleLanes, setVisibleLanes] = useState<string[]>(() =>
    laneDefinitions.map((lane) => lane.key),
  );

  useEffect(() => {
    setVisibleLanes(laneDefinitions.map((lane) => lane.key));
  }, [laneDefinitions]);

  const activeLanes = laneDefinitions.filter((lane) => visibleLanes.includes(lane.key));

  const filteredPoints = useMemo(() => {
    if (!points.length) return [];
    if (!zoomRange) return points;

    const subset = points.filter(
      (point) => point.t >= zoomRange.startTime && point.t <= zoomRange.endTime,
    );

    return subset.length > 2 ? subset : points;
  }, [points, zoomRange]);

  const renderPoints = useMemo(
    () => downsamplePoints(filteredPoints, MAX_RENDER_POINTS),
    [filteredPoints],
  );

  const chartData = useMemo(
    () => renderPoints.map((point) => buildChartPoint(point, sport)),
    [renderPoints, sport],
  );
  const deferredChartData = useDeferredValue(chartData);
  const displayData = deferredChartData.length > 0 ? deferredChartData : chartData;

  const currentStartTime = displayData.length > 0 ? displayData[0].t : 0;
  const currentEndTime = displayData.length > 0 ? displayData[displayData.length - 1].t : 0;
  const totalDuration = Math.max(0, currentEndTime - currentStartTime);

  const laneStats = useMemo(() => {
    return activeLanes.map((lane) => {
      let minValue = Infinity;
      let maxValue = -Infinity;
      let total = 0;
      let count = 0;

      for (const point of displayData) {
        const rawValue = point[lane.key];
        const value = typeof rawValue === "number" && !Number.isNaN(rawValue) ? rawValue : null;
        if (value == null) continue;

        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
        total += value;
        count += 1;
      }

      const average = count > 0 ? total / count : null;
      const safeMin = minValue === Infinity ? null : minValue;
      const safeMax = maxValue === -Infinity ? null : maxValue;

      let minScale =
        safeMin ?? 0;
      let maxScale =
        safeMax
        ?? (lane.key === "hr" ? 180 : lane.key === "power" ? 300 : lane.key === "cadence" ? 100 : 100);

      if (minScale === maxScale) {
        minScale = Math.max(0, minScale - 10);
        maxScale += 10;
      } else {
        const diff = maxScale - minScale;
        if (lane.isPace) {
          minScale = Math.max(0, minScale - diff * 0.22);
          maxScale += diff * 0.15;
        } else {
          minScale = Math.max(0, minScale - diff * 0.15);
          maxScale += diff * 0.22;
        }
      }

      return {
        key: lane.key,
        average,
        minValue: safeMin,
        maxValue: safeMax,
        minScale: Math.round(minScale),
        maxScale: Math.round(maxScale),
      };
    });
  }, [activeLanes, displayData]);

  const selectionStats = useMemo(() => {
    if (!selectedRange) return null;

    const subset = points.filter(
      (point) => point.t >= selectedRange.startTime && point.t <= selectedRange.endTime,
    );
    if (!subset.length) return null;

    const duration = Math.max(0, selectedRange.endTime - selectedRange.startTime);
    const startDistance = subset[0].distance ?? 0;
    const endDistance = subset[subset.length - 1].distance ?? startDistance;

    let totalPower = 0;
    let maxPower = 0;
    let powerCount = 0;
    let totalHeartRate = 0;
    let maxHeartRate = 0;
    let heartRateCount = 0;
    let totalCadence = 0;
    let cadenceCount = 0;
    let totalSpeed = 0;
    let speedCount = 0;

    for (const point of subset) {
      if (point.power != null) {
        totalPower += point.power;
        maxPower = Math.max(maxPower, point.power);
        powerCount += 1;
      }

      if (point.hr != null) {
        totalHeartRate += point.hr;
        maxHeartRate = Math.max(maxHeartRate, point.hr);
        heartRateCount += 1;
      }

      if (point.cadence != null) {
        totalCadence += point.cadence;
        cadenceCount += 1;
      }

      if (point.speed != null && point.speed > 0.1) {
        totalSpeed += point.speed;
        speedCount += 1;
      }
    }

    const averageSpeed = speedCount > 0 ? totalSpeed / speedCount : null;
    const paceFormatted =
      averageSpeed == null
        ? ""
        : sport === "running"
          ? `${formatSpeedToPace(averageSpeed, "run")} /km`
          : sport === "swimming"
            ? `${formatSpeedToPace(averageSpeed, "swim")} /100m`
            : "";

    return {
      duration,
      avgPower: powerCount > 0 ? Math.round(totalPower / powerCount) : null,
      maxPower: powerCount > 0 ? maxPower : null,
      avgHeartRate: heartRateCount > 0 ? Math.round(totalHeartRate / heartRateCount) : null,
      maxHeartRate: heartRateCount > 0 ? maxHeartRate : null,
      avgCadence: cadenceCount > 0 ? Math.round(totalCadence / cadenceCount) : null,
      paceFormatted,
      distanceKm: ((endDistance - startDistance) / 1000).toFixed(2),
    };
  }, [points, selectedRange, sport]);

  const formatValue = (lane: LaneDefinition, value: number | null | undefined): string => {
    if (value == null || Number.isNaN(value)) return "--";
    if (lane.isPace) {
      return `${formatSecondsToPace(value)} ${lane.unit}`;
    }

    return `${Math.round(value)} ${lane.unit}`;
  };

  const formatStats = (
    lane: LaneDefinition,
    average: number | null,
    minValue: number | null,
    maxValue: number | null,
  ): string => {
    if (average == null) return "No data";

    if (lane.isPace) {
      return `Avg: ${formatSecondsToPace(average)}${lane.unit} | Fastest: ${formatSecondsToPace(minValue)}${lane.unit}`;
    }

    if (lane.key === "altitude") {
      return `Min: ${Math.round(minValue ?? 0)} ${lane.unit} | Max: ${Math.round(maxValue ?? 0)} ${lane.unit}`;
    }

    return `Avg: ${Math.round(average)} ${lane.unit} | Max: ${Math.round(maxValue ?? 0)} ${lane.unit}`;
  };

  const handleChartMouseMove = (event?: ChartMouseEvent | null) => {
    if (event?.activeTooltipIndex == null) return;

    const index = Number(event.activeTooltipIndex);
    if (Number.isNaN(index)) return;

    const point = displayData[index];
    if (!point) return;

    setHoverData({ time: point.t, point });
  };

  const handleChartMouseLeave = () => {
    setHoverData(null);
  };

  const handleMouseDown = (event?: ChartMouseEvent | null) => {
    if (isMobile || event?.activeLabel == null) return;

    const label = Number(event.activeLabel);
    if (Number.isNaN(label)) return;

    setRefAreaLeft(label);
    setRefAreaRight(label);
    setSelectedRange(null);
  };

  const handleMouseMove = (event?: ChartMouseEvent | null) => {
    if (isMobile || refAreaLeft == null || event?.activeLabel == null) return;

    const label = Number(event.activeLabel);
    if (Number.isNaN(label)) return;

    setRefAreaRight(label);
  };

  const handleMouseUp = () => {
    if (isMobile) return;

    if (refAreaLeft != null && refAreaRight != null) {
      let start = refAreaLeft;
      let end = refAreaRight;

      if (start > end) {
        start = refAreaRight;
        end = refAreaLeft;
      }

      if (end - start > 3) {
        setSelectedRange({ startTime: start, endTime: end });
      }
    }

    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const toggleLane = (key: string) => {
    setVisibleLanes((current) => {
      if (current.includes(key)) {
        return current.length > 1 ? current.filter((laneKey) => laneKey !== key) : current;
      }

      return [...current, key];
    });
  };

  const zoomToSelection = () => {
    if (!selectedRange) return;
    setZoomRange(selectedRange);
    setSelectedRange(null);
  };

  const resetZoom = () => {
    setZoomRange(null);
    setSelectedRange(null);
  };

  const toggleLaneCollapse = (key: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allCollapsed = activeLanes.length > 0 && activeLanes.every((l) => collapsedLanes.has(l.key));
  const toggleAllCollapse = () => {
    if (allCollapsed) {
      setCollapsedLanes(new Set());
    } else {
      setCollapsedLanes(new Set(activeLanes.map((l) => l.key)));
    }
  };

  if (!points.length) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-text-muted">
        <Info size={32} className="mb-2 text-text-muted opacity-60" />
        <p className="text-sm font-medium">No activity telemetry streams available.</p>
      </div>
    );
  }

  return (
    <div className="flex select-none flex-col gap-3 sm:gap-4">
      <div className="flex flex-col gap-3 border-b border-border-subtle pb-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="scrollbar-none -mx-2.5 flex w-full items-center gap-2 overflow-x-auto whitespace-nowrap px-2.5 sm:mx-0 sm:w-auto sm:px-0">
          {laneDefinitions.map((lane) => {
            const isActive = visibleLanes.includes(lane.key);

            return (
              <button
                key={lane.key}
                onClick={() => toggleLane(lane.key)}
                className={`inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-bg-surface text-text-primary shadow-sm"
                    : "border-border-default/40 bg-transparent text-text-muted hover:text-text-secondary"
                }`}
                style={{
                  borderColor: isActive ? lane.color : "var(--border-default)",
                  borderWidth: "1px",
                  boxShadow: isActive ? `0 2px 6px ${lane.color}18` : "none",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: isActive ? `${lane.color}15` : "transparent" }}
                >
                  <span
                    className="flex shrink-0 items-center justify-center"
                    style={{
                      color: isActive ? lane.color : "var(--text-muted)",
                      fontSize: "10px",
                    }}
                  >
                    {lane.icon}
                  </span>
                </span>
                <span>{lane.label}</span>
                <span
                  className="h-1.5 w-1.5 rounded-full transition-all duration-200"
                  style={{ backgroundColor: isActive ? lane.color : "transparent" }}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 self-end text-xs font-semibold sm:self-auto">
          {/* Collapse all toggle */}
          <button
            onClick={toggleAllCollapse}
            className="flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-elevated px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
            title={allCollapsed ? "Expand all lanes" : "Collapse all lanes"}
          >
            {allCollapsed ? "Expand All" : "Collapse All"}
          </button>

          <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-elevated px-2.5 py-1.5 font-mono text-[11px] text-text-secondary shadow-sm">
            {hoverData ? (
              <>
                <span className="font-bold text-text-primary">{formatTime(hoverData.time)}</span>
                <span className="text-text-muted">/</span>
                <span className="text-text-muted">{formatTime(currentEndTime)}</span>
              </>
            ) : (
              <>
                <span className="text-text-muted">Duration:</span>
                <span className="font-bold text-text-primary">{formatTime(totalDuration)}</span>
              </>
            )}
          </div>

          {zoomRange ? (
            <button
              onClick={resetZoom}
              className="flex cursor-pointer items-center gap-1 rounded-lg border border-border-default px-3 py-1.5 text-text-secondary transition-colors hover:bg-bg-input"
            >
              <RefreshCw size={12} />
              Reset Zoom
            </button>
          ) : null}

          {selectedRange ? (
            <button
              onClick={zoomToSelection}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-white shadow-sm transition-colors hover:bg-accent/90"
            >
              <ZoomIn size={12} />
              Zoom In
            </button>
          ) : null}
        </div>
      </div>

      {selectedRange && selectionStats ? (
        <div
          className="relative overflow-hidden rounded-2xl border p-4"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(59,130,246,0.06) 100%)",
            borderColor: "rgba(139,92,246,0.3)",
            boxShadow: "0 0 0 1px rgba(139,92,246,0.1), 0 8px 32px rgba(139,92,246,0.12)",
            animation: "fadeInScale 220ms cubic-bezier(0.4, 0, 0.2, 1) both",
          }}
        >
          {/* Accent top line */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)" }}
          />

          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20">
                <Activity size={12} className="text-accent" />
              </div>
              <span className="text-xs font-bold text-accent">Selection Analysis</span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                {formatTime(selectionStats.duration)}
              </span>
              <span className="text-[10px] text-text-muted">
                {formatTime(selectedRange.startTime)} → {formatTime(selectedRange.endTime)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={zoomToSelection}
                className="flex cursor-pointer items-center gap-1 rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow-md"
              >
                <ZoomIn size={11} />
                Zoom
              </button>
              <button
                onClick={() => setSelectedRange(null)}
                className="flex cursor-pointer items-center gap-1 rounded-lg border border-border-default px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-bg-input hover:text-text-primary"
              >
                Dismiss
              </button>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {selectionStats.paceFormatted ? (
              <div className="rounded-xl border border-border-subtle bg-bg-elevated/60 px-3 py-2">
                <div className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-text-muted">
                  {sport === "swimming" ? "Swim Pace" : sport === "cycling" ? "Speed" : "Pace"}
                </div>
                <div className="font-mono text-sm font-bold text-text-primary">
                  {selectionStats.paceFormatted}
                </div>
              </div>
            ) : null}
            {selectionStats.avgPower != null ? (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 px-3 py-2">
                <div className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400/70">Avg Power</div>
                <div className="font-mono text-sm font-bold text-blue-300">{selectionStats.avgPower} W</div>
                {selectionStats.maxPower != null && (
                  <div className="text-[9px] text-text-muted">Max: {selectionStats.maxPower} W</div>
                )}
              </div>
            ) : null}
            {selectionStats.avgHeartRate != null ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2">
                <div className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-red-400/70">Avg HR</div>
                <div className="font-mono text-sm font-bold text-red-300">{selectionStats.avgHeartRate} bpm</div>
                {selectionStats.maxHeartRate != null && (
                  <div className="text-[9px] text-text-muted">Max: {selectionStats.maxHeartRate} bpm</div>
                )}
              </div>
            ) : null}
            {selectionStats.avgCadence != null ? (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/8 px-3 py-2">
                <div className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-purple-400/70">Cadence</div>
                <div className="font-mono text-sm font-bold text-purple-300">
                  {selectionStats.avgCadence} {sport === "cycling" ? "rpm" : "spm"}
                </div>
              </div>
            ) : null}
            {selectionStats.distanceKm !== "0.00" ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2">
                <div className="mb-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400/70">Distance</div>
                <div className="font-mono text-sm font-bold text-emerald-300">{selectionStats.distanceKm} km</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-0">
        {activeLanes.map((lane, activeIndex) => {
          const isLast = activeIndex === activeLanes.length - 1;
          const stats = laneStats.find((entry) => entry.key === lane.key);
          const isCollapsed = collapsedLanes.has(lane.key);

          if (!stats) return null;

          return (
            <div
              key={lane.key}
              className="w-full border-b border-border-subtle/50 last:border-b-0"
            >
              {/* Lane header row — always visible, click to collapse/expand */}
              <div
                className="flex cursor-pointer select-none items-center gap-2 px-2 py-2 transition-colors hover:bg-bg-elevated/30"
                onClick={() => toggleLaneCollapse(lane.key)}
                role="button"
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${lane.label} lane`}
              >
                {/* Collapse chevron */}
                <span
                  className="shrink-0 text-text-muted transition-transform duration-200"
                  style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>

                {/* Lane label + color dot */}
                <span
                  className="flex shrink-0 items-center gap-1.5"
                  style={{ color: lane.color }}
                >
                  {lane.icon}
                  <span className="text-[11px] font-extrabold uppercase tracking-wider">
                    {lane.label}
                  </span>
                </span>

                {/* Stats summary */}
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-text-secondary">
                  {hoverData
                    ? formatValue(lane, hoverData.point[lane.key])
                    : formatStats(lane, stats.average, stats.minValue, stats.maxValue)
                  }
                </span>
              </div>

              {/* Chart body — hidden when collapsed */}
              {!isCollapsed && (
                <div
                  className="relative h-[160px] w-full py-1 sm:h-[140px]"
                  style={{ touchAction: "pan-y" }}
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart
                      data={displayData}
                      syncId="activityTelemetry"
                      margin={{ top: 8, right: 10, left: -32, bottom: isLast ? 10 : 4 }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={(event) => {
                        handleChartMouseMove(event);
                        handleMouseMove(event);
                      }}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleChartMouseLeave}
                      onTouchStart={handleChartMouseMove}
                      onTouchMove={handleChartMouseMove}
                      onTouchEnd={handleChartMouseLeave}
                    >
                      <defs>
                        <linearGradient id={`grad-${lane.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={lane.color} stopOpacity={0.16} />
                          <stop offset="95%" stopColor={lane.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border-subtle)"
                        strokeOpacity={0.35}
                        vertical={false}
                      />

                      <XAxis
                        dataKey="t"
                        hide={!isLast || isCollapsed}
                        tickFormatter={formatTime}
                        tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                        axisLine={{ stroke: "var(--border-subtle)" }}
                        tickLine={false}
                      />

                      <YAxis
                        yAxisId={lane.key}
                        domain={[stats.minScale, stats.maxScale]}
                        reversed={lane.isPace}
                        tickFormatter={lane.isPace ? formatSecondsToPace : undefined}
                        tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />

                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const dataPoint = payload[0].payload as ChartPoint;
                          return (
                            <div className="z-50 rounded-xl border border-border-subtle bg-bg-surface/95 p-3 shadow-2xl backdrop-blur-sm min-w-[160px]">
                              <div className="mb-2 border-b border-border-subtle/50 pb-1 text-center font-mono text-[11px] font-extrabold text-text-primary">
                                {formatTime(dataPoint.t)}
                              </div>
                              <div className="flex flex-col gap-1.5 font-mono text-[10px]">
                                {activeLanes.map((lane) => {
                                  const val = dataPoint[lane.key];
                                  if (val == null || Number.isNaN(val)) return null;
                                  return (
                                    <div key={lane.key} className="flex items-center justify-between gap-4">
                                      <span className="flex items-center gap-1.5 text-text-muted" style={{ color: lane.color }}>
                                        {lane.icon}
                                        <span className="font-semibold text-text-secondary">{lane.label}</span>
                                      </span>
                                      <span className="font-bold text-text-primary">
                                        {formatValue(lane, val)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }}
                        cursor={{
                          stroke: "var(--text-primary)",
                          strokeWidth: 1.2,
                          strokeDasharray: "3,3",
                        }}
                      />

                      <Area
                        yAxisId={lane.key}
                        type="monotone"
                        dataKey={lane.key}
                        stroke={lane.color}
                        strokeWidth={1.8}
                        fill={`url(#grad-${lane.key})`}
                        dot={false}
                        activeDot={{ r: 4, fill: lane.color }}
                        connectNulls
                      />

                      {/* Lap boundary markers */}
                      {laps && laps.length > 1 && (() => {
                        let offset = 0;
                        return laps
                          .slice(0, -1)
                          .map((lap, idx) => {
                            const lapDur = lap.durationSeconds ?? 0;
                            offset += lapDur;
                            return (
                              <ReferenceLine
                                key={`lap-${idx}`}
                                yAxisId={lane.key}
                                x={offset}
                                stroke="rgba(255,255,255,0.2)"
                                strokeDasharray="4 3"
                                strokeWidth={1}
                              />
                            );
                          });
                      })()}

                      {refAreaLeft != null && refAreaRight != null ? (
                        <ReferenceArea
                          yAxisId={lane.key}
                          x1={refAreaLeft}
                          x2={refAreaRight}
                          fill="var(--color-accent)"
                          fillOpacity={0.1}
                        />
                      ) : null}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle px-2 pt-1 text-[11px] text-text-muted">
        <div className="flex items-center gap-1">
          <Info size={12} />
          <span>Click & drag horizontally on any chart panel to select a training interval.</span>
        </div>
        <div>
          {filteredPoints.length > displayData.length ? (
            <span className="text-text-secondary">
              Rendering {displayData.length.toLocaleString()} of {filteredPoints.length.toLocaleString()} points
            </span>
          ) : zoomRange ? (
            <span className="font-semibold text-accent">
              Zoomed Segment ({formatTime(totalDuration)})
            </span>
          ) : (
            <span>Showing full telemetry duration</span>
          )}
        </div>
      </div>
    </div>
  );
}
