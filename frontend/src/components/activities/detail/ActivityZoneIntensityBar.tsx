/**
 * ActivityZoneIntensityBar.tsx
 * Compact zone-distribution overview bar — shows time-in-zone proportions
 * as a colored segmented bar + legend. Displayed prominently below the hero.
 * Works for power, HR, and pace zones.
 *
 * When no zones are configured, shows a subtle hint instead of disappearing silently.
 */
"use client";

import * as React from "react";
import { useMemo } from "react";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type { StreamPoint, Sport } from "@/lib/types/activity";
import type { SportZones, ZoneDefinition } from "@/lib/types/settings";
import { buildSeries, fmtDuration } from "@/lib/utils/streamUtils";

const ZONE_COLORS = [
  "#64748b", // Z1 — recovery (gray-blue)
  "#3b82f6", // Z2 — endurance (blue)
  "#22c55e", // Z3 — tempo (green)
  "#f59e0b", // Z4 — threshold (amber)
  "#ef4444", // Z5 — VO2max (red)
  "#9333ea", // Z6 — anaerobic (purple)
  "#ec4899", // Z7 — sprint (pink)
];

interface Props {
  points: StreamPoint[];
  sport: Sport;
  powerZones: SportZones | null;
  hrZones: SportZones | null;
  /** If true, shows a hint when no zones are configured (default: true) */
  showHintWhenEmpty?: boolean;
}

interface ZoneSlice {
  zone: number;
  name: string;
  seconds: number;
  pct: number;
  color: string;
}

function buildZoneSlices(
  series: { value: number; duration: number }[],
  zones: ZoneDefinition[],
): ZoneSlice[] {
  const sorted = [...zones].sort((a, b) => a.zone - b.zone);
  const durationMap = new Map<number, number>();
  for (const band of sorted) durationMap.set(band.zone, 0);

  for (const s of series) {
    const band = sorted.find((b, idx) => {
      const min = b.min ?? Number.NEGATIVE_INFINITY;
      const max = b.max ?? Number.POSITIVE_INFINITY;
      const isLast = idx === sorted.length - 1;
      return s.value >= min && (isLast ? s.value <= max : s.value < max);
    });
    if (band) durationMap.set(band.zone, (durationMap.get(band.zone) ?? 0) + s.duration);
  }

  const total = Array.from(durationMap.values()).reduce((a, b) => a + b, 0);
  return sorted.map((band) => {
    const secs = durationMap.get(band.zone) ?? 0;
    return {
      zone: band.zone,
      name: band.name,
      seconds: secs,
      pct: total > 0 ? (secs / total) * 100 : 0,
      color: ZONE_COLORS[(band.zone - 1) % ZONE_COLORS.length],
    };
  });
}

export function ActivityZoneIntensityBar({
  points,
  sport,
  powerZones,
  hrZones,
  showHintWhenEmpty = true,
}: Props) {
  const router = useRouter();

  const powerSlices = useMemo(() => {
    if (!powerZones?.zones?.length) return [];
    const series = buildSeries(points, (p) => p.power, 0);
    return buildZoneSlices(series, powerZones.zones);
  }, [points, powerZones]);

  const hrSlices = useMemo(() => {
    if (!hrZones?.zones?.length) return [];
    const series = buildSeries(points, (p) => p.hr, 0);
    return buildZoneSlices(series, hrZones.zones);
  }, [points, hrZones]);

  const slices = powerSlices.length > 0 ? powerSlices : hrSlices;
  const label = powerSlices.length > 0 ? "Power Zones" : hrSlices.length > 0 ? "HR Zones" : null;

  // No zones configured — show hint instead of silently disappearing
  if (slices.length === 0 || !label) {
    if (!showHintWhenEmpty) return null;
    return (
      <div className="shrink-0 border-b border-border-subtle bg-bg-elevated/20 px-4 py-2 sm:px-6">
        <div className="flex items-center gap-2">
          <Settings size={12} className="shrink-0 text-text-muted" />
          <p className="text-[11px] text-text-muted">
            Configure training zones to see zone distribution —{" "}
            <button
              onClick={() => router.push("/settings")}
              className="font-semibold text-accent/70 underline-offset-2 hover:text-accent hover:underline"
            >
              Open Settings
            </button>
          </p>
        </div>
      </div>
    );
  }

  const hasData = slices.some((s) => s.pct > 0);
  if (!hasData) return null;

  return (
    <div
      className="shrink-0 border-b border-border-subtle bg-bg-elevated/30 px-4 py-2.5 sm:px-6"
    >
      <div className="flex items-center gap-3">
        {/* Label */}
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-text-muted">
          {label}
        </span>

        {/* Segmented bar */}
        <div className="flex h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-bg-input">
          {slices.map(
            (s) =>
              s.pct > 0.5 && (
                <div
                  key={s.zone}
                  title={`Z${s.zone} ${s.name}: ${fmtDuration(s.seconds)} (${s.pct.toFixed(1)}%)`}
                  style={{ width: `${s.pct}%`, background: s.color }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              ),
          )}
        </div>

        {/* Zone legend chips */}
        <div className="hidden items-center gap-2 sm:flex">
          {slices
            .filter((s) => s.pct > 2)
            .map((s) => (
              <div key={s.zone} className="flex items-center gap-1">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-[11px] font-semibold text-text-muted">
                  Z{s.zone} {s.pct.toFixed(0)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
