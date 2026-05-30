"use client";

import { useState, useRef } from "react";
import type { StreamPoint } from "@/lib/types/activity";

export interface InteractiveMultiLaneChartProps {
  points: StreamPoint[];
  sport: string;
}

export function InteractiveMultiLaneChart({ points, sport }: InteractiveMultiLaneChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverData, setHoverData] = useState<{
    x: number;
    time: number;
    point: StreamPoint;
  } | null>(null);

  if (!points || points.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
        No chart streams available for this activity.
      </div>
    );
  }

  const totalDuration = points[points.length - 1].t;

  // ─── SVG Dimensions ──────────────────────────────────────────────────────────
  const SVG_W = 800;
  const SVG_H = 340;
  const PADDING_L = 60;
  const PADDING_R = 30;
  const PADDING_T = 15;
  const PADDING_B = 25;

  const chartW = SVG_W - PADDING_L - PADDING_R;
  const chartH = SVG_H - PADDING_T - PADDING_B;

  // ─── Define 4 Lanes ──────────────────────────────────────────────────────────
  // Track heights and vertical boundaries
  const laneHeight = 60;
  const laneGap = 16;

  const lanes = [
    { key: "power", color: "#3B82F6", label: "Power", unit: "w", isArea: false },
    { key: "altitude", color: "#10B981", label: "Altitude", unit: "m", isArea: true },
    { key: "hr", color: "#EF4444", label: "Heart Rate", unit: " bpm", isArea: false },
    { key: "cadence", color: "#A855F7", label: "Cadence", unit: " rpm", isArea: false },
  ] as const;

  // Get Y-coordinates for a lane index (0-3)
  function getLaneBounds(laneIdx: number) {
    const top = PADDING_T + laneIdx * (laneHeight + laneGap);
    const bottom = top + laneHeight;
    return { top, bottom };
  }

  // Get min/max values for scaling each lane
  const laneScales = lanes.map((lane, idx) => {
    let min = Infinity;
    let max = -Infinity;
    points.forEach((p) => {
      const val = p[lane.key as keyof StreamPoint] as number | undefined;
      if (val != null) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    });

    if (min === Infinity) {
      // Defaults if no data exists
      min = 0;
      max = lane.key === "hr" ? 180 : lane.key === "power" ? 300 : lane.key === "cadence" ? 100 : 100;
    }
    
    // Safety padding
    if (min === max) {
      min = Math.max(0, min - 10);
      max += 10;
    } else {
      const diff = max - min;
      min = Math.max(0, min - diff * 0.05);
      max += diff * 0.05;
    }

    const { top, bottom } = getLaneBounds(idx);

    return {
      key: lane.key,
      min,
      max,
      top,
      bottom,
    };
  });

  // ─── Map stream value to SVG Y coordinate ────────────────────────────────────
  function valToY(val: number, laneIdx: number): number {
    const scale = laneScales[laneIdx];
    const { top, bottom } = getLaneBounds(laneIdx);
    const pct = (val - scale.min) / (scale.max - scale.min || 1);
    return bottom - pct * laneHeight;
  }

  // ─── Format Time ────────────────────────────────────────────────────────────
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ─── Hover Event Handler ─────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Map screen mouse X relative to SVG width into SVG coordinate space
    const relativeFraction = (e.clientX - rect.left) / rect.width;
    const svgX = relativeFraction * SVG_W;

    // Calculate time offset
    const chartX = svgX - PADDING_L;
    const fraction = chartX / chartW;
    const time = Math.max(0, Math.min(totalDuration, fraction * totalDuration));

    // Find the closest point in the streams by time
    let closestPoint = points[0];
    let minDiff = Math.abs(points[0].t - time);
    for (const p of points) {
      const diff = Math.abs(p.t - time);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = p;
      }
    }

    // Map closest point's time to exact SVG coordinate to snap the vertical line
    const snapX = PADDING_L + (closestPoint.t / totalDuration) * chartW;

    setHoverData({
      x: snapX,
      time: closestPoint.t,
      point: closestPoint,
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // ─── Build Paths for each lane ──────────────────────────────────────────────
  const paths = lanes.map((lane, laneIdx) => {
    const scale = laneScales[laneIdx];
    const validPoints = points.filter((p) => p[lane.key as keyof StreamPoint] != null);
    
    if (validPoints.length === 0) return null;

    const coords = validPoints.map((p) => {
      const x = PADDING_L + (p.t / totalDuration) * chartW;
      const y = valToY(p[lane.key as keyof StreamPoint] as number, laneIdx);
      return { x, y };
    });

    // Generate SVG path line
    const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

    // Generate SVG path area (for altitude shaded background)
    let areaPath = "";
    if (lane.isArea && coords.length > 0) {
      const { bottom } = getLaneBounds(laneIdx);
      areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${bottom} L ${coords[0].x.toFixed(1)} ${bottom} Z`;
    }

    return { linePath, areaPath };
  });

  // ─── Generate X-axis ticks ──────────────────────────────────────────────────
  const xTicks: number[] = [];
  const tickSpacing = totalDuration > 3600 ? 600 : totalDuration > 1800 ? 300 : 200;
  for (let t = 0; t <= totalDuration; t += tickSpacing) {
    xTicks.push(t);
  }
  if (xTicks[xTicks.length - 1] < totalDuration - tickSpacing / 3) {
    xTicks.push(totalDuration);
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "16px 20px",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "relative", width: "100%", height: "auto" }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: "auto", overflow: "visible", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Render each lane */}
          {lanes.map((lane, laneIdx) => {
            const { top, bottom } = getLaneBounds(laneIdx);
            const scale = laneScales[laneIdx];
            const path = paths[laneIdx];
            
            // Value under hover
            const hoverVal = hoverData?.point[lane.key as keyof StreamPoint] as number | undefined;

            return (
              <g key={lane.key}>
                {/* Lane Background Grid Lines */}
                {[0, 0.5, 1.0].map((pct, idx) => {
                  const y = bottom - pct * laneHeight;
                  return (
                    <line
                      key={idx}
                      x1={PADDING_L}
                      y1={y}
                      x2={SVG_W - PADDING_R}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeWidth={idx === 0 ? 1.2 : 0.8}
                      strokeDasharray={idx === 0 ? "none" : "2,2"}
                    />
                  );
                })}

                {/* Y-Axis labels (min and max values) */}
                <text
                  x={PADDING_L - 8}
                  y={top + 8}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight="500"
                >
                  {Math.round(scale.max)}
                  {lane.unit.trim()}
                </text>
                <text
                  x={PADDING_L - 8}
                  y={bottom}
                  textAnchor="end"
                  fontSize="9.5"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight="500"
                >
                  {Math.round(scale.min)}
                  {lane.unit.trim()}
                </text>

                {/* Left lane title */}
                <text
                  x={12}
                  y={top + laneHeight / 2 + 3}
                  fontSize="9"
                  fontWeight="700"
                  fill="var(--text-muted)"
                  textAnchor="middle"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", transformOrigin: `12px ${(top + laneHeight / 2).toFixed(1)}px` }}
                >
                  {lane.label.toUpperCase()}
                </text>

                {/* Shaded Area Chart (e.g. for Altitude) */}
                {path?.areaPath && (
                  <path
                    d={path.areaPath}
                    fill={lane.color}
                    fillOpacity={0.15}
                  />
                )}

                {/* Line Chart */}
                {path?.linePath && (
                  <path
                    d={path.linePath}
                    fill="none"
                    stroke={lane.color}
                    strokeWidth={1.5}
                  />
                )}

                {/* Active hover dot/circle and value overlay */}
                {hoverData && hoverVal != null && (
                  <g>
                    {/* Hover dot */}
                    <circle
                      cx={hoverData.x}
                      cy={valToY(hoverVal, laneIdx)}
                      r={4.5}
                      fill={lane.color}
                      stroke="var(--bg-surface)"
                      strokeWidth={1.5}
                    />
                    {/* Active Value Label near the dot */}
                    <rect
                      x={hoverData.x + 8}
                      y={valToY(hoverVal, laneIdx) - 10}
                      width={48}
                      height={16}
                      fill="var(--bg-elevated)"
                      stroke="var(--border-default)"
                      strokeWidth={1}
                      rx={3}
                    />
                    <text
                      x={hoverData.x + 32}
                      y={valToY(hoverVal, laneIdx) + 2}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight="700"
                      fill="var(--text-primary)"
                      fontFamily="var(--font-mono, monospace)"
                    >
                      {Math.round(hoverVal)}
                      {lane.unit.trim() === "rpm" || lane.unit.trim() === "bpm" ? "" : lane.unit.trim()}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={PADDING_L}
            y1={PADDING_T + 4 * (laneHeight + laneGap) - laneGap}
            x2={SVG_W - PADDING_R}
            y2={PADDING_T + 4 * (laneHeight + laneGap) - laneGap}
            stroke="var(--border-default)"
            strokeWidth={1.5}
          />

          {/* X-Axis Ticks & Timestamps */}
          {xTicks.map((tick, idx) => {
            const x = PADDING_L + (tick / totalDuration) * chartW;
            const isHoveredNearTick = hoverData && Math.abs(hoverData.time - tick) < tickSpacing / 2;

            if (isHoveredNearTick) return null;

            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={PADDING_T + 4 * (laneHeight + laneGap) - laneGap}
                  x2={x}
                  y2={PADDING_T + 4 * (laneHeight + laneGap) - laneGap + 4}
                  stroke="var(--border-subtle)"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={PADDING_T + 4 * (laneHeight + laneGap) - laneGap + 16}
                  textAnchor="middle"
                  fontSize="9.5"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono, monospace)"
                  fontWeight="500"
                >
                  {formatTime(tick)}
                </text>
              </g>
            );
          })}

          {/* Interactive Hover Vertical Tracker Line */}
          {hoverData && (
            <g>
              {/* Full height vertical cursor line */}
              <line
                x1={hoverData.x}
                y1={PADDING_T - 5}
                x2={hoverData.x}
                y2={PADDING_T + 4 * (laneHeight + laneGap) - laneGap + 5}
                stroke="var(--text-primary)"
                strokeWidth={1.5}
              />
              {/* Time tick label bubble */}
              <rect
                x={hoverData.x - 24}
                y={PADDING_T + 4 * (laneHeight + laneGap) - laneGap + 4}
                width={48}
                height={16}
                fill="var(--bg-elevated)"
                stroke="var(--border-default)"
                rx={3}
              />
              <text
                x={hoverData.x}
                y={PADDING_T + 4 * (laneHeight + laneGap) - laneGap + 15}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="var(--text-primary)"
                fontFamily="var(--font-mono, monospace)"
              >
                {formatTime(hoverData.time)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
