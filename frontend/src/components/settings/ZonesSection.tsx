"use client";
// src/components/settings/ZonesSection.tsx
// Training zones settings — per-sport FTP/LTHR/pace configuration and zone table.
// API: GET /athlete/zones · PUT /athlete/zones/{sport}

import React, { useState, useCallback } from "react";
import { useQuery } from "@/hooks/useQuery";
import { zonesService } from "@/lib/services/settings";
import { Button } from "@/components/ui/Button";
import { Input, InputGroup } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Save, CheckCircle, Zap, HeartPulse, Timer } from "lucide-react";
import type { Sport, SportZones, ZonesResponse } from "@/lib/types/settings";

/* ─── Zone colors (aligned to design system doc) ─────────────────────────── */

const ZONE_COLORS: Record<number, string> = {
  1: "#60A5FA", // Recovery — Light Blue
  2: "#34D399", // Endurance — Green
  3: "#FBBF24", // Tempo — Yellow
  4: "#FB923C", // Threshold — Orange
  5: "#F87171", // VO2max — Red
  6: "#C084FC", // Anaerobic — Purple
  7: "#F472B6", // Neuromuscular — Pink
};

const ZONE_NAMES: Record<number, string> = {
  1: "Recovery",
  2: "Endurance",
  3: "Tempo",
  4: "Threshold",
  5: "VO2max",
  6: "Anaerobic",
  7: "Neuromuscular",
};

const SPORTS_WITH_ZONES: { value: Sport; label: string; emoji: string }[] = [
  { value: "cycling", label: "Cycling", emoji: "🚴" },
  { value: "running", label: "Running", emoji: "🏃" },
  { value: "swimming", label: "Swimming", emoji: "🏊" },
];

/* ─── Zone row ───────────────────────────────────────────────────────────── */

function ZoneRow({
  zone,
  sport,
  sportData,
}: {
  zone: number;
  sport: Sport;
  sportData: SportZones | null;
}) {
  const color = ZONE_COLORS[zone];
  const name = ZONE_NAMES[zone];
  const z = sportData?.zones?.find((z) => z.zone === zone);

  const hasPower = sport === "cycling" && (sportData?.ftpWatts ?? 0) > 0;
  const hasPace = sport === "running" && sportData?.thresholdPace;

  function pctRange(lo: number, hi: number) {
    const ftp = sportData?.ftpWatts ?? 0;
    if (!ftp) return null;
    return `${Math.round(lo * ftp)}–${Math.round(hi * ftp)}W`;
  }

  // Default % ranges by zone (common training zones model)
  const PCT_RANGES: Record<number, [number, number]> = {
    1: [0, 0.55],
    2: [0.55, 0.75],
    3: [0.75, 0.87],
    4: [0.87, 1.0],
    5: [1.0, 1.12],
    6: [1.12, 1.3],
    7: [1.3, 2.0],
  };
  const pct = PCT_RANGES[zone];
  const derivedWatts = hasPower && pct ? pctRange(pct[0], pct[1]) : null;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-elevated)]"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Zone badge */}
      <div
        className="flex items-center justify-center rounded-[var(--radius-sm)] shrink-0 font-metric font-bold"
        style={{
          width: 32,
          height: 32,
          background: `color-mix(in srgb, ${color} 15%, var(--bg-surface))`,
          border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
          color,
          fontSize: "var(--text-sm)",
        }}
      >
        Z{zone}
      </div>

      {/* Name */}
      <div style={{ minWidth: 100, flex: 1 }}>
        <span
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {name}
        </span>
      </div>

      {/* HR range */}
      {(z?.minBpm || z?.maxBpm) && (
        <div
          className="hidden sm:flex items-center gap-1"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          <HeartPulse size={11} />
          {z.minBpm ?? "–"}–{z.maxBpm ?? "∞"} bpm
        </div>
      )}

      {/* Power range (cycling only) */}
      {derivedWatts && (
        <div
          className="hidden md:flex items-center gap-1"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          <Zap size={11} />
          {derivedWatts}
        </div>
      )}

      {/* Pace range (running) */}
      {hasPace && (z?.minPace || z?.maxPace) && (
        <div
          className="hidden sm:flex items-center gap-1"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          <Timer size={11} />
          {z?.minPace ?? "–"} – {z?.maxPace ?? "–"}/km
        </div>
      )}

      {/* Color bar */}
      <div
        className="shrink-0 rounded-full"
        style={{ width: 6, height: 28, background: color, opacity: 0.75 }}
      />
    </div>
  );
}

/* ─── Sport zones editor ──────────────────────────────────────────────────── */

function SportZonesEditor({
  sport,
  data,
  onSaved,
}: {
  sport: Sport;
  data: SportZones | null;
  onSaved: () => void;
}) {
  const [ftp, setFtp] = useState(data?.ftpWatts ? String(data.ftpWatts) : "");
  const [lthr, setLthr] = useState(data?.lthrBpm ? String(data.lthrBpm) : "");
  const [maxHr, setMaxHr] = useState(data?.maxHrBpm ? String(data.maxHrBpm) : "");
  const [pace, setPace] = useState(data?.thresholdPace ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await zonesService.update(sport, {
        ftpWatts: ftp ? parseInt(ftp) : null,
        lthrBpm: lthr ? parseInt(lthr) : null,
        maxHrBpm: maxHr ? parseInt(maxHr) : null,
        thresholdPace: pace || null,
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save zones");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* Anchor metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[var(--space-3)]">
        {sport === "cycling" && (
          <InputGroup label="FTP (Watts)" htmlFor={`${sport}-ftp`}>
            <Input
              id={`${sport}-ftp`}
              type="number"
              min={50}
              max={600}
              value={ftp}
              onChange={(e) => setFtp(e.target.value)}
              placeholder="e.g. 280"
              leftAdornment={<Zap size={13} />}
            />
          </InputGroup>
        )}

        {sport === "running" && (
          <InputGroup label="Threshold pace" htmlFor={`${sport}-pace`}>
            <Input
              id={`${sport}-pace`}
              value={pace}
              onChange={(e) => setPace(e.target.value)}
              placeholder="mm:ss"
              leftAdornment={<Timer size={13} />}
            />
          </InputGroup>
        )}

        <InputGroup label="LTHR (bpm)" htmlFor={`${sport}-lthr`}>
          <Input
            id={`${sport}-lthr`}
            type="number"
            min={100}
            max={220}
            value={lthr}
            onChange={(e) => setLthr(e.target.value)}
            placeholder="e.g. 165"
            leftAdornment={<HeartPulse size={13} />}
          />
        </InputGroup>

        <InputGroup label="Max HR (bpm)" htmlFor={`${sport}-maxhr`}>
          <Input
            id={`${sport}-maxhr`}
            type="number"
            min={100}
            max={220}
            value={maxHr}
            onChange={(e) => setMaxHr(e.target.value)}
            placeholder="e.g. 190"
          />
        </InputGroup>
      </div>

      {/* Zone table */}
      <div
        className="rounded-[var(--radius-md)] overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-elevated)",
          }}
        >
          <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Zones (derived from anchor metrics)
          </span>
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((z) => (
          <ZoneRow key={z} zone={z} sport={sport} sportData={data} />
        ))}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          id={`zones-save-${sport}`}
          variant="primary"
          size="sm"
          loading={saving}
          leftIcon={saved ? <CheckCircle size={14} /> : <Save size={14} />}
          onClick={handleSave}
        >
          {saved ? "Saved" : "Save zones"}
        </Button>
        {err && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-danger)" }}>
            {err}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Main section ────────────────────────────────────────────────────────── */

export function ZonesSection() {
  const { data, loading, refetch } = useQuery<ZonesResponse>("/athlete/zones");
  const [activeSport, setActiveSport] = useState<Sport>("cycling");

  const getSportData = useCallback(
    (sport: Sport): SportZones | null =>
      data?.find((z) => z.sport === sport) ?? null,
    [data],
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--space-4)]">
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} height="36px" width="90px" />
          ))}
        </div>
        <Skeleton height="200px" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {/* Sport tabs */}
      <div className="flex gap-2 flex-wrap">
        {SPORTS_WITH_ZONES.map((s) => {
          const isActive = activeSport === s.value;
          return (
            <button
              key={s.value}
              id={`zones-tab-${s.value}`}
              type="button"
              onClick={() => setActiveSport(s.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] transition-all duration-150 border font-medium"
              style={{
                fontSize: "var(--text-sm)",
                background: isActive
                  ? "color-mix(in srgb, var(--color-accent) 15%, var(--bg-surface))"
                  : "var(--bg-input)",
                borderColor: isActive ? "var(--color-accent)" : "var(--border-default)",
                color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <span>{s.emoji}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Editor */}
      <SportZonesEditor
        key={activeSport}
        sport={activeSport}
        data={getSportData(activeSport)}
        onSaved={refetch}
      />
    </div>
  );
}
