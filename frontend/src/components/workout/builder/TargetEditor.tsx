"use client";

/**
 * TargetEditor — popover modal for editing a step's training target.
 *
 * Supports the full target type matrix from docs/07-workout-data-model.md:
 *   power_zone  | power_pct | hr_zone | pace | rpe | open
 *
 * Cycling:  power targets preferred
 * Running:  pace / HR targets
 * All:      HR, RPE, open
 */

import * as React from "react";
import { Target, X, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { StepTarget, TargetType } from "@/lib/types/workout";
import type { Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Target meta                                                          */
/* ------------------------------------------------------------------ */

interface TargetMeta {
  type: TargetType;
  label: string;
  sports: Sport[] | "all";
}

const TARGET_TYPES: TargetMeta[] = [
  { type: "power_zone", label: "Power Zone", sports: ["cycling"] },
  { type: "power_pct", label: "% FTP", sports: ["cycling", "running", "swimming"] },
  { type: "hr_zone", label: "HR Zone", sports: "all" },
  { type: "pace", label: "Pace", sports: ["running"] },
  { type: "cadence", label: "RPE (1–10)", sports: "all" }, // repurposed as RPE
  { type: "open", label: "Open / No target", sports: "all" },
];

const ZONE_COLORS: Record<number, string> = {
  1: "#60A5FA",
  2: "#34D399",
  3: "#FBBF24",
  4: "#FB923C",
  5: "#F87171",
  6: "#C084FC",
  7: "#F472B6",
};

const ZONE_NAMES: Record<number, string> = {
  1: "Z1 Recovery",
  2: "Z2 Endurance",
  3: "Z3 Tempo",
  4: "Z4 Threshold",
  5: "Z5 VO₂max",
  6: "Z6 Anaerobic",
  7: "Z7 Neuro",
};

/* ------------------------------------------------------------------ */
/*  Props                                                                */
/* ------------------------------------------------------------------ */

interface TargetEditorProps {
  value: StepTarget;
  sport: Sport;
  onSave: (t: StepTarget) => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Shared number input                                                  */
/* ------------------------------------------------------------------ */

function NumInput({
  label,
  id,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  id: string;
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          height: 36,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-default)",
          background: "var(--bg-input)",
          color: "var(--text-primary)",
          padding: "0 10px",
          fontSize: "var(--text-sm)",
          fontFamily: "var(--font-mono, monospace)",
          outline: "none",
          textAlign: "right",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pace input helper (MM:SS)                                            */
/* ------------------------------------------------------------------ */

function PaceInput({
  label,
  id,
  value,
  onChange,
}: {
  label: string;
  id: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const mins = Math.floor(value / 60);
  const secs = value % 60;
  const [minStr, setMinStr] = React.useState(mins.toString());
  const [secStr, setSecStr] = React.useState(secs.toString().padStart(2, "0"));

  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setMinStr(mins.toString());
    setSecStr(secs.toString().padStart(2, "0"));
  }

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMinStr(val);
    const m = parseInt(val, 10) || 0;
    const s = parseInt(secStr, 10) || 0;
    onChange(m * 60 + s);
  };

  const handleSecChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const sVal = parseInt(val, 10) || 0;
    if (sVal >= 60) val = "59";
    setSecStr(val);
    const m = parseInt(minStr, 10) || 0;
    const s = parseInt(val, 10) || 0;
    onChange(m * 60 + s);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
      <label htmlFor={id} style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", fontWeight: 500 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          id={id}
          type="number"
          min={0}
          max={99}
          value={minStr}
          onChange={handleMinChange}
          placeholder="min"
          style={{
            height: 36,
            width: "60px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            padding: "0 8px",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-mono, monospace)",
            textAlign: "center",
            outline: "none",
          }}
        />
        <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={secStr}
          onChange={handleSecChange}
          placeholder="sec"
          style={{
            height: 36,
            width: "60px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            padding: "0 8px",
            fontSize: "var(--text-sm)",
            fontFamily: "var(--font-mono, monospace)",
            textAlign: "center",
            outline: "none",
          }}
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginLeft: 4 }}>/km</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function TargetEditor({ value, sport, onSave, onClose }: TargetEditorProps) {
  const [type, setType] = React.useState<TargetType>(value.type);
  const [zone, setZone] = React.useState<number>(value.zone ?? 2);
  const [minVal, setMinVal] = React.useState<number>(value.min != null ? Math.round(value.min * 100) : 75);
  const [maxVal, setMaxVal] = React.useState<number>(value.max != null ? Math.round(value.max * 100) : 85);
  const [paceMin, setPaceMin] = React.useState<number>(value.min ?? 300);
  const [paceMax, setPaceMax] = React.useState<number>(value.max ?? 330);
  const [rpeMin, setRpeMin] = React.useState<number>(value.min ?? 6);
  const [rpeMax, setRpeMax] = React.useState<number>(value.max ?? 7);

  const availableTypes = TARGET_TYPES.filter(
    (t) => t.sports === "all" || t.sports.includes(sport)
  ).map((t) => {
    if (t.type === "power_pct") {
      return {
        ...t,
        label: sport === "cycling" ? "% FTP" : "% Pace",
      };
    }
    return t;
  });

  function buildTarget(): StepTarget {
    switch (type) {
      case "power_zone":
        return { type: "power_zone", zone };
      case "power_pct":
        return { type: "power_pct", min: minVal / 100, max: maxVal / 100 };
      case "hr_zone":
        return { type: "hr_zone", zone };
      case "pace":
        return { type: "pace", min: paceMin, max: paceMax };
      case "cadence": // used as RPE
        return { type: "cadence", min: rpeMin, max: rpeMax };
      case "open":
      default:
        return { type: "open" };
    }
  }

  function handleSave() {
    onSave(buildTarget());
  }

  const maxZones = type === "power_zone" ? 7 : 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit target"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "24px",
          width: 380,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Target size={16} style={{ color: "var(--color-accent)" }} />
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Edit Target
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Type selector */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {availableTypes.map((t) => (
            <button
              key={t.type}
              onClick={() => setType(t.type)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${type === t.type ? "var(--color-accent)" : "var(--border-default)"}`,
                background: type === t.type ? "var(--color-accent-15)" : "var(--bg-input)",
                color: type === t.type ? "var(--color-accent)" : "var(--text-secondary)",
                fontSize: "var(--text-xs)",
                fontWeight: type === t.type ? 600 : 400,
                cursor: "pointer",
                transition: "all 150ms ease-out",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Zone selector (power_zone, hr_zone) */}
        {(type === "power_zone" || type === "hr_zone") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
              Select Zone
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {Array.from({ length: maxZones }, (_, i) => i + 1).map((z) => (
                <button
                  key={z}
                  onClick={() => setZone(z)}
                  style={{
                    flex: 1,
                    height: 40,
                    borderRadius: "var(--radius-sm)",
                    border: `2px solid ${zone === z ? ZONE_COLORS[z] : "var(--border-subtle)"}`,
                    background: zone === z ? `${ZONE_COLORS[z]}22` : "var(--bg-input)",
                    color: zone === z ? ZONE_COLORS[z] : "var(--text-muted)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 150ms ease-out",
                  }}
                >
                  {z}
                </button>
              ))}
            </div>
            {ZONE_NAMES[zone] && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
                {ZONE_NAMES[zone]}
              </p>
            )}
          </div>
        )}

        {/* % FTP range */}
        {type === "power_pct" && (
          <div style={{ display: "flex", gap: 12 }}>
            <NumInput label="Min %" id="ftp-min" value={minVal} min={0} max={300} onChange={setMinVal} />
            <NumInput label="Max %" id="ftp-max" value={maxVal} min={0} max={300} onChange={setMaxVal} />
          </div>
        )}

        {/* Pace range */}
        {type === "pace" && (
          <div style={{ display: "flex", gap: 12 }}>
            <PaceInput label="Fast Pace" id="pace-min" value={paceMin} onChange={setPaceMin} />
            <PaceInput label="Easy Pace" id="pace-max" value={paceMax} onChange={setPaceMax} />
          </div>
        )}

        {/* RPE */}
        {type === "cadence" && (
          <div style={{ display: "flex", gap: 12 }}>
            <NumInput label="RPE Min (1-10)" id="rpe-min" value={rpeMin} min={1} max={10} onChange={setRpeMin} />
            <NumInput label="RPE Max (1-10)" id="rpe-max" value={rpeMax} min={1} max={10} onChange={setRpeMax} />
          </div>
        )}

        {type === "open" && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
            No target — athlete trains by feel.
          </p>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" leftIcon={<Check size={14} />} onClick={handleSave}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
