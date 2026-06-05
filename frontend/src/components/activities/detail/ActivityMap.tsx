"use client";

/**
 * ActivityMap — renders the GPS route using react-leaflet.
 *
 * Upgraded Features (Advanced UI/UX):
 *  - Interactive Scrubber AreaChart synced with Leaflet map markers
 *  - Floating premium glassmorphism HUD stats card (displays overall vs point telemetry)
 *  - Pulsing custom location indicator tracking the hovered position
 *  - Live map style switcher (Dark Matter, Street Map, Terrain Map)
 *  - Color-coded route overlays by Speed, HR, Power, or Altitude
 */

import * as React from "react";
import { useState, useMemo, Suspense } from "react";
import { MapPin, Compass, Layers } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { StreamPoint } from "@/lib/types/activity";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function ensureLeafletCss() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

type ColorMode = "speed" | "hr" | "power" | "altitude" | "none";

function lerpColor(ratio: number): string {
  const clamp = Math.max(0, Math.min(1, ratio));
  if (clamp < 0.33) {
    const t = clamp / 0.33;
    const r = Math.round(59 + t * (34 - 59));
    const g = Math.round(130 + t * (197 - 130));
    const b = Math.round(246 + t * (94 - 246));
    return `rgb(${r},${g},${b})`;
  }
  if (clamp < 0.66) {
    const t = (clamp - 0.33) / 0.33;
    const r = Math.round(34 + t * (245 - 34));
    const g = Math.round(197 + t * (158 - 197));
    const b = Math.round(94 + t * (11 - 94));
    return `rgb(${r},${g},${b})`;
  }
  const t = (clamp - 0.66) / 0.34;
  const r = Math.round(245 + t * (239 - 245));
  const g = Math.round(158 + t * (68 - 158));
  const b = Math.round(11 + t * (68 - 11));
  return `rgb(${r},${g},${b})`;
}

function getStreamValue(p: StreamPoint, mode: ColorMode): number | null {
  if (mode === "speed") return p.speed ?? null;
  if (mode === "hr") return p.hr ?? null;
  if (mode === "power") return p.power ?? null;
  if (mode === "altitude") return p.altitude ?? null;
  return null;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatPace(speedMps: number | null | undefined): string {
  if (speedMps == null || speedMps <= 0.1) return "--:--";
  const totalSeconds = 1000 / speedMps;
  if (totalSeconds > 1800) return "--:--";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} /km`;
}

function formatSpeedKmh(speedMps: number | null | undefined): string {
  if (speedMps == null || speedMps <= 0.1) return "--.-";
  return `${(speedMps * 3.6).toFixed(1)} km/h`;
}

function downsamplePoints(points: StreamPoint[], maxPoints: number): StreamPoint[] {
  if (points.length <= maxPoints) return points;
  const sampled: StreamPoint[] = [];
  const stride = (points.length - 1) / (maxPoints - 1);
  for (let index = 0; index < maxPoints; index += 1) {
    const pointIndex = Math.round(index * stride);
    const point = points[pointIndex];
    if (point && !sampled.includes(point)) {
      sampled.push(point);
    }
  }
  return sampled;
}

interface MapInnerProps {
  points: StreamPoint[];
  sportColor: string;
  colorMode: ColorMode;
  mapStyle: "dark" | "streets" | "terrain";
  hoveredPoint: StreamPoint | null;
}

const MapInner = React.lazy(async () => {
  ensureLeafletCss();
  const { MapContainer, TileLayer, Polyline, CircleMarker } = await import("react-leaflet");

  function Inner({ points, sportColor, colorMode, mapStyle, hoveredPoint }: MapInnerProps) {
    const validPoints = points.filter((p) => p.lat != null && p.lng != null);
    if (validPoints.length < 2) return null;

    const positions: [number, number][] = validPoints.map((p) => [p.lat!, p.lng!]);
    const center = positions[Math.floor(positions.length / 2)];

    // Dynamic styles based on mapStyle selection
    const tileUrls = {
      dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      terrain: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    };

    const tileAttributions = {
      dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      streets: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
      terrain: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    };

    let segments: { pos: [number, number][]; color: string }[] | null = null;

    if (colorMode !== "none") {
      const values = validPoints.map((p) => getStreamValue(p, colorMode));
      const validVals = values.filter((v): v is number => v != null);
      if (validVals.length > 0) {
        const minV = Math.min(...validVals);
        const maxV = Math.max(...validVals);
        const range = maxV - minV || 1;
        segments = [];
        for (let i = 0; i < validPoints.length - 1; i++) {
          const v = values[i];
          const ratio = v != null ? (v - minV) / range : 0.5;
          const adjustedRatio = colorMode === "speed" ? 1 - ratio : ratio;
          segments.push({
            pos: [positions[i], positions[i + 1]],
            color: lerpColor(adjustedRatio),
          });
        }
      }
    }

    return (
      <MapContainer
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom={true}
        attributionControl={false}
        zoomControl={true}
      >
        <TileLayer
          url={tileUrls[mapStyle]}
          attribution={tileAttributions[mapStyle]}
        />
        {segments ? (
          segments.map((seg, i) => (
            <Polyline
              key={i}
              positions={seg.pos}
              pathOptions={{ color: seg.color, weight: 4.5, opacity: 0.95 }}
            />
          ))
        ) : (
          <Polyline
            positions={positions}
            pathOptions={{ color: sportColor, weight: 4.5, opacity: 0.95 }}
          />
        )}
        <CircleMarker
          center={positions[0]}
          radius={6}
          pathOptions={{ color: "#22C55E", fillColor: "#22C55E", fillOpacity: 1, weight: 2 }}
        />
        <CircleMarker
          center={positions[positions.length - 1]}
          radius={6}
          pathOptions={{ color: "#EF4444", fillColor: "#EF4444", fillOpacity: 1, weight: 2 }}
        />

        {/* Pulsing indicator synced to timeline scrubber */}
        {hoveredPoint && hoveredPoint.lat != null && hoveredPoint.lng != null && (
          <>
            <CircleMarker
              center={[hoveredPoint.lat, hoveredPoint.lng]}
              radius={14}
              pathOptions={{
                color: "#22D3EE",
                fillColor: "transparent",
                fillOpacity: 0,
                weight: 1.8,
                dashArray: "3 3",
              }}
            />
            <CircleMarker
              center={[hoveredPoint.lat, hoveredPoint.lng]}
              radius={7}
              pathOptions={{
                color: "#FFFFFF",
                fillColor: "#06B6D4",
                fillOpacity: 1,
                weight: 2,
              }}
            />
          </>
        )}
      </MapContainer>
    );
  }

  return { default: Inner };
});

function NoGpsState() {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border-default bg-bg-elevated/40 text-text-muted">
      <MapPin size={28} className="opacity-40" />
      <p className="text-sm">No GPS route telemetry data available for this activity.</p>
    </div>
  );
}

interface ActivityMapProps {
  points: StreamPoint[] | null;
  sportColor?: string;
  sport?: string;
}

const COLOR_MODES: { key: ColorMode; label: string }[] = [
  { key: "none", label: "Default" },
  { key: "speed", label: "Speed" },
  { key: "hr", label: "HR" },
  { key: "power", label: "Power" },
  { key: "altitude", label: "Altitude" },
];

export function ActivityMap({ points, sportColor = "#8B5CF6", sport = "other" }: ActivityMapProps) {
  const [colorMode, setColorMode] = useState<ColorMode>("none");
  const [mapStyle, setMapStyle] = useState<"dark" | "streets" | "terrain">("dark");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const hasGps = useMemo(() => {
    return (points?.length ?? 0) > 1 && points!.some((p) => p.lat != null && p.lng != null);
  }, [points]);

  const availableModes = useMemo(() => {
    return COLOR_MODES.filter((m) => {
      if (m.key === "none") return true;
      if (!points?.length) return false;
      return points.some((p) => getStreamValue(p, m.key) != null);
    });
  }, [points]);

  const stats = useMemo(() => {
    if (!points || points.length === 0) return null;
    const validPoints = points.filter((p) => p.lat != null && p.lng != null);
    if (validPoints.length === 0) return null;

    const duration = points[points.length - 1].t - points[0].t;
    const startDist = points[0].distance ?? 0;
    const endDist = points[points.length - 1].distance ?? startDist;
    const distanceKm = (endDist - startDist) / 1000;

    let elevGain = 0;
    let hrSum = 0;
    let hrCount = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i > 0 && p.altitude != null && points[i - 1].altitude != null) {
        const diff = p.altitude - points[i - 1].altitude!;
        if (diff > 0) elevGain += diff;
      }
      if (p.hr != null && p.hr > 0) {
        hrSum += p.hr;
        hrCount++;
      }
      if (p.speed != null && p.speed > 0.1) {
        speedSum += p.speed;
        speedCount++;
      }
    }

    const avgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : null;
    const avgSpeed = speedCount > 0 ? speedSum / speedCount : null;

    return {
      duration,
      distanceKm: distanceKm.toFixed(2),
      elevGain: Math.round(elevGain),
      avgHr,
      avgSpeed,
    };
  }, [points]);

  // Downsample telemetry points for scrubber rendering performance
  const chartData = useMemo(() => {
    if (!points || points.length === 0) return [];
    const sampled = downsamplePoints(points, 250);
    return sampled.map((p, idx) => ({
      index: idx,
      distanceKm: parseFloat((((p.distance ?? 0) - (points[0].distance ?? 0)) / 1000).toFixed(2)),
      altitude: p.altitude != null ? Math.round(p.altitude) : null,
      speed: p.speed != null ? parseFloat((p.speed * 3.6).toFixed(1)) : null,
      hr: p.hr ?? null,
      point: p,
    }));
  }, [points]);

  const hasAltitude = useMemo(() => chartData.some((d) => d.altitude != null), [chartData]);
  const mainDataKey = hasAltitude ? "altitude" : "speed";

  const hoveredPoint = useMemo(() => {
    if (hoveredIndex == null || !chartData[hoveredIndex]) return null;
    return chartData[hoveredIndex].point;
  }, [hoveredIndex, chartData]);

  if (!hasGps) {
    return <NoGpsState />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Map display with control dashboard */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-surface">
        <div className="flex flex-col gap-3 p-4 border-b border-border-subtle bg-bg-elevated/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary">Interactive Route Map</h2>
            <p className="text-[11px] text-text-muted">Drag to pan, zoom to inspect. Hover the chart below to scrub location.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 text-xs">
            {/* Map Styles Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Style:</span>
              <div className="inline-flex rounded-lg bg-bg-input p-0.5 border border-border-subtle">
                {(["dark", "streets", "terrain"] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setMapStyle(style)}
                    className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase transition-all ${
                      mapStyle === style
                        ? "bg-accent text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Path Color-Coding Selector */}
            {availableModes.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Color:</span>
                <div className="inline-flex rounded-lg bg-bg-input p-0.5 border border-border-subtle">
                  {availableModes.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setColorMode(m.key)}
                      className={`rounded-md px-2 py-1 text-[10px] font-extrabold uppercase transition-all ${
                        colorMode === m.key
                          ? "bg-accent text-white shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend color spectrum */}
        {colorMode !== "none" && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-border-subtle bg-bg-elevated/20">
            <span className="text-[10px] font-semibold text-text-muted">
              {colorMode === "speed" ? "Fast" : "Low"}
            </span>
            <div className="h-1.5 flex-1 rounded-full bg-gradient-to-right from-blue-500 via-green-500 via-yellow-500 to-red-500" />
            <span className="text-[10px] font-semibold text-text-muted">
              {colorMode === "speed" ? "Slow" : "High"}
            </span>
          </div>
        )}

        {/* The Leaflet Map box */}
        <div className="relative h-[250px] sm:h-[400px] w-full bg-bg-surface overflow-hidden">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-text-muted bg-bg-elevated/30">
                Loading interactive map...
              </div>
            }
          >
            <MapInner
              points={points!}
              sportColor={sportColor}
              colorMode={colorMode}
              mapStyle={mapStyle}
              hoveredPoint={hoveredPoint}
            />
          </Suspense>

          {/* Floating Glassmorphic HUD overlay (Desktop only) */}
          {stats && (
            <div className="hidden sm:block absolute top-4 right-4 z-[1000] min-w-[210px] max-w-[280px] rounded-xl border border-border-subtle bg-bg-surface/85 p-3 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 border-b border-border-subtle/50 pb-1.5">
                <span className={`h-2 w-2 rounded-full ${hoveredPoint ? "bg-cyan-400 animate-ping" : "bg-accent"}`} />
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-text-primary">
                  {hoveredPoint ? "Scrubbing Route" : "Activity Stats"}
                </h4>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[11px] leading-tight">
                {hoveredPoint ? (
                  <>
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted">Time</span>
                      <div className="font-bold text-text-primary mt-0.5">{fmtDuration(hoveredPoint.t - points![0].t)}</div>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted">Distance</span>
                      <div className="font-bold text-text-primary mt-0.5">{(((hoveredPoint.distance ?? 0) - (points![0].distance ?? 0)) / 1000).toFixed(2)} km</div>
                    </div>
                    {hoveredPoint.speed != null && (
                      <div>
                        <span className="text-[9px] font-semibold text-text-muted">Speed</span>
                        <div className="font-bold text-cyan-400 mt-0.5">
                          {sport === "running" ? formatPace(hoveredPoint.speed) : formatSpeedKmh(hoveredPoint.speed)}
                        </div>
                      </div>
                    )}
                    {hoveredPoint.hr != null && (
                      <div>
                        <span className="text-[9px] font-semibold text-text-muted">HR</span>
                        <div className="font-bold text-red-400 mt-0.5">{Math.round(hoveredPoint.hr)} bpm</div>
                      </div>
                    )}
                    {hoveredPoint.power != null && (
                      <div>
                        <span className="text-[9px] font-semibold text-text-muted">Power</span>
                        <div className="font-bold text-blue-400 mt-0.5">{Math.round(hoveredPoint.power)} W</div>
                      </div>
                    )}
                    {hoveredPoint.altitude != null && (
                      <div>
                        <span className="text-[9px] font-semibold text-text-muted">Elev</span>
                        <div className="font-bold text-green-400 mt-0.5">{Math.round(hoveredPoint.altitude)} m</div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted">Distance</span>
                      <div className="font-bold text-text-primary mt-0.5">{stats.distanceKm} km</div>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted">Duration</span>
                      <div className="font-bold text-text-primary mt-0.5">{fmtDuration(stats.duration)}</div>
                    </div>
                    {stats.avgSpeed != null && (
                      <div>
                        <span className="text-[9px] font-semibold text-text-muted">Avg Speed</span>
                        <div className="font-bold text-text-primary mt-0.5">
                          {sport === "running" ? formatPace(stats.avgSpeed) : formatSpeedKmh(stats.avgSpeed)}
                        </div>
                      </div>
                    )}
                    {stats.avgHr != null && (
                      <div>
                        <span className="text-[9px] font-semibold text-text-muted">Avg HR</span>
                        <div className="font-bold text-red-400 mt-0.5">{stats.avgHr} bpm</div>
                      </div>
                    )}
                    <div>
                      <span className="text-[9px] font-semibold text-text-muted">Elev Gain</span>
                      <div className="font-bold text-green-400 mt-0.5">+{stats.elevGain} m</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic HUD stats for Mobile — clean grid block underneath map */}
      {stats && (
        <div className="block sm:hidden rounded-xl border border-border-subtle bg-bg-surface p-3.5 shadow-md">
          <div className="flex items-center gap-1.5 border-b border-border-subtle/50 pb-1.5 mb-2.5">
            <span className={`h-1.5 w-1.5 rounded-full ${hoveredPoint ? "bg-cyan-400 animate-ping" : "bg-accent"}`} />
            <h4 className="text-[9px] font-extrabold uppercase tracking-widest text-text-primary">
              {hoveredPoint ? "Scrubbing Route" : "Activity Stats"}
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-x-2 gap-y-1.5 font-mono text-[10px] leading-tight">
            {hoveredPoint ? (
              <>
                <div>
                  <span className="text-[8px] font-semibold text-text-muted block">Time</span>
                  <span className="font-bold text-text-primary mt-0.5">{fmtDuration(hoveredPoint.t - points![0].t)}</span>
                </div>
                <div>
                  <span className="text-[8px] font-semibold text-text-muted block">Distance</span>
                  <span className="font-bold text-text-primary mt-0.5">{(((hoveredPoint.distance ?? 0) - (points![0].distance ?? 0)) / 1000).toFixed(2)} km</span>
                </div>
                {hoveredPoint.speed != null && (
                  <div>
                    <span className="text-[8px] font-semibold text-text-muted block">Speed</span>
                    <span className="font-bold text-cyan-400 mt-0.5">
                      {sport === "running" ? formatPace(hoveredPoint.speed) : formatSpeedKmh(hoveredPoint.speed)}
                    </span>
                  </div>
                )}
                {hoveredPoint.hr != null && (
                  <div>
                    <span className="text-[8px] font-semibold text-text-muted block">HR</span>
                    <span className="font-bold text-red-400 mt-0.5">{Math.round(hoveredPoint.hr)} bpm</span>
                  </div>
                )}
                {hoveredPoint.power != null && (
                  <div>
                    <span className="text-[8px] font-semibold text-text-muted block">Power</span>
                    <span className="font-bold text-blue-400 mt-0.5">{Math.round(hoveredPoint.power)} W</span>
                  </div>
                )}
                {hoveredPoint.altitude != null && (
                  <div>
                    <span className="text-[8px] font-semibold text-text-muted block">Elev</span>
                    <span className="font-bold text-green-400 mt-0.5">{Math.round(hoveredPoint.altitude)} m</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <span className="text-[8px] font-semibold text-text-muted block">Distance</span>
                  <span className="font-bold text-text-primary mt-0.5">{stats.distanceKm} km</span>
                </div>
                <div>
                  <span className="text-[8px] font-semibold text-text-muted block">Duration</span>
                  <span className="font-bold text-text-primary mt-0.5">{fmtDuration(stats.duration)}</span>
                </div>
                {stats.avgSpeed != null && (
                  <div>
                    <span className="text-[8px] font-semibold text-text-muted block">Avg Speed</span>
                    <span className="font-bold text-text-primary mt-0.5">
                      {sport === "running" ? formatPace(stats.avgSpeed) : formatSpeedKmh(stats.avgSpeed)}
                    </span>
                  </div>
                )}
                {stats.avgHr != null && (
                  <div>
                    <span className="text-[8px] font-semibold text-text-muted block">Avg HR</span>
                    <span className="font-bold text-red-400 mt-0.5">{stats.avgHr} bpm</span>
                  </div>
                )}
                <div>
                  <span className="text-[8px] font-semibold text-text-muted block">Elev Gain</span>
                  <span className="font-bold text-green-400 mt-0.5">+{stats.elevGain} m</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Synchronized Mini-Chart Scrubber Panel */}
      {chartData.length > 0 && (
        <Card className="p-4 border border-border-subtle bg-bg-surface/30">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Compass size={14} className="text-accent" />
              Route Position Scrubber ({hasAltitude ? "Elevation Profile" : "Speed Profile"})
            </span>
            {hoveredPoint && (
              <span className="font-mono text-[10px] text-accent font-bold">
                Position: {(((hoveredPoint.distance ?? 0) - (points![0].distance ?? 0)) / 1000).toFixed(2)} km @ {fmtDuration(hoveredPoint.t - points![0].t)}
              </span>
            )}
          </div>

          <div className="h-[90px] w-full" style={{ touchAction: "pan-y" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 10, left: -28, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e.activeTooltipIndex != null) {
                    setHoveredIndex(Number(e.activeTooltipIndex));
                  }
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                }}
              >
                <defs>
                  <linearGradient id="routeScrubberGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sportColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={sportColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="distanceKm" tick={{ fill: "var(--text-muted)", fontSize: 8 }} axisLine={false} tickLine={false} unit=" km" />
                <YAxis
                  dataKey={mainDataKey}
                  tick={{ fill: "var(--text-muted)", fontSize: 8 }}
                  axisLine={false}
                  tickLine={false}
                  unit={hasAltitude ? "m" : "k"}
                  domain={["dataMin - 5", "dataMax + 5"]}
                  width={28}
                />
                <Tooltip
                  content={() => null}
                  cursor={{ stroke: "var(--color-accent)", strokeWidth: 1.5, strokeDasharray: "2 2" }}
                />
                <Area
                  type="monotone"
                  dataKey={mainDataKey}
                  stroke={sportColor}
                  strokeWidth={1.8}
                  fill="url(#routeScrubberGrad)"
                  dot={false}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
