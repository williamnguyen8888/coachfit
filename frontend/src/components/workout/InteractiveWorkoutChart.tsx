"use client";

import { useState, useRef, useEffect } from "react";
import type { WorkoutStep, StepType, StepDuration, StepTarget } from "@/lib/types/workout";

// ─── Color & Icon Maps ────────────────────────────────────────────────────────

const ZONE_COLORS: Record<number, string> = {
  1: "#60A5FA", // blue
  2: "#34D399", // green
  3: "#FBBF24", // yellow
  4: "#FB923C", // orange
  5: "#F87171", // red
  6: "#C084FC", // purple
  7: "#F472B6", // pink
};

function getZoneColor(zone: number): string {
  return ZONE_COLORS[Math.max(1, Math.min(7, zone))] ?? "#8B8B9E";
}

// ─── Component Props ──────────────────────────────────────────────────────────

export interface InteractiveWorkoutChartProps {
  steps: WorkoutStep[];
  sport: string;
}

// ─── Chart Segment Interface ──────────────────────────────────────────────────

interface ChartSegment {
  index: number;
  type: StepType;
  durationSeconds: number;
  intensity: number; // 0.0 - 1.5 (intensity factor speed representation)
  color: string;
  label: string;
  startTime: number;
  endTime: number;
  description: string;
  targetText: string;
  originalStep: WorkoutStep;
}

export function InteractiveWorkoutChart({ steps, sport }: InteractiveWorkoutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showPercent, setShowPercent] = useState(false);
  const [hoverData, setHoverData] = useState<{
    x: number;
    time: number;
    segment: ChartSegment;
  } | null>(null);

  // ─── Flatten steps recursively into segment list ────────────────────────────
  const segments: ChartSegment[] = [];
  let currentTime = 0;

  function intensityFromTarget(target?: StepTarget): { intensity: number; color: string; text: string } {
    if (!target || target.type === "open" || target.type === "none") {
      return { intensity: 0.5, color: "#8B8B9E", text: "Open" };
    }
    switch (target.type) {
      case "power_zone":
      case "hr_zone": {
        const z = target.zone ?? 2;
        return { intensity: z / 5.5, color: getZoneColor(z), text: `Z${z}` };
      }
      case "power_pct": {
        const mid = ((target.min ?? 0.5) + (target.max ?? 0.8)) / 2;
        const zone = Math.max(1, Math.min(7, Math.round(mid * 4.5)));
        return { intensity: mid, color: getZoneColor(zone), text: `${Math.round(mid * 100)}% FTP` };
      }
      case "pace": {
        if (target.min != null && target.max != null) {
          const mid = (target.min + target.max) / 2;
          const zone = Math.max(1, Math.min(6, Math.round(mid * 5.5)));
          return { intensity: mid, color: getZoneColor(zone), text: `${Math.round(target.min * 100)}-${Math.round(target.max * 100)}% Pace` };
        }
        return { intensity: 0.7, color: getZoneColor(2), text: "Pace" };
      }
      case "cadence": {
        const mid = ((target.min ?? 5) + (target.max ?? 7)) / 2;
        return { intensity: mid / 10, color: getZoneColor(2), text: `${target.value ?? 90} rpm` };
      }
      default:
        return { intensity: 0.5, color: "#8B8B9E", text: "Open" };
    }
  }

  function processSteps(stepsList: WorkoutStep[], multiplier = 1) {
    for (const step of stepsList) {
      if (step.type === "repeat" && step.steps) {
        const count = step.count ?? 1;
        for (let r = 0; r < count; r++) {
          processSteps(step.steps, multiplier);
        }
      } else {
        const dur = step.duration?.value ?? 300;
        const { intensity, color, text: targetText } = intensityFromTarget(step.target);
        
        let overrideIntensity = intensity;
        if (step.type === "warmup" || step.type === "cooldown") {
          overrideIntensity = Math.min(intensity, 0.6);
        } else if (step.type === "rest") {
          overrideIntensity = 0.4;
        }

        const label = step.type[0].toUpperCase() + step.type.slice(1);
        const desc = step.description || label;

        segments.push({
          index: segments.length,
          type: step.type,
          durationSeconds: dur,
          intensity: overrideIntensity,
          color: step.type === "rest" ? "#5A5A6E" : color,
          label,
          startTime: currentTime,
          endTime: currentTime + dur,
          description: desc,
          targetText,
          originalStep: step,
        });
        currentTime += dur;
      }
    }
  }

  processSteps(steps);

  const totalDuration = currentTime;

  // ─── Custom Threshold Values ────────────────────────────────────────────────
  // In swimming, CSS threshold pace = 2:47 per 100m (167 seconds)
  // In running, threshold pace = 4:30 per km (270 seconds)
  // In cycling, threshold power = 250 W
  const THRESHOLD_PACES: Record<string, { value: number; label: string }> = {
    swimming: { value: 167, label: "2:47" },
    running: { value: 270, label: "4:30" },
    cycling: { value: 250, label: "250W" },
    other: { value: 100, label: "100" },
  };

  const threshold = THRESHOLD_PACES[sport] ?? THRESHOLD_PACES.other;

  // ─── Format time string ─────────────────────────────────────────────────────
  function formatMinutesSeconds(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ─── Calculate Absolute Target Value under hover ──────────────────────────
  function getAbsoluteTargetLabel(segment: ChartSegment): string {
    const intensity = segment.intensity;
    if (sport === "swimming") {
      // Pace (seconds/100m) = CSS / intensity
      const paceSec = Math.round(threshold.value / (intensity || 1));
      const m = Math.floor(paceSec / 60);
      const s = Math.round(paceSec % 60);
      return `${m}:${s.toString().padStart(2, "0")}`;
    } else if (sport === "cycling") {
      // Watts = FTP * intensity
      const watts = Math.round(threshold.value * intensity);
      return `${watts}W`;
    } else if (sport === "running") {
      // Pace (seconds/km) = Threshold / intensity
      const paceSec = Math.round(threshold.value / (intensity || 1));
      const m = Math.floor(paceSec / 60);
      const s = Math.round(paceSec % 60);
      return `${m}:${s.toString().padStart(2, "0")}/km`;
    }
    return `${Math.round(intensity * 100)}%`;
  }

  // ─── Hover Event Handlers ───────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (totalDuration === 0 || segments.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // SVG coordinate system constraints
    const SVG_W = 750;
    const PADDING_L = 55;
    const PADDING_R = 20;
    const chartW = SVG_W - PADDING_L - PADDING_R;

    // Map screen cursor X into internal SVG coordinate system
    const relativeFraction = (e.clientX - rect.left) / rect.width;
    const svgX = relativeFraction * SVG_W;

    // Calculate time offset based on chart grid boundary
    const chartX = svgX - PADDING_L;
    const fraction = chartX / chartW;
    const time = Math.max(0, Math.min(totalDuration, fraction * totalDuration));

    // Find segment at time
    const segment = segments.find((s) => time >= s.startTime && time <= s.endTime) ?? segments[segments.length - 1];

    setHoverData({
      x: svgX,
      time,
      segment,
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // ─── Generate X ticks based on total duration ──────────────────────────────
  const xTicks: number[] = [];
  const tickSpacing = totalDuration > 3600 ? 600 : totalDuration > 1800 ? 300 : 200;
  for (let t = 0; t <= totalDuration; t += tickSpacing) {
    xTicks.push(t);
  }
  if (xTicks[xTicks.length - 1] < totalDuration - tickSpacing / 3) {
    xTicks.push(totalDuration);
  }

  // ─── Render SVG dimensions ──────────────────────────────────────────────────
  const SVG_W = 750;
  const SVG_H = 160;
  const PADDING_L = 55;
  const PADDING_R = 20;
  const PADDING_T = 20;
  const PADDING_B = 25;
  
  const chartW = SVG_W - PADDING_L - PADDING_R;
  const chartH = SVG_H - PADDING_T - PADDING_B;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        overflow: "hidden",
      }}
    >
      {/* Chart Title and Config */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "var(--text-muted)",
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        <span>Workout Profile Timeline</span>
        <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
          {formatMinutesSeconds(totalDuration)} total
        </span>
      </div>

      {/* SVG Container */}
      <div style={{ position: "relative", width: "100%", height: "auto" }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: "100%", height: "auto", overflow: "visible", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Background Grid Lines */}
          {[0.33, 0.67, 1.0, 1.33].map((intensity, idx) => {
            // Y-coordinate: top is PADDING_T, bottom is SVG_H - PADDING_B
            const y = PADDING_T + chartH * (1.0 - intensity / 1.5);
            return (
              <line
                key={idx}
                x1={PADDING_L}
                y1={y}
                x2={SVG_W - PADDING_R}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth={1}
                strokeDasharray={intensity === 1.0 ? "none" : "3,3"}
              />
            );
          })}

          {/* Y-Axis Labels (Left) */}
          {[0.67, 1.0, 1.33].map((intensity, idx) => {
            const y = PADDING_T + chartH * (1.0 - intensity / 1.5) + 4;
            let label = "";
            if (showPercent) {
              label = `${Math.round(intensity * 100)}%`;
            } else {
              if (sport === "swimming") {
                const paceSec = Math.round(threshold.value / intensity);
                const m = Math.floor(paceSec / 60);
                const s = Math.round(paceSec % 60);
                label = `${m}:${s.toString().padStart(2, "0")}`;
              } else if (sport === "cycling") {
                label = `${Math.round(threshold.value * intensity)}W`;
              } else if (sport === "running") {
                const paceSec = Math.round(threshold.value / intensity);
                const m = Math.floor(paceSec / 60);
                const s = Math.round(paceSec % 60);
                label = `${m}:${s}`;
              } else {
                label = `${Math.round(intensity * 100)}%`;
              }
            }

            return (
              <text
                key={idx}
                x={PADDING_L - 10}
                y={y}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted)"
                fontWeight="500"
                fontFamily="var(--font-mono, monospace)"
              >
                {label}
              </text>
            );
          })}

          {/* Left Y Axis Title (Pace or Power labels) */}
          <text
            x={12}
            y={PADDING_T + chartH / 2}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-muted)"
            fontWeight="600"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", transformOrigin: "12px 65px" }}
          >
            {sport === "swimming" ? "Pace/100m" : sport === "cycling" ? "Power (W)" : sport === "running" ? "Pace (min/km)" : "Intensity"}
          </text>

          {/* Render Workout Steps Bars */}
          {segments.map((seg, i) => {
            const x = PADDING_L + (seg.startTime / totalDuration) * chartW;
            const barW = (seg.durationSeconds / totalDuration) * chartW;
            
            // Bar height: proportional to intensity (capped at 1.5 max grid height)
            const barH = chartH * (seg.intensity / 1.5);
            const y = PADDING_T + chartH - barH;

            // Rest steps: render a base recovery line + tiny block, other steps standard heights
            const isRest = seg.type === "rest";

            return (
              <g key={i}>
                {/* Main Step Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  fill={seg.color}
                  fillOpacity={isRest ? 0.35 : 0.85}
                  rx={2}
                />
                
                {/* Tiny Blue-Green Rest indicator at bottom (like intervals.icu) */}
                {isRest && (
                  <rect
                    x={x}
                    y={PADDING_T + chartH - 4}
                    width={barW}
                    height={4}
                    fill="#0891B2" // cyan/blue-green rest indicator
                    rx={1}
                  />
                )}
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={PADDING_L}
            y1={PADDING_T + chartH}
            x2={SVG_W - PADDING_R}
            y2={PADDING_T + chartH}
            stroke="var(--border-default)"
            strokeWidth={1.5}
          />

          {/* X-Axis Ticks & Timestamps */}
          {xTicks.map((tick, idx) => {
            const x = PADDING_L + (tick / totalDuration) * chartW;
            const isHoveredNearTick = hoverData && Math.abs(hoverData.time - tick) < tickSpacing / 2;

            if (isHoveredNearTick) return null; // Hide static tick if hover is active near it

            return (
              <g key={idx}>
                {/* Tick line */}
                <line
                  x1={x}
                  y1={PADDING_T + chartH}
                  x2={x}
                  y2={PADDING_T + chartH + 4}
                  stroke="var(--border-subtle)"
                  strokeWidth={1}
                />
                {/* Timestamp label */}
                <text
                  x={x}
                  y={PADDING_T + chartH + 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-muted)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {formatMinutesSeconds(tick)}
                </text>
              </g>
            );
          })}

          {/* Interactive Hover Crosshair Line and Time Ticks */}
          {hoverData && (
            <g>
              {/* Vertical line tracker */}
              <line
                x1={hoverData.x}
                y1={PADDING_T}
                x2={hoverData.x}
                y2={PADDING_T + chartH + 6}
                stroke="var(--text-primary)"
                strokeWidth={1.5}
              />
              {/* Bold active tick on X-axis */}
              <rect
                x={hoverData.x - 24}
                y={PADDING_T + chartH + 4}
                width={48}
                height={16}
                fill="var(--bg-elevated)"
                stroke="var(--border-default)"
                rx={3}
              />
              <text
                x={hoverData.x}
                y={PADDING_T + chartH + 15}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="700"
                fill="var(--text-primary)"
                fontFamily="var(--font-mono, monospace)"
              >
                {formatMinutesSeconds(hoverData.time)}
              </text>
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card */}
        {hoverData && (
          <div
            style={{
              position: "absolute",
              left: `${(hoverData.x / SVG_W) * 100}%`,
              top: `${PADDING_T - 5}px`,
              transform: "translate(-50%, -100%)",
              background: "var(--bg-elevated)",
              border: "1.5px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
              boxShadow: "var(--shadow-md)",
              pointerEvents: "none",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              textAlign: "center",
            }}
          >
            {/* Tooltip Content e.g. "20s 4:56 (50%)" */}
            <div style={{ color: "var(--text-primary)", fontSize: "12.5px" }}>
              {hoverData.segment.durationSeconds}s {getAbsoluteTargetLabel(hoverData.segment)}{" "}
              <span style={{ color: "var(--text-muted)", fontSize: "11px", fontWeight: 500 }}>
                ({Math.round(hoverData.segment.intensity * 100)}%)
              </span>
            </div>
            {/* Step label / Description */}
            <div style={{ fontSize: "10px", color: hoverData.segment.color, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
              {hoverData.segment.description}
            </div>
          </div>
        )}
      </div>

      {/* Footer Settings (% Checkbox) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "4px",
          borderTop: "1px dashed var(--border-subtle)",
          paddingTop: "10px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontWeight: 500,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={showPercent}
            onChange={(e) => setShowPercent(e.target.checked)}
            style={{
              width: "14px",
              height: "14px",
              accentColor: "var(--color-accent)",
              cursor: "pointer",
            }}
          />
          <span>%</span>
        </label>
      </div>
    </div>
  );
}
