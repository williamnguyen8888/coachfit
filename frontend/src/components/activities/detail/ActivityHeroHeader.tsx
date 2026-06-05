/**
 * ActivityHeroHeader.tsx
 * Compact 3-zone professional header — dark gradient, mobile-first.
 *
 * Zone 1 — Identity bar: back | sport badge | name (editable) | date | actions
 * Zone 2 — Primary metrics: 4-tile grid (2×2 mobile, 4×1 desktop)
 * Zone 3 — Analytics bar: all secondary stats as compact chips (1 scrollable row)
 */
"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Check,
  ChevronLeft,
  Download,
  Edit3,
  MoreVertical,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";
import type { ActivityDetail, Sport, StreamPoint } from "@/lib/types/activity";
import { fmtClock, fmtPace, fmtSpeedKph } from "@/lib/utils/streamUtils";

// ─── Sport constants ──────────────────────────────────────────────────────────

const SPORT_GRADIENTS: Record<Sport, string> = {
  cycling:  "from-blue-950 via-blue-900 to-slate-900",
  running:  "from-emerald-950 via-emerald-900 to-slate-900",
  swimming: "from-cyan-950 via-cyan-900 to-slate-900",
  strength: "from-orange-950 via-orange-900 to-slate-900",
  hiking:   "from-lime-950 via-lime-900 to-slate-900",
  walking:  "from-violet-950 via-violet-900 to-slate-900",
  other:    "from-slate-900 via-slate-800 to-slate-900",
};

const SPORT_ACCENT: Record<Sport, string> = {
  cycling:  "#3b82f6",
  running:  "#22c55e",
  swimming: "#06b6d4",
  strength: "#f97316",
  hiking:   "#84cc16",
  walking:  "#a78bfa",
  other:    "#8b5cf6",
};

const SPORT_ICONS: Record<Sport, string> = {
  cycling:  "🚴",
  running:  "🏃",
  swimming: "🏊",
  strength: "💪",
  hiking:   "🥾",
  walking:  "🚶",
  other:    "🏋️",
};

// ─── Tile builders ────────────────────────────────────────────────────────────

interface Tile {
  id: string;
  label: string;
  value: string;
  sub?: string;   // smaller line below value
  accent?: boolean;
}

interface Chip {
  id: string;
  label: string;
  value: string;
}

/** 4 primary tiles — sport-specific, always shown (value = "—" when no data) */
function buildPrimaryTiles(a: ActivityDetail): Tile[] {
  const isRun  = a.sport === "running";
  const isSwim = a.sport === "swimming";
  const isStrength = a.sport === "strength";

  // ── Distance tile ──
  const distanceTile: Tile = {
    id: "distance",
    label: isSwim ? "Distance" : "Distance",
    value: a.distanceMeters == null
      ? "—"
      : isSwim
        ? `${Math.round(a.distanceMeters)} m`
        : `${(a.distanceMeters / 1000).toFixed(2)} km`,
  };

  // ── Duration tile ──
  const movingDiff =
    a.movingTimeSeconds != null &&
    a.movingTimeSeconds !== a.durationSeconds &&
    Math.abs(a.durationSeconds - a.movingTimeSeconds) > 30;

  const durationTile: Tile = {
    id: "duration",
    label: "Duration",
    value: fmtClock(a.durationSeconds),
    sub: movingDiff ? `${fmtClock(a.movingTimeSeconds!)} moving` : undefined,
  };

  // ── Speed / Pace tile ──
  let speedTile: Tile;
  if (isRun) {
    speedTile = {
      id: "pace",
      label: "Avg Pace",
      value: a.avgSpeed != null && a.avgSpeed > 0
        ? fmtPace(1000 / a.avgSpeed, "/km")
        : "—",
    };
  } else if (isSwim) {
    speedTile = {
      id: "pace",
      label: "Avg Pace",
      value: a.avgSpeed != null && a.avgSpeed > 0
        ? fmtPace(100 / a.avgSpeed, "/100m")
        : "—",
    };
  } else if (isStrength) {
    speedTile = {
      id: "calories",
      label: "Calories",
      value: a.calories != null ? `${a.calories.toLocaleString()} kcal` : "—",
    };
  } else {
    speedTile = {
      id: "speed",
      label: "Avg Speed",
      value: a.avgSpeed != null && a.avgSpeed > 0 ? fmtSpeedKph(a.avgSpeed) : "—",
    };
  }

  // ── 4th tile — elevation (cycling/running) or HR (others) ──
  let fourthTile: Tile;
  if (!isStrength && a.elevationGainMeters != null && a.elevationGainMeters > 0) {
    fourthTile = {
      id: "elevation",
      label: "Elevation",
      value: `+${Math.round(a.elevationGainMeters)} m`,
    };
  } else if (a.avgHeartRate != null) {
    fourthTile = {
      id: "hr",
      label: "Avg HR",
      value: `${a.avgHeartRate} bpm`,
      sub: a.maxHeartRate != null ? `Max ${a.maxHeartRate}` : undefined,
    };
  } else {
    fourthTile = {
      id: "calories",
      label: "Calories",
      value: a.calories != null ? `${a.calories.toLocaleString()} kcal` : "—",
    };
  }

  return [distanceTile, durationTile, speedTile, fourthTile];
}

/** Secondary chips — all data that didn't fit in primary tiles */
function buildChips(a: ActivityDetail, avgTemp: number | null): Chip[] {
  const chips: Chip[] = [];

  // Training load (highest priority)
  if (a.tss != null) {
    const tssLabel = a.sport === "running" ? "rTSS"
      : a.sport === "swimming" ? "sTSS"
      : "TSS";
    chips.push({ id: "tss", label: tssLabel, value: Math.round(a.tss).toString() });
  }
  if (a.intensityFactor != null) {
    chips.push({ id: "if", label: "IF", value: a.intensityFactor.toFixed(2) });
  }

  // Power
  if (a.normalizedPower != null) {
    chips.push({
      id: "np",
      label: "NP",
      value: `${a.normalizedPower} W`,
    });
  }
  if (a.avgPower != null) {
    chips.push({
      id: "ap",
      label: a.normalizedPower != null ? "AP" : "Avg Power",
      value: `${a.avgPower} W`,
    });
  }
  if (a.maxPower != null) {
    chips.push({ id: "maxpow", label: "Max Power", value: `${a.maxPower} W` });
  }

  // HR (if not already primary)
  if (a.avgHeartRate != null) {
    chips.push({ id: "avghr", label: "Avg HR", value: `${a.avgHeartRate} bpm` });
  }
  if (a.maxHeartRate != null) {
    chips.push({ id: "maxhr", label: "Max HR", value: `${a.maxHeartRate} bpm` });
  }

  // Cadence
  if (a.avgCadence != null) {
    const cadLabel = a.sport === "running" ? "Cadence" : "Cadence";
    const cadUnit  = a.sport === "running" ? " spm" : " rpm";
    chips.push({ id: "cad", label: cadLabel, value: `${a.avgCadence}${cadUnit}` });
  }

  // Elevation (if in primary it's already shown — only add descent-style if elevation was the 4th)
  // Calories (if not already in primary tiles)
  if (a.calories != null && a.sport !== "strength") {
    chips.push({ id: "cal", label: "Calories", value: `${a.calories.toLocaleString()} kcal` });
  }

  // Temperature
  if (avgTemp != null) {
    chips.push({ id: "temp", label: "Temp", value: `${avgTemp}°C` });
  }

  // Moving time (if different, and not already sub-text of duration in primary)
  // It IS already shown as sub of duration tile, so skip here

  return chips;
}

function avgTemperature(points: StreamPoint[]): number | null {
  const temps = points
    .filter((p) => p.temperature != null && Number.isFinite(p.temperature))
    .map((p) => p.temperature!);
  if (temps.length === 0) return null;
  return Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  activity: ActivityDetail;
  points: StreamPoint[];
  onBack: () => void;
  onSaveName: (name: string) => Promise<void>;
  onDelete: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityHeroHeader({ activity, points, onBack, onSaveName, onDelete }: Props) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(activity.name ?? "");
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const sportColor  = SPORT_ACCENT[activity.sport] ?? SPORT_ACCENT.other;
  const gradient    = SPORT_GRADIENTS[activity.sport] ?? SPORT_GRADIENTS.other;
  const primaryTiles = buildPrimaryTiles(activity);
  const avgTemp      = avgTemperature(points);
  const chips        = buildChips(activity, avgTemp);

  const dateFormatted = new Date(activity.startedAt).toLocaleDateString("en-US", {
    weekday: "short",
    month:   "short",
    day:     "numeric",
    year:    "numeric",
  });
  const timeFormatted = new Date(activity.startedAt).toLocaleTimeString("en-US", {
    hour:   "2-digit",
    minute: "2-digit",
  });

  // ── Name editing ──
  const startEdit = useCallback(() => {
    setNameValue(activity.name ?? "");
    setEditingName(true);
  }, [activity.name]);

  const cancelEdit = useCallback(() => {
    setEditingName(false);
    setNameValue(activity.name ?? "");
  }, [activity.name]);

  const commitEdit = useCallback(async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === activity.name) { setEditingName(false); return; }
    setSaving(true);
    try {
      await onSaveName(trimmed);
      setEditingName(false);
    } finally {
      setSaving(false);
    }
  }, [nameValue, activity.name, onSaveName]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${gradient}`}
      style={{
        backgroundImage: `radial-gradient(ellipse at 70% 0%, ${sportColor}28 0%, transparent 55%)`,
        borderBottom: `1px solid rgba(255,255,255,0.08)`,
      }}
    >
      {/* ── ZONE 1: Identity bar ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 sm:px-4 sm:pt-4">

        {/* Back */}
        <button
          id="hero-back-btn"
          onClick={onBack}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 backdrop-blur transition-all hover:bg-white/20 hover:text-white"
          aria-label="Back"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Sport badge */}
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 backdrop-blur"
          style={{ borderColor: `${sportColor}50` }}
        >
          <span className="text-sm leading-none">{SPORT_ICONS[activity.sport] ?? "🏋️"}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
            {activity.sport}
            {activity.subSport ? ` · ${activity.subSport}` : ""}
          </span>
        </div>

        {/* Name — takes remaining space */}
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-1.5">
              <input
                id="activity-name-input"
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                className="min-w-0 flex-1 rounded-md border border-white/30 bg-white/10 px-2 py-1 text-sm font-semibold text-white placeholder-white/40 outline-none backdrop-blur focus:border-white/60"
                placeholder="Activity name"
                disabled={saving}
              />
              <button
                id="name-save-btn"
                onClick={() => void commitEdit()}
                disabled={saving}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-400 disabled:opacity-50"
              >
                <Check size={12} />
              </button>
              <button
                id="name-cancel-btn"
                onClick={cancelEdit}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/70 hover:bg-white/20"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <h1 className="truncate text-sm font-bold text-white sm:text-base">
                {activity.name || `${activity.sport.charAt(0).toUpperCase() + activity.sport.slice(1)} Activity`}
              </h1>
              <button
                id="name-edit-btn"
                onClick={startEdit}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/80"
                aria-label="Edit name"
              >
                <Edit3 size={11} />
              </button>
            </div>
          )}
          {/* Date + time */}
          <p className="mt-0.5 truncate text-[11px] text-white/45">
            {dateFormatted} · {timeFormatted}
            {activity.source && activity.source !== "upload" && (
              <span className="capitalize"> · {activity.source}</span>
            )}
            {activity.rawFileFormat && (
              <span className="font-mono uppercase"> · {activity.rawFileFormat}</span>
            )}
          </p>
        </div>

        {/* Actions — download + "..." menu */}
        <div className="relative flex shrink-0 items-center gap-1.5">
          <button
            id="hero-download-btn"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/80 backdrop-blur transition-all hover:bg-white/20"
            aria-label="Download file"
          >
            <Download size={14} />
          </button>
          <button
            id="hero-more-btn"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white/80 backdrop-blur transition-all hover:bg-white/20"
            aria-label="More actions"
          >
            <MoreVertical size={14} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 z-20 min-w-[140px] overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur">
                <button
                  id="menu-delete-btn"
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                  Delete activity
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── ZONE 2: Primary metric tiles (2×2 mobile → 4×1 md+) ──────── */}
      <div
        className="mt-1 grid grid-cols-2 border-t border-white/10 md:grid-cols-4"
        style={{ borderTopColor: `${sportColor}30` }}
      >
        {primaryTiles.map((tile, i) => (
          <div
            key={tile.id}
            className={[
              "flex flex-col gap-0.5 px-4 py-3",
              // vertical divider between tiles
              i < 3 ? "md:border-r border-white/8" : "",
              // on mobile 2×2: right border for col-0, bottom border for row-0
              i % 2 === 0 ? "border-r border-white/8 md:border-r-0" : "",
              i < 2 ? "border-b border-white/8 md:border-b-0" : "",
            ].join(" ")}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">
              {tile.label}
            </span>
            <span
              className="text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl"
              style={tile.accent ? { color: sportColor } : undefined}
            >
              {tile.value}
            </span>
            {tile.sub && (
              <span className="text-[10px] font-medium text-white/40">{tile.sub}</span>
            )}
          </div>
        ))}
      </div>

      {/* ── ZONE 3: Analytics chips (only renders when there is data) ──── */}
      {chips.length > 0 && (
        <div
          className="flex items-center gap-0 overflow-x-auto border-t border-white/8 scrollbar-none"
          style={{ borderTopColor: `${sportColor}20` }}
        >
          {chips.map((chip, i) => (
            <React.Fragment key={chip.id}>
              {i > 0 && <span className="shrink-0 text-[10px] text-white/20">·</span>}
              <div className="flex shrink-0 items-baseline gap-1 px-3 py-2">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/35">
                  {chip.label}
                </span>
                <span className="text-xs font-bold text-white/80">{chip.value}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
