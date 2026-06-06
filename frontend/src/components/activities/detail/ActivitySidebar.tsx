/**
 * ActivitySidebar.tsx
 * Premium sticky right sidebar for the Activity Detail page.
 *
 * Sections (top → bottom):
 *   1. Training Load — TSS arc gauge + NP / IF / TE metrics
 *   2. Key Metrics   — compact stat list (HR, speed, cadence, calories, elevation)
 *   3. Notes         — inline editable description (moved from main panel)
 *
 * Only renders on desktop (lg+). Mobile users see notes inline at bottom of main.
 */
"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Activity,
  BarChart3,
  Edit3,
  Heart,
  Loader2,
  Mountain,
  Save,
  Thermometer,
  X,
  Zap,
} from "lucide-react";
import type { ActivityDetail } from "@/lib/types/activity";
import { fmtClock, fmtPace, fmtSpeedKph } from "@/lib/utils/streamUtils";
import { activitiesService } from "@/lib/services/activities";

// ─── TSS Gauge ────────────────────────────────────────────────────────────────

/**
 * Arc gauge for TSS — 0–300+ scale.
 * Semi-circle arc (220° sweep) centred so nothing clips.
 */
function TSSGauge({ tss }: { tss: number }) {
  const capped = Math.min(tss, 300);
  const pct    = capped / 300;

  // SVG canvas
  const W  = 120;   // viewBox width
  const H  = 82;    // viewBox height  (enough for top arc + label below)
  const cx = W / 2; // 60
  const cy = 64;    // centre lower so arc top is inside viewBox
  const r  = 48;

  // Arc: starts bottom-left, sweeps 220°
  const GAP        = 140; // degrees of gap at the bottom
  const SWEEP      = 360 - GAP; // 220°
  const startAngle = 90 + GAP / 2;  // 160° (bottom-left)
  const endAngle   = startAngle + SWEEP; // 380° = 20° (bottom-right)

  function toXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcD(from: number, to: number) {
    if (Math.abs(to - from) < 0.1) return "";
    const s = toXY(from);
    const e = toXY(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  }

  const fillDeg  = startAngle + SWEEP * pct;

  // colour by intensity
  const color =
    tss < 100 ? "#22c55e"
    : tss < 150 ? "#3b82f6"
    : tss < 200 ? "#f59e0b"
    : "#ef4444";

  const label =
    tss < 100  ? "Low"
    : tss < 150 ? "Moderate"
    : tss < 200 ? "High"
    : "Very High";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ overflow: "visible" }}
      >
        {/* Track */}
        <path
          d={arcD(startAngle, endAngle)}
          fill="none"
          stroke="#1e1e2e"
          strokeWidth={9}
          strokeLinecap="round"
        />
        {/* Fill */}
        {pct > 0.01 && (
          <path
            d={arcD(startAngle, fillDeg)}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 5px ${color}88)` }}
          />
        )}

        {/* TSS value — centred inside arc */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#e8e8ed"
          fontSize={22}
          fontWeight={800}
          fontFamily="JetBrains Mono, monospace"
        >
          {Math.round(tss)}
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#5a5a6e"
          fontSize={8}
          fontWeight={700}
          letterSpacing={2}
        >
          TSS
        </text>
      </svg>

      {/* Label badge */}
      <span
        className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ color, background: `${color}1a` }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────

interface NotesProps {
  activityId: string;
  description: string | null;
  onSaved: (desc: string | null) => void;
}

function SidebarNotes({ activityId, description, onSaved }: NotesProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description ?? "");
  const [saving, setSaving] = useState(false);

  const startEdit = useCallback(() => {
    setValue(description ?? "");
    setEditing(true);
  }, [description]);

  const cancel = useCallback(() => {
    setEditing(false);
    setValue(description ?? "");
  }, [description]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const trimmed = value.trim() || null;
      await activitiesService.update(activityId, { description: trimmed ?? undefined });
      onSaved(trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [activityId, value, onSaved]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
          Notes
        </span>
        {!editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
          >
            <Edit3 size={10} />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-border-default bg-bg-input px-3 py-2.5 text-xs text-text-primary placeholder-text-muted outline-none transition-colors focus:border-accent/50"
            placeholder="Add notes about this session…"
            disabled={saving}
          />
          <div className="flex gap-2">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancel}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border-subtle px-3 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-bg-elevated"
            >
              <X size={11} />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={startEdit}
          className="min-h-[60px] cursor-text rounded-lg border border-dashed border-border-subtle px-3 py-2.5 text-xs leading-relaxed text-text-secondary transition-colors hover:border-border-default hover:bg-bg-elevated/30"
        >
          {description ? (
            <span className="whitespace-pre-wrap">{description}</span>
          ) : (
            <span className="italic text-text-muted">Click to add session notes…</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  activity: ActivityDetail;
  avgTemperature: number | null;
  onDescriptionSaved: (desc: string | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivitySidebar({ activity, avgTemperature, onDescriptionSaved }: Props) {
  const a = activity;

  // Build secondary metric rows
  interface MetricRow {
    id: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
  }

  const metrics: MetricRow[] = [];

  if (a.avgHeartRate != null) {
    metrics.push({
      id: "hr",
      icon: <Heart size={13} />,
      label: "Avg HR",
      value: `${a.avgHeartRate} bpm`,
      color: "#ef4444",
    });
  }
  if (a.maxHeartRate != null) {
    metrics.push({
      id: "maxhr",
      icon: <Heart size={13} />,
      label: "Peak HR",
      value: `${a.maxHeartRate} bpm`,
      color: "#f87171",
    });
  }
  if (a.avgPower != null) {
    metrics.push({
      id: "ap",
      icon: <Zap size={13} />,
      label: "Avg Power",
      value: `${a.avgPower} W`,
      color: "#3b82f6",
    });
  }
  if (a.maxPower != null) {
    metrics.push({
      id: "maxp",
      icon: <Zap size={13} />,
      label: "Peak Power",
      value: `${a.maxPower} W`,
      color: "#60a5fa",
    });
  }
  if (a.avgSpeed != null && a.avgSpeed > 0) {
    const isRun = a.sport === "running";
    const isSwim = a.sport === "swimming";
    metrics.push({
      id: "speed",
      icon: <Activity size={13} />,
      label: isRun ? "Avg Pace" : isSwim ? "Avg Pace" : "Avg Speed",
      value: isRun
        ? fmtPace(1000 / a.avgSpeed, "/km")
        : isSwim
        ? fmtPace(100 / a.avgSpeed, "/100m")
        : fmtSpeedKph(a.avgSpeed),
      color: "#22c55e",
    });
  }
  if (a.avgCadence != null) {
    const unit = a.sport === "swimming" ? "spm" : a.sport === "running" ? "spm" : "rpm";
    metrics.push({
      id: "cad",
      icon: <Activity size={13} />,
      label: "Cadence",
      value: `${a.avgCadence} ${unit}`,
      color: "#a78bfa",
    });
  }
  if (a.elevationGainMeters != null && a.elevationGainMeters > 0) {
    metrics.push({
      id: "elev",
      icon: <Mountain size={13} />,
      label: "Elevation",
      value: `+${Math.round(a.elevationGainMeters)} m`,
      color: "#34d399",
    });
  }
  if (a.calories != null) {
    metrics.push({
      id: "cal",
      icon: <BarChart3 size={13} />,
      label: "Calories",
      value: `${a.calories.toLocaleString()} kcal`,
      color: "#f59e0b",
    });
  }
  if (a.movingTimeSeconds != null && a.movingTimeSeconds !== a.durationSeconds) {
    metrics.push({
      id: "movt",
      icon: <Activity size={13} />,
      label: "Moving Time",
      value: fmtClock(a.movingTimeSeconds),
      color: "#8b5cf6",
    });
  }
  if (avgTemperature != null) {
    metrics.push({
      id: "temp",
      icon: <Thermometer size={13} />,
      label: "Avg Temp",
      value: `${avgTemperature}°C`,
      color: "#fb923c",
    });
  }

  const hasTSS = a.tss != null;
  const hasNP  = a.normalizedPower != null;
  const hasIF  = a.intensityFactor != null;
  const hasTE  = a.aerobicTrainingEffect != null || a.anaerobicTrainingEffect != null;
  const hasTrainingLoad = hasTSS || hasNP || hasIF || hasTE;

  return (
    <aside
      id="activity-sidebar"
      className="hidden lg:flex w-[272px] shrink-0 flex-col overflow-y-auto border-l border-border-subtle bg-bg-surface"
    >
      <div className="flex flex-col gap-4 p-4">

        {/* ── Training Load ─────────────────────────────────────── */}
        {hasTrainingLoad && (
          <section className="rounded-xl border border-border-subtle bg-bg-elevated/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 size={13} className="text-text-muted" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Training Load
              </span>
            </div>

            {/* TSS Gauge — pt-2 gives room for the arc glow at the top */}
            {hasTSS && (
              <div className="mb-4 flex justify-center pt-2">
                <TSSGauge tss={a.tss!} />
              </div>
            )}

            {/* NP / IF / TE rows */}
            <div className="flex flex-col gap-0.5">
              {hasNP && (
                <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-bg-input/50">
                  <div className="flex items-center gap-2">
                    <Zap size={11} className="text-blue-400" />
                    <span className="text-[11px] text-text-secondary">Normalized Power</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {a.normalizedPower} W
                  </span>
                </div>
              )}
              {hasIF && (
                <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-bg-input/50">
                  <div className="flex items-center gap-2">
                    <BarChart3 size={11} className="text-violet-400" />
                    <span className="text-[11px] text-text-secondary">Intensity Factor</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-violet-400">
                    {a.intensityFactor!.toFixed(2)}
                  </span>
                </div>
              )}
              {a.aerobicTrainingEffect != null && (
                <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-bg-input/50">
                  <div className="flex items-center gap-2">
                    <Heart size={11} className="text-emerald-400" />
                    <span className="text-[11px] text-text-secondary">Aerobic TE</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {a.aerobicTrainingEffect.toFixed(1)}/5.0
                  </span>
                </div>
              )}
              {a.anaerobicTrainingEffect != null && (
                <div className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-bg-input/50">
                  <div className="flex items-center gap-2">
                    <Heart size={11} className="text-rose-400" />
                    <span className="text-[11px] text-text-secondary">Anaerobic TE</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-400">
                    {a.anaerobicTrainingEffect.toFixed(1)}/5.0
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Key Metrics ───────────────────────────────────────── */}
        {metrics.length > 0 && (
          <section className="rounded-xl border border-border-subtle bg-bg-elevated/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity size={13} className="text-text-muted" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                Key Metrics
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {metrics.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg px-2.5 py-1.5 transition-colors hover:bg-bg-input/50"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: m.color }}>{m.icon}</span>
                    <span className="text-[11px] text-text-secondary">{m.label}</span>
                  </div>
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: m.color }}
                  >
                    {m.value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Notes ─────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border-subtle bg-bg-elevated/40 p-4">
          <SidebarNotes
            activityId={a.id}
            description={a.description}
            onSaved={onDescriptionSaved}
          />
        </section>

      </div>
    </aside>
  );
}
