"use client";

/**
 * ActivityLaps — laps breakdown table.
 *
 * Columns: Lap #, Duration, Distance, Avg HR, Avg Power, Speed.
 * Each row has a relative duration bar for quick visual comparison.
 * Horizontally scrollable on mobile.
 */

import * as React from "react";
import { Flag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatDuration, formatDistance } from "@/lib/utils";
import type { ActivityLap } from "@/lib/types/activity";

function fmtSpeed(ms: number | null) {
  if (!ms) return "—";
  return `${(ms * 3.6).toFixed(1)} km/h`;
}

function formatSpeedToPace(speedMps: number | null | undefined, type: "run" | "swim"): string {
  if (speedMps == null || speedMps <= 0.1) return "--:--";
  const totalSecs = type === "run" ? 1000 / speedMps : 100 / speedMps;
  if (totalSecs > 1800) return "--:--";
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ActivityLapsProps {
  laps: ActivityLap[] | null;
  sport: string;
  selectedRange?: { startTime: number; endTime: number } | null;
  onSelectLapRange?: (range: { startTime: number; endTime: number } | null) => void;
}

export function ActivityLaps({ laps, sport, selectedRange, onSelectLapRange }: ActivityLapsProps) {
  // Compute cumulative intervals for laps
  const lapIntervals = React.useMemo(() => {
    if (!laps) return [];
    let currentStart = 0;
    return laps.map((lap) => {
      const interval = {
        startTime: currentStart,
        endTime: currentStart + lap.durationSeconds,
      };
      currentStart = interval.endTime;
      return interval;
    });
  }, [laps]);

  if (!laps || laps.length === 0) {
    return (
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "var(--space-4)" }}>
          <Flag size={16} style={{ color: "var(--color-accent)" }} />
          <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Laps
          </h2>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          No lap data available for this activity.
        </p>
      </Card>
    );
  }

  const maxDuration = Math.max(...laps.map((l) => l.durationSeconds));

  return (
    <Card noPadding>
      <div
        style={{
          padding: "var(--space-5) var(--space-5) var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Flag size={16} style={{ color: "var(--color-accent)" }} />
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Laps
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
            {laps.length} lap{laps.length !== 1 ? "s" : ""}
          </span>
        </h2>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--text-sm)" }}
          aria-label="Laps breakdown"
        >
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              {["Lap", "Duration", "Dist", "Avg HR", "Avg Pwr", (sport === "running" || sport === "swimming") ? "Pace" : "Speed"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "10px 16px",
                    textAlign: h === "Lap" ? "left" : "right",
                    color: "var(--text-muted)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap, idx) => {
              const widthPct = (lap.durationSeconds / maxDuration) * 100;
              const interval = lapIntervals[idx];
              const isSelected = selectedRange && interval &&
                selectedRange.startTime === interval.startTime &&
                selectedRange.endTime === interval.endTime;

              return (
                <tr
                  key={lap.lapIndex ?? idx}
                  style={{
                    borderBottom: idx < laps.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    background: isSelected ? "var(--bg-elevated)" : "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    if (onSelectLapRange && interval) {
                      if (isSelected) {
                        onSelectLapRange(null); // Click to deselect
                      } else {
                        onSelectLapRange({ startTime: interval.startTime, endTime: interval.endTime });
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "var(--bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                  }}
                >
                  <td style={{ padding: "12px 16px", textAlign: "left" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className="font-metric tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                        {(lap.lapIndex ?? idx) + 1}
                      </span>
                      <div style={{ height: 3, width: 48, background: "var(--border-subtle)", borderRadius: 2, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${widthPct}%`,
                            background: "var(--color-accent)",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {formatDuration(lap.durationSeconds)}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span className="tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {lap.distanceMeters ? formatDistance(lap.distanceMeters) : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span
                      className="tabular-nums"
                      style={{ color: lap.avgHeartRate ? "#F87171" : "var(--text-muted)", fontWeight: lap.avgHeartRate ? 500 : 400 }}
                    >
                      {lap.avgHeartRate ? `${lap.avgHeartRate} bpm` : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span
                      className="tabular-nums"
                      style={{ color: lap.avgPower ? "var(--color-accent)" : "var(--text-muted)", fontWeight: lap.avgPower ? 500 : 400 }}
                    >
                      {lap.avgPower ? `${lap.avgPower} W` : "—"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span className="tabular-nums" style={{ color: "var(--text-secondary)" }}>
                      {sport === "running"
                        ? (lap.avgSpeed ? `${formatSpeedToPace(lap.avgSpeed, "run")} /km` : "—")
                        : sport === "swimming"
                        ? (lap.avgSpeed ? `${formatSpeedToPace(lap.avgSpeed, "swim")} /100m` : "—")
                        : fmtSpeed(lap.avgSpeed)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
