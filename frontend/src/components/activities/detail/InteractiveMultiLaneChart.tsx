"use client";

import { useState, useMemo, useEffect } from "react";
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

  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen sizes
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const [visibleLanes, setVisibleLanes] = useState<string[]>([]);

  // Sync visible lanes: default all lanes to show on both mobile and PC
  useEffect(() => {
    if (laneDefinitions.length > 0) {
      setVisibleLanes(laneDefinitions.map((l) => l.key));
    }
  }, [laneDefinitions]);

  const activeLanes = laneDefinitions.filter((lane) => visibleLanes.includes(lane.key));
  const activeLanesCount = activeLanes.length;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- Zoom logic & Data Preparation ---
  const filteredPoints = useMemo(() => {
    if (!points || points.length === 0) return [];
    if (!zoomRange) return points;
    const subset = points.filter((p) => p.t >= zoomRange.startTime && p.t <= zoomRange.endTime);
    return subset.length > 2 ? subset : points;
  }, [points, zoomRange]);

  // Compute sport-specific parameters (like pace seconds & simulated SWOLF)
  const chartData = useMemo(() => {
    if (!filteredPoints || filteredPoints.length === 0) return [];
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

  const currentStartTime = chartData.length > 0 ? chartData[0].t : 0;
  const currentEndTime = chartData.length > 0 ? chartData[chartData.length - 1].t : 0;
  const totalDuration = currentEndTime - currentStartTime;

  // Calculate dynamic scale ranges based on visible data
  // Calculate dynamic scale ranges and summary statistics based on visible data
  const laneStats = useMemo(() => {
    return activeLanes.map((lane) => {
      let minVal = Infinity;
      let maxVal = -Infinity;
      let sum = 0;
      let count = 0;

      chartData.forEach((p) => {
        const val = p[lane.key] as number | undefined;
        if (val != null && !isNaN(val)) {
          if (val < minVal) minVal = val;
          if (val > maxVal) maxVal = val;
          sum += val;
          count++;
        }
      });

      const avg = count > 0 ? sum / count : null;
      const finalMinVal = minVal === Infinity ? null : minVal;
      const finalMaxVal = maxVal === -Infinity ? null : maxVal;

      // Calculate buffered min/max for chart scale
      let minScale = minVal === Infinity ? 0 : minVal;
      let maxScale = maxVal === -Infinity ? (lane.key === "hr" ? 180 : lane.key === "power" ? 300 : lane.key === "cadence" ? 100 : 100) : maxVal;

      if (minScale === maxScale) {
        minScale = Math.max(0, minScale - 10);
        maxScale += 10;
      } else {
        const diff = maxScale - minScale;
        // Increase padding (breathing room) so the line doesn't crowd the top/bottom boundaries
        if (lane.isPace) {
          // Pace chart is inverted: minScale is top, maxScale is bottom
          minScale = Math.max(0, minScale - diff * 0.22); // 22% top padding (smaller number = faster)
          maxScale = maxScale + diff * 0.15;             // 15% bottom padding (larger number = slower)
        } else {
          // Normal chart: maxScale is top, minScale is bottom
          minScale = Math.max(0, minScale - diff * 0.15); // 15% bottom padding
          maxScale = maxScale + diff * 0.22;             // 22% top padding to avoid text overlay
        }
      }

      return {
        key: lane.key,
        minScale: Math.round(minScale),
        maxScale: Math.round(maxScale),
        avg,
        minVal: finalMinVal,
        maxVal: finalMaxVal,
      };
    });
  }, [chartData, activeLanes]);

  const formatValue = (lane: typeof laneDefinitions[0], val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "—";
    if (lane.isPace) {
      return formatSecondsToPace(val) + " " + lane.unit;
    }
    return Math.round(val) + (lane.unit ? ` ${lane.unit}` : "");
  };

  const formatStats = (lane: typeof laneDefinitions[0], avg: number | null, minVal: number | null, maxVal: number | null) => {
    if (avg == null) return "No data";
    const unitStr = lane.unit ? ` ${lane.unit}` : "";
    if (lane.isPace) {
      return `Avg: ${formatSecondsToPace(avg)}${unitStr} · Min: ${formatSecondsToPace(minVal)}${unitStr}`;
    }
    if (lane.key === "altitude") {
      return `Min: ${Math.round(minVal ?? 0)}${unitStr} · Max: ${Math.round(maxVal ?? 0)}${unitStr}`;
    }
    return `Avg: ${Math.round(avg)}${unitStr} · Max: ${Math.round(maxVal ?? 0)}${unitStr}`;
  };

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
    if (isMobile) return; // Disable drag selection zoom on mobile to prevent scrolling interception
    if (e && e.activeLabel != null) {
      setRefAreaLeft(e.activeLabel);
      setRefAreaRight(e.activeLabel);
      setSelectedRange(null);
    }
  };

  const handleMouseMove = (e: any) => {
    if (isMobile) return;
    if (refAreaLeft !== null && e && e.activeLabel != null) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (isMobile) return;
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

  if (!mounted) {
    return (
      <div className="h-[250px] flex items-center justify-center">
        <span className="text-xs text-text-muted animate-pulse">Loading telemetry charts...</span>
      </div>
    );
  }

  if (!points || points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-text-muted">
        <Info size={32} className="mb-2 text-text-muted opacity-60" />
        <p className="text-sm font-medium">No activity telemetry streams available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4 select-none">
      
      {/* Toggles and Zoom Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-3.5">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none w-full sm:w-auto -mx-2.5 px-2.5 sm:mx-0 sm:px-0">
          {laneDefinitions.map((lane) => {
            const isActive = visibleLanes.includes(lane.key);
            return (
              <button
                key={lane.key}
                onClick={() => toggleLane(lane.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold cursor-pointer transition-all duration-200 select-none shrink-0 ${
                  isActive
                    ? "bg-bg-surface text-text-primary shadow-sm"
                    : "bg-transparent text-text-muted border-border-default/40 hover:text-text-secondary"
                }`}
                style={{
                  borderColor: isActive ? lane.color : "var(--border-default)",
                  borderWidth: "1px",
                  boxShadow: isActive ? `0 2px 6px ${lane.color}18` : "none",
                  color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                }}
              >
                {/* Visual active indicator (colored indicator dot) or Icon */}
                <span className="flex items-center justify-center w-4 h-4 rounded-full" style={{ backgroundColor: isActive ? `${lane.color}15` : "transparent" }}>
                  <span style={{ color: isActive ? lane.color : "var(--text-muted)", fontSize: "10px" }} className="flex items-center justify-center shrink-0">
                    {lane.icon}
                  </span>
                </span>
                
                <span>{lane.label}</span>
                
                {/* Subtle active checkmark or dot */}
                <span className="w-1.5 h-1.5 rounded-full transition-all duration-200" style={{ backgroundColor: isActive ? lane.color : "transparent" }} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold self-end sm:self-auto">
          {/* Time Offset / Duration Indicator */}
          <div className="flex items-center gap-1.5 bg-bg-elevated px-2.5 py-1.5 rounded-lg border border-border-subtle shadow-sm text-text-secondary font-mono text-[11px]">
            {hoverData ? (
              <>
                <span className="font-bold text-text-primary">
                  {formatTime(hoverData.time)}
                </span>
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

      {/* Telemetry info now displayed directly on each chart lane overlay */}

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
          const stats = laneStats.find((s) => s.key === lane.key)!;

          return (
            <div 
              key={lane.key} 
              className="h-[180px] sm:h-[150px] w-full relative border-b border-border-subtle/50 last:border-b-0 py-2"
              style={{ touchAction: "pan-y" }}
            >
              {/* Floating glassmorphic info banner at top-left/grid-left alignment */}
              <div className="absolute top-2 left-10 pointer-events-none select-none z-10 flex flex-col gap-0.5 bg-bg-surface/85 backdrop-blur-md px-2.5 py-1 rounded-md border border-border-subtle/50 shadow-sm max-w-[calc(100%-100px)]">
                <div className="flex items-center gap-1.5">
                  <span style={{ color: lane.color }} className="flex items-center gap-1 shrink-0">
                    {lane.icon}
                    <span className="text-[10px] uppercase font-extrabold tracking-wider">{lane.label}</span>
                  </span>
                  
                  {/* Current value on hover, or summary stats off hover */}
                  {hoverData ? (
                    <span className="text-xs font-mono font-extrabold" style={{ color: lane.color }}>
                      {formatValue(lane, hoverData.point[lane.key])}
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-secondary font-semibold font-mono">
                      {formatStats(lane, stats.avg, stats.minVal, stats.maxVal)}
                    </span>
                  )}
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart
                  data={chartData}
                  syncId="activityTelemetry"
                  margin={{ top: 22, right: 10, left: -32, bottom: isLast ? 10 : 4 }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={(e) => {
                    handleChartMouseMove(e);
                    handleMouseMove(e);
                  }}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleChartMouseLeave}
                  onTouchStart={(e) => {
                    handleChartMouseMove(e);
                  }}
                  onTouchMove={(e) => {
                    handleChartMouseMove(e);
                  }}
                  onTouchEnd={handleChartMouseLeave}
                >
                  <defs>
                    <linearGradient id={`grad-${lane.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lane.color} stopOpacity={0.16} />
                      <stop offset="95%" stopColor={lane.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.35} vertical={false} />
                  
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
                    domain={[stats.minScale, stats.maxScale]}
                    reversed={lane.isPace} // INVERT YAxis for running/swimming pace!
                    tickFormatter={lane.isPace ? formatSecondsToPace : undefined}
                    tick={{ fill: "var(--text-muted)", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  
                  <Tooltip
                    content={() => null} // floating indicators handle values
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
