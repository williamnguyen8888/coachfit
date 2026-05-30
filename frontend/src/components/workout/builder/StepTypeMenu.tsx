"use client";

/**
 * StepTypeMenu — "Add Step" panel with block type picker.
 *
 * Renders a floating card with buttons for each step type:
 *   Warm-up | Work | Rest | Cool-down | Repeat
 *
 * Constrained by max repeat nesting depth = 1:
 *   "Repeat" button is hidden when insideRepeat = true.
 */

import * as React from "react";
import { Flame, Zap, Moon, Wind, Repeat2, Plus, X } from "lucide-react";
import type { BuilderLeafStep } from "@/lib/types/builder";

/* ------------------------------------------------------------------ */
/*  Step type config                                                      */
/* ------------------------------------------------------------------ */

const STEP_OPTIONS: {
  type: BuilderLeafStep["type"] | "repeat";
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}[] = [
  {
    type: "warmup",
    label: "Warm-up",
    description: "Easy effort to prepare",
    icon: <Flame size={18} />,
    color: "#60A5FA",
    bg: "rgba(96,165,250,0.12)",
  },
  {
    type: "work",
    label: "Work",
    description: "Main effort / interval",
    icon: <Zap size={18} />,
    color: "#FB923C",
    bg: "rgba(251,146,60,0.12)",
  },
  {
    type: "rest",
    label: "Rest",
    description: "Recovery between efforts",
    icon: <Moon size={18} />,
    color: "#34D399",
    bg: "rgba(52,211,153,0.12)",
  },
  {
    type: "cooldown",
    label: "Cool-down",
    description: "Easy spin to finish",
    icon: <Wind size={18} />,
    color: "#818CF8",
    bg: "rgba(129,140,248,0.12)",
  },
  {
    type: "repeat",
    label: "Repeat Block",
    description: "Repeat a set of steps",
    icon: <Repeat2 size={18} />,
    color: "#C084FC",
    bg: "rgba(192,132,252,0.12)",
  },
];

/* ------------------------------------------------------------------ */
/*  Props                                                                */
/* ------------------------------------------------------------------ */

interface StepTypeMenuProps {
  onAdd: (type: BuilderLeafStep["type"] | "repeat") => void;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function StepTypeMenu({ onAdd, onClose }: StepTypeMenuProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add step"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
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
          width: 420,
          boxShadow: "var(--shadow-lg)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={16} style={{ color: "var(--color-accent)" }} />
            <h3 style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Add Step
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

        {/* Step option grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STEP_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => { onAdd(opt.type); onClose(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 150ms ease-out",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = opt.bg;
                (e.currentTarget as HTMLButtonElement).style.borderColor = opt.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-subtle)";
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-sm)",
                  background: opt.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: opt.color,
                  flexShrink: 0,
                }}
              >
                {opt.icon}
              </div>
              {/* Text */}
              <div>
                <div style={{ fontSize: "var(--text-base)", fontWeight: 600, color: opt.color }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                  {opt.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
