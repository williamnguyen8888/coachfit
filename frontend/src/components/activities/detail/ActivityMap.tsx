"use client";

/**
 * ActivityMap — renders the GPS route using react-leaflet.
 *
 * Falls back gracefully when:
 *  - No GPS points in the stream data
 *  - react-leaflet not available (SSR)
 *
 * Design: dark CartoDB tile layer matching the OLED theme.
 * Sport-colored polyline. Start (green) / End (red) markers.
 */

import * as React from "react";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { StreamPoint } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Leaflet CSS injection                                               */
/* ------------------------------------------------------------------ */

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

function ensureLeafletCss() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${LEAFLET_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = LEAFLET_CSS;
  document.head.appendChild(link);
}

/* ------------------------------------------------------------------ */
/*  Lazy-loaded map inner component                                      */
/* ------------------------------------------------------------------ */

interface MapInnerProps {
  points: StreamPoint[];
  sportColor: string;
}

const MapInner = React.lazy(async () => {
  ensureLeafletCss();
  const { MapContainer, TileLayer, Polyline, CircleMarker } = await import("react-leaflet");

  function Inner({ points, sportColor }: MapInnerProps) {
    const validPoints = points.filter((p) => p.lat != null && p.lng != null);
    if (validPoints.length < 2) return null;

    const positions: [number, number][] = validPoints.map((p) => [p.lat!, p.lng!]);
    const center = positions[Math.floor(positions.length / 2)];

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
        <Polyline
          positions={positions}
          pathOptions={{ color: sportColor, weight: 3.5, opacity: 0.9 }}
        />
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

/* ------------------------------------------------------------------ */
/*  No GPS empty state                                                   */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  ActivityMap                                                          */
/* ------------------------------------------------------------------ */

interface ActivityMapProps {
  points: StreamPoint[] | null;
  sportColor?: string;
}

export function ActivityMap({ points, sportColor = "#8B5CF6" }: ActivityMapProps) {
  const hasGps =
    (points?.length ?? 0) > 1 && points?.some((p) => p.lat != null && p.lng != null);

  return (
    <Card noPadding>
      <div style={{ padding: "var(--space-5) var(--space-5) var(--space-4)" }}>
        <h2 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Route Map
        </h2>
      </div>

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
                Loading map…
              </div>
            }
          >
            <MapInner points={points!} sportColor={sportColor} />
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
