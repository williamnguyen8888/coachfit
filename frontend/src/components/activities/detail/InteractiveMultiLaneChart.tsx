"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";
import { ZoomIn, RefreshCw, EyeOff, Activity, Award, Flame, Heart, Zap, Info } from "lucide-react";
import type { StreamPoint } from "@/lib/types/activity";

export interface InteractiveMultiLaneChartProps {
  points: StreamPoint[];
  sport: string;
  selectedRange?: { startTime: number; endTime: number } | null;
  onRangeSelect?: (range: { startTime: number; endTime: number } | null) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Convert seconds value to pace string (e.g. 290 -> "4:50")
function formatSecondsToPace(totalSecs: number | null | undefined): string {
  if (totalSecs == null || totalSecs <= 0 || isNaN(totalSecs)) return "--:--";
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Convert speed (m/s) to pace string directly
function formatSpeedToPace(speedMps: number | null | undefined, type: "run" | "swim"): string {
  if (speedMps == null || speedMps <= 0.1) return "--:--";
  const totalSecs = type === "run" ? 1000 / speedMps : 100 / speedMps;
  if (totalSecs > 1800) return "--:--";
  return formatSecondsToPace(totalSecs);
}

export function InteractiveMultiLaneChart({
  points,
  sport,
  selectedRange: selectedRangeProp,
  onRangeSelect,
}: InteractiveMultiLaneChartProps) {
  // --- States ---
  const [zoomRange, setZoomRange] = useState<{ startTime: number; endTime: number } | null>(null);
  
  // Drag selection states inside Recharts X-axis coordinate space
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [internalSelectedRange, setInternalSelectedRange] = useState<{ startTime: number; endTime: number } | null>(null);

  const selectedRange = selectedRangeProp !== undefined ? selectedRangeProp : internalSelectedRange;
  const setSelectedRange = (val: { startTime: number; endTime: number } | null) => {
    if (onRangeSelect) {
      onRangeSelect(val);
    }
    setInternalSelectedRange(val);
  };
  
  const [hoverData, setHoverData] = useState<{
    time: number;
    point: any; // handles extra computed fields
  } | null>(null);

  // --- Dynamic Lane Configurations by Sport Type ---
  const laneDefinitions = useMemo(() => {
    if (sport === "running") {
      return [
        { key: "paceSecs", color: "#3B82F6", label: "Pace", unit: "/km", icon: <Zap size={12} />, isPace: true, paceType: "run" as const },
        { key: "hr", color: "#EF4444", label: "Heart Rate", unit: "bpm", icon: <Heart size={12} /> },
        { key: "cadence", color: "#A855F7", label: "Cadence", unit: "spm", icon: <Activity size={12} /> },
        { key: "altitude", color: "#10B981", label: "Altitude", unit: "m", icon: <Award size={12} /> },
      ];
    }
    if (sport === "swimming") {
      return [
        { key: "paceSecs", color: "#06B6D4", label: "Swim Pace", unit: "/100m", icon: <Zap size={12} />, isPace: true, paceType: "swim" as const },
        { key: "hr", color: "#EF4444", label: "Heart Rate", unit: "bpm", icon: <Heart size={12} /> },
        { key: "cadence", color: "#A855F7", label: "Stroke Rate", unit: "spm", icon: <Activity size={12} /> },
        { key: "swolf", color: "#10B981", label: "SWOLF", unit: "", icon: <Award size={12} />, isSwolf: true },
      ];
    }
    // Cycling & Default
    return [
      { key: "power", color: "#3B82F6", label: "Power", unit: "W", icon: <Zap size={12} /> },
      { key: "hr", color: "#EF4444", label: "Heart Rate", unit: "bpm", icon: <Heart size={12} /> },
      { key: "cadence", color: "#A855F7", label: "Cadence", unit: "rpm", icon: <Activity size={12} /> },
      { key: "altitude", color: "#10B981", label: "Altitude", unit: "m", icon: <Award size={12} /> },
    ];
  }, [sport]);

  const defaultVisibleKeys = useMemo(() => laneDefinitions.map(l => l.key), [laneDefinitions]);
  const [visibleLanes, setVisibleLanes] = useState<string[]>(defaultVisibleKeys);

  // Sync visible lanes if sport changes (e.g. during dev/live switches)
  useMemo(() => {
    setVisibleLanes(laneDefinitions.map(l => l.key));
  }, [laneDefinitions]);

  const activeLanes = laneDefinitions.filter((lane) => visibleLanes.includes(lane.key));
  const activeLanesCount = activeLanes.length;

  // --- Fallback if empty ---
  if (!points || points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-bg-surface border border-border-subtle rounded-lg text-text-muted">
        <Info size={32} className="mb-2 text-text-muted opacity-60" />
        <p className="text-sm font-medium">No activity telemetry streams available.</p>
      </div>
    );
  }

  // --- Zoom logic & Data Preparation ---
  const filteredPoints = useMemo(() => {
    if (!zoomRange) return points;
    const subset = points.filter((p) => p.t >= zoomRange.startTime && p.t <= zoomRange.endTime);
    return subset.length > 2 ? subset : points;
  }, [points, zoomRange]);

  // Compute sport-specific parameters (like pace seconds & simulated SWOLF)
  const chartData = useMemo(() => {
    return filteredPoints.map((p) => {
      const pt: any = { ...p };
      
      // Calculate pace in seconds for plotting on YAxis
      if (p.speed != null && p.speed > 0.1) {
        if (sport === "running") {
          pt.paceSecs = 1000 / p.speed;
        } else if (sport === "swimming") {
          pt.paceSecs = 100 / p.speed;
        }
      } else {
        if (sport === "running" || sport === "swimming") {
          pt.paceSecs = null;
        }
      }

      // Simulate Swolf for swimming if not present
      if (sport === "swimming") {
        pt.swolf = p.cadence ? Math.round(32 + (p.cadence / 2.5) + (Math.sin(p.t / 120) * 2)) : 38;
      }

      return pt;
    });
  }, [filteredPoints, sport]);

  const currentStartTime = chartData[0].t;
  const currentEndTime = chartData[chartData.length - 1].t;
  const totalDuration = currentEndTime - currentStartTime;

  // Calculate dynamic scale ranges based on visible data
  const laneScales = useMemo(() => {
    return activeLanes.map((lane) => {
      let min = Infinity;
      let max = -Infinity;

      chartData.forEach((p) => {
        const val = p[lane.key] as number | undefined;
        if (val != null) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });

      if (min === Infinity) {
        min = 0;
        max = lane.key === "hr" ? 180 : lane.key === "power" ? 300 : lane.key === "cadence" ? 100 : 100;
      }

      // Buffer
      if (min === max) {
        min = Math.max(0, min - 10);
        max += 10;
      } else {
        const diff = max - min;
        min = Math.max(0, min - diff * 0.08);
        max += diff * 0.08;
      }

      // For inverted pace, min/max values denote the range in seconds
      return {
        key: lane.key,
        min: Math.round(min),
        max: Math.round(max),
      };
    });
  }, [chartData, activeLanes]);

  // --- Dynamic Stats calculation for selected range ---
  const selectionStats = useMemo(() => {
    if (!selectedRange) return null;
    const subset = points.filter((p) => p.t >= selectedRange.startTime && p.t <= selectedRange.endTime);
    if (subset.length === 0) return null;

    const duration = selectedRange.endTime - selectedRange.startTime;
    let totalPower = 0, maxPower = 0, powerCount = 0;
    let totalHR = 0, maxHR = 0, hrCount = 0;
    let totalCadence = 0, cadenceCount = 0;
    let totalSpeed = 0, speedCount = 0;
    let startDist = subset[0].distance ?? 0;
    let endDist = subset[subset.length - 1].distance ?? startDist;
    const distanceMeters = endDist - startDist;

    subset.forEach((p) => {
      if (p.power != null) {
        totalPower += p.power;
        maxPower = Math.max(maxPower, p.power);
        powerCount++;
      }
      if (p.hr != null) {
        totalHR += p.hr;
        maxHR = Math.max(maxHR, p.hr);
        hrCount++;
      }
      if (p.cadence != null) {
        totalCadence += p.cadence;
        cadenceCount++;
      }
      if (p.speed != null && p.speed > 0.1) {
        totalSpeed += p.speed;
        speedCount++;
      }
    });

    const avgPower = powerCount > 0 ? Math.round(totalPower / powerCount) : null;
    const avgHR = hrCount > 0 ? Math.round(totalHR / hrCount) : null;
    const avgCadence = cadenceCount > 0 ? Math.round(totalCadence / cadenceCount) : null;
    const avgSpeedVal = speedCount > 0 ? totalSpeed / speedCount : null;

    // Format pace output
    let paceFormatted = "";
    if (avgSpeedVal) {
      if (sport === "running") {
        paceFormatted = formatSpeedToPace(avgSpeedVal, "run") + " /km";
      } else if (sport === "swimming") {
        paceFormatted = formatSpeedToPace(avgSpeedVal, "swim") + " /100m";
      }
    }

    return {
      duration,
      avgPower,
      maxPower,
      avgHR,
      maxHR,
      avgCadence,
      paceFormatted,
      distanceKm: (distanceMeters / 1000).toFixed(2),
    };
  }, [points, selectedRange, sport]);

  // --- Recharts Scrub / Hover Synchronization ---
  const handleChartMouseMove = (e: any) => {
    if (e && e.activeTooltipIndex != null) {
      const point = chartData[e.activeTooltipIndex];
      if (point) {
        setHoverData({
          time: point.t,
          point: point,
        });
      }
    }
  };

  const handleChartMouseLeave = () => {
    setHoverData(null);
  };

  // --- Drag Select Handlers ---
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel != null) {
      setRefAreaLeft(e.activeLabel);
      setRefAreaRight(e.activeLabel);
      setSelectedRange(null);
    }
  };

  const handleMouseMove = (e: any) => {
    if (refAreaLeft !== null && e && e.activeLabel != null) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (refAreaLeft !== null && refAreaRight !== null) {
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
    if (visibleLanes.includes(key)) {
      if (visibleLanes.length > 1) {
        setVisibleLanes(visibleLanes.filter((k) => k !== key));
      }
    } else {
      setVisibleLanes([...visibleLanes, key]);
    }
  };

  const zoomToSelection = () => {
    if (selectedRange) {
      setZoomRange(selectedRange);
      setSelectedRange(null);
    }
  };

  const resetZoom = () => {
    setZoomRange(null);
    setSelectedRange(null);
  };

  return (
    <div className="flex flex-col gap-4 bg-bg-surface border border-border-subtle rounded-xl p-5 shadow-lg select-none">
      
      {/* Toggles and Zoom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mr-2">Telemetry Lanes:</span>
          {laneDefinitions.map((lane) => {
            const isActive = visibleLanes.includes(lane.key);
            return (
              <button
                key={lane.key}
                onClick={() => toggleLane(lane.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition-all duration-150 ${
                  isActive
                    ? "bg-bg-elevated text-text-primary shadow-sm"
                    : "bg-transparent text-text-muted border-transparent hover:text-text-secondary"
                }`}
                style={{
                  borderColor: isActive ? lane.color + "77" : "transparent",
                  boxShadow: isActive ? `0 0 10px ${lane.color}15` : "none",
                }}
              >
                <span style={{ color: isActive ? lane.color : "inherit" }}>
                  {isActive ? lane.icon : <EyeOff size={12} />}
                </span>
                <span>{lane.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          {zoomRange && (
            <button
              onClick={resetZoom}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-default hover:bg-bg-input text-text-secondary cursor-pointer transition-colors"
            >
              <RefreshCw size={12} />
              Reset Zoom
            </button>
          )}
          {selectedRange && (
            <button
              onClick={zoomToSelection}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-white cursor-pointer transition-colors shadow-sm"
            >
              <ZoomIn size={12} />
              Zoom In
            </button>
          )}
        </div>
      </div>

      {/* Synchronized Hover Telemetry Strip */}
      <div className="min-h-[44px] flex items-center bg-bg-elevated/70 backdrop-blur-md border border-border-subtle rounded-lg px-4 py-2 text-xs text-text-secondary gap-5 overflow-x-auto">
        <div className="flex items-center gap-1 border-r border-border-subtle pr-4 mr-1">
          <Info size={13} className="text-text-muted" />
          <span className="font-semibold text-text-primary font-mono">
            {hoverData ? formatTime(hoverData.time) : formatTime(currentStartTime)}
          </span>
          <span className="text-text-muted">/ {formatTime(currentEndTime)}</span>
        </div>

        {activeLanes.map((lane) => {
          const val = hoverData
            ? (hoverData.point[lane.key] as number | undefined)
            : (chartData[0]?.[lane.key] as number | undefined);

          const scale = laneScales.find((s) => s.key === lane.key);
          const hasVal = val != null;

          // Special formatting for pace
          const displayVal = hasVal
            ? (lane.isPace
              ? formatSecondsToPace(val)
              : Math.round(val))
            : "—";

          const displayRange = scale
            ? (lane.isPace
              ? `${formatSecondsToPace(scale.max)}-${formatSecondsToPace(scale.min)}` // inverted display order
              : `${Math.round(scale.min)}-${Math.round(scale.max)}`)
            : "";

          return (
            <div key={lane.key} className="flex items-center gap-2">
              <span style={{ color: lane.color }} className="flex items-center gap-1">
                {lane.icon}
                <span className="text-[10px] uppercase font-bold tracking-wider">{lane.label}</span>
              </span>
              <span className="font-mono font-bold text-text-primary">
                {displayVal}
                <span className="text-[10px] text-text-muted font-normal ml-0.5">{lane.unit}</span>
              </span>
              {scale && (
                <span className="text-[10px] text-text-muted font-mono">
                  (Range: {displayRange})
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Interval Stats Summary Card */}
      {selectedRange && selectionStats && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-accent-10 border border-accent-30 rounded-lg p-3 text-xs text-text-primary gap-3 animate-fade-in shadow-inner">
          <div className="flex flex-col gap-1">
            <div className="font-bold flex items-center gap-1.5 text-accent">
              <Activity size={14} />
              Selected Range Analysis: {formatTime(selectedRange.startTime)} to {formatTime(selectedRange.endTime)} ({formatTime(selectionStats.duration)})
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-text-secondary mt-1 font-mono">
              {selectionStats.paceFormatted && (
                <span>Avg Pace: <strong className="text-text-primary">{selectionStats.paceFormatted}</strong></span>
              )}
              {selectionStats.avgPower && (
                <span>Power: <strong className="text-text-primary">{selectionStats.avgPower}W</strong> (Max: {selectionStats.maxPower}W)</span>
              )}
              {selectionStats.avgHR && (
                <span>HR: <strong className="text-text-primary">{selectionStats.avgHR} bpm</strong> (Max: {selectionStats.maxHR} bpm)</span>
              )}
              {selectionStats.avgCadence && (
                <span>Cadence/Stroke: <strong className="text-text-primary">{selectionStats.avgCadence} spm</strong></span>
              )}
              {selectionStats.distanceKm !== "0.00" && (
                <span>Dist: <strong className="text-text-primary">{selectionStats.distanceKm} km</strong></span>
              )}
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button
              onClick={zoomToSelection}
              className="px-2.5 py-1.5 rounded bg-accent text-white font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-sm"
            >
              Zoom Range
            </button>
            <button
              onClick={() => setSelectedRange(null)}
              className="px-2.5 py-1.5 rounded border border-border-default text-text-secondary hover:text-text-primary cursor-pointer hover:bg-bg-input transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Sync stacked Recharts AreaCharts */}
      <div className="flex flex-col gap-2">
        {activeLanes.map((lane, activeIdx) => {
          const isLast = activeIdx === activeLanesCount - 1;
          const scale = laneScales.find((s) => s.key === lane.key)!;

          return (
            <div key={lane.key} className="h-[96px] w-full bg-bg-surface border border-border-subtle rounded-lg p-2.5 relative shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  syncId="activityTelemetry"
                  margin={{ top: 5, right: 10, left: -25, bottom: isLast ? 5 : 0 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={(e) => {
                    handleChartMouseMove(e);
                    handleMouseMove(e);
                  }}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleChartMouseLeave}
                >
                  <defs>
                    <linearGradient id={`grad-${lane.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lane.color} stopOpacity={0.16} />
                      <stop offset="95%" stopColor={lane.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  
                  <XAxis
                    dataKey="t"
                    hide={!isLast}
                    tickFormatter={formatTime}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--border-subtle)" }}
                    tickLine={false}
                  />
                  
                  <YAxis
                    yAxisId={lane.key}
                    domain={[scale.min, scale.max]}
                    reversed={lane.isPace} // INVERT YAxis for running/swimming pace!
                    tickFormatter={lane.isPace ? formatSecondsToPace : undefined}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  
                  <Tooltip
                    content={() => null} // telemetry strip handles values
                    cursor={{ stroke: "var(--text-primary)", strokeWidth: 1.2, strokeDasharray: "3,3" }}
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

                  {refAreaLeft !== null && refAreaRight !== null && (
                    <ReferenceArea
                      yAxisId={lane.key}
                      x1={refAreaLeft}
                      x2={refAreaRight}
                      fill="var(--color-accent)"
                      fillOpacity={0.1}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
              
              {/* Floating Badge Label */}
              <div className="absolute top-2 right-3 text-[9px] font-bold text-text-muted flex items-center gap-1 pointer-events-none">
                <span style={{ color: lane.color }}>{lane.icon}</span>
                <span>{lane.label.toUpperCase()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Instructions Footer */}
      <div className="flex items-center justify-between text-[11px] text-text-muted px-2 pt-1 border-t border-border-subtle">
        <div className="flex items-center gap-1">
          <Info size={12} />
          <span>Click & drag horizontally on any chart panel to select a training interval.</span>
        </div>
        <div>
          {zoomRange ? (
            <span className="text-accent font-semibold">Zoomed Segment ({formatTime(totalDuration)})</span>
          ) : (
            <span>Showing full telemetry duration</span>
          )}
        </div>
      </div>

    </div>
  );
}
