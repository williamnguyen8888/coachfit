"use client";

/**
 * ActivityMap — renders the GPS route using react-leaflet.
 *
 * Features:
 *  - Color-coded route by Speed, HR, Power, or Altitude
 *  - Falls back gracefully when no GPS / stream data available
 *  - Dark CartoDB tile layer matching the OLED theme
 *  - Start (green) / End (red) markers
 */

import * as React from "react";
import { useState } from "react";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { StreamPoint } from "@/lib/types/activity";

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

interface MapInnerProps {
  points: StreamPoint[];
  sportColor: string;
  colorMode: ColorMode;
}

const MapInner = React.lazy(async () => {
  ensureLeafletCss();
  const { MapContainer, TileLayer, Polyline, CircleMarker } = await import("react-leaflet");

  function Inner({ points, sportColor, colorMode }: MapInnerProps) {
    const validPoints = points.filter((p) => p.lat != null && p.lng != null);
    if (validPoints.length < 2) return null;

    const positions: [number, number][] = validPoints.map((p) => [p.lat!, p.lng!]);
    const center = positions[Math.floor(positions.length / 2)];

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
        scrollWheelZoom={false}
        attributionControl={false}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        />
        {segments ? (
          segments.map((seg, i) => (
            <Polyline
              key={i}
              positions={seg.pos}
              pathOptions={{ color: seg.color, weight: 4, opacity: 0.9 }}
            />
          ))
        ) : (
          <Polyline
            positions={positions}
            pathOptions={{ color: sportColor, weight: 3.5, opacity: 0.9 }}
          />
        )}
        <CircleMarker
          center={positions[0]}
          radius={7}
          pathOptions={{ color: "#22C55E", fillColor: "#22C55E", fillOpacity: 1, weight: 2 }}
        />
        <CircleMarker
          center={positions[positions.length - 1]}
          radius={7}
          pathOptions={{ color: "#EF4444", fillColor: "#EF4444", fillOpacity: 1, weight: 2 }}
        />
      </MapContainer>
    );
  }

  return { default: Inner };
});

function NoGpsState() {
  return (
    <div
      style={{
        height: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        color: "var(--text-muted)",
        background: "var(--bg-elevated)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <MapPin size={28} style={{ opacity: 0.4 }} />
      <p style={{ fontSize: "var(--text-sm)", margin: 0 }}>No GPS data available</p>
    </div>
  );
}

interface ActivityMapProps {
  points: StreamPoint[] | null;
  sportColor?: string;
}

const COLOR_MODES: { key: ColorMode; label: string }[] = [
  { key: "none", label: "Default" },
  { key: "speed", label: "Speed" },
  { key: "hr", label: "HR" },
  { key: "power", label: "Power" },
  { key: "altitude", label: "Altitude" },
];

export function ActivityMap({ points, sportColor = "#8B5CF6" }: ActivityMapProps) {
  const [colorMode, setColorMode] = useState<ColorMode>("none");

  const hasGps =
    (points?.length ?? 0) > 1 && points?.some((p) => p.lat != null && p.lng != null);

  const availableModes = COLOR_MODES.filter((m) => {
    if (m.key === "none") return true;
    if (!points?.length) return false;
    return points.some((p) => getStreamValue(p, m.key) != null);
  });

  return (
    <Card noPadding>
      <div
        style={{
          padding: "var(--space-4) var(--space-5) var(--space-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Route Map
        </h2>

        {hasGps && availableModes.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Color by:
            </span>
            {availableModes.map((m) => (
              <button
                key={m.key}
                onClick={() => setColorMode(m.key)}
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "1px solid",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  borderColor: colorMode === m.key ? "var(--color-accent)" : "var(--border-default)",
                  background: colorMode === m.key ? "var(--color-accent)" : "transparent",
                  color: colorMode === m.key ? "#fff" : "var(--text-secondary)",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {hasGps && colorMode !== "none" && (
        <div style={{ padding: "0 var(--space-5) var(--space-2)", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
            {colorMode === "speed" ? "Fast" : "Low"}
          </span>
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: "linear-gradient(to right, #3b82f6, #22c55e, #f59e0b, #ef4444)",
            }}
          />
          <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
            {colorMode === "speed" ? "Slow" : "High"}
          </span>
        </div>
      )}

      <div
        style={{
          height: 320,
          borderRadius: "0 0 var(--radius-md) var(--radius-md)",
          overflow: "hidden",
        }}
      >
        {hasGps ? (
          <React.Suspense
            fallback={
              <div
                style={{
                  height: "100%",
                  background: "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "var(--text-sm)",
                }}
              >
                Loading map...
              </div>
            }
          >
            <MapInner points={points!} sportColor={sportColor} colorMode={colorMode} />
          </React.Suspense>
        ) : (
          <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
            <NoGpsState />
          </div>
        )}
      </div>
    </Card>
  );
}
