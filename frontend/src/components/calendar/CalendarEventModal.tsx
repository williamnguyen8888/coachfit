"use client";

// src/components/calendar/CalendarEventModal.tsx
// Modal/sheet for creating or editing calendar events.
// Supports: workout scheduling, rest days, and free-text events.

import { useState, useEffect, useCallback } from "react";
import type { CalendarEvent, CreateCalendarPayload, UpdateCalendarPayload, CalendarEventType } from "@/lib/types/calendar";
import type { WorkoutSummary, WorkoutDetail, WorkoutStep } from "@/lib/types/workout";
import { workoutsService } from "@/lib/services/workouts";
import { calendarService } from "@/lib/services/calendar";
import { useCalendarStore } from "@/stores/calendar.store";
import { InteractiveWorkoutChart } from "@/components/workout/InteractiveWorkoutChart";
import { getSportHex, getEstimatedLoad, formatDistance } from "./calendarUtils";
import { WorkoutStepViz } from "./WorkoutStepViz";
import { zonesService } from "@/lib/services/settings";
import type { SportZones } from "@/lib/types/settings";


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${m}m` : ""}`;
  return `${m}m`;
}

// ─── Premium Vector SVG Icons ──────────────────────────────────────────────────

const SportIcon = ({ sport, size = 18, color = "currentColor" }: { sport: string; size?: number; color?: string }) => {
  const norm = sport.toLowerCase();
  if (norm === "cycling") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="5.5" cy="17.5" r="3.5" />
        <circle cx="18.5" cy="17.5" r="3.5" />
        <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5L9 12H5m11.5-6L12 17.5m4.5-11.5H19" />
        <path d="M12 6c-1.2 0-2 .8-2 2s.8 2 2 2h3v7.5" />
      </svg>
    );
  }
  if (norm === "running") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="m18 8-4-1v4" />
        <path d="M14 7c-1.2 0-2-.8-2-2s.8-2 2-2 2 .8 2 2-.8 2-2 2Z" />
        <path d="m4 20 5-5-2-4 5-4h3" />
        <path d="m12 11 4 4 3-1" />
      </svg>
    );
  }
  if (norm === "swimming") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M2 10a4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 4 0" />
        <path d="M2 14a4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 4 0" />
        <path d="M2 18a4 4 0 0 0 8 0 4 4 0 0 0 8 0 4 4 0 0 0 4 0" />
        <path d="m12 6 2-2 2 2M10 4l2 2" />
      </svg>
    );
  }
  if (norm === "strength" || norm === "gym") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M18 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" />
        <path d="M6 6H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        <rect x="6" y="4" width="12" height="16" rx="2" />
        <line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    );
  }
  // default / other
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
};

const EventIcon = ({ type, size = 18, color = "currentColor" }: { type: string; size?: number; color?: string }) => {
  if (type === "workout") {
    return <SportIcon sport="running" size={size} color={color} />;
  }
  if (type === "rest") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    );
  }
  if (type === "race") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    );
  }
  // note
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
};

const NoteCategoryIcon = ({ category, size = 14, color = "currentColor" }: { category: string; size?: number; color?: string }) => {
  const norm = category.toLowerCase();
  if (norm === "travel") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M21 16V8a2 2 0 0 0-2-2h-3L12 2 8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3l4 4 4-4h3a2 2 0 0 0 2-2z" />
      </svg>
    );
  }
  if (norm === "gear") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    );
  }
  if (norm === "health") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    );
  }
  if (norm === "diet") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    );
  }
  // general
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
};

const RestPresetIcon = ({ type, size = 14, color = "currentColor" }: { type: string; size?: number; color?: string }) => {
  const norm = type.toLowerCase();
  if (norm.includes("complete") || norm.includes("rest")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M2 4v16M2 10h18a2 2 0 0 1 2 2v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9zM6 10V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
  }
  if (norm.includes("active") || norm.includes("recovery")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v12M8 10h8" />
      </svg>
    );
  }
  if (norm.includes("mobility") || norm.includes("stretch") || norm.includes("flex")) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="m21 21-6-6m6 6v-5m0 5h-5M3 10a7 7 0 1 1 14 0" />
      </svg>
    );
  }
  // therapy
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
      <path d="M12 12L7.5 7.5" />
      <path d="M12 12H20" />
    </svg>
  );
};

const RacePriorityIcon = ({ priority, size = 14, color = "currentColor" }: { priority: "A" | "B" | "C"; size?: number; color?: string }) => {
  if (priority === "A") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  if (priority === "B") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
};

const LoadIcon = ({ size = 12, color = "#F59E0B" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const WatchIcon = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="7" />
    <polyline points="12 9 12 12 13.5 13.5" />
    <path d="M16.51 7.16 18 3H6l1.49 4.16" />
    <path d="M7.49 16.84 6 21h12l-1.49-4.16" />
  </svg>
);

const SearchIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const SkipIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="18" y1="12" x2="6" y2="12" />
  </svg>
);

// ─── Overlay ──────────────────────────────────────────────────────────────────

// ─── Overlay ──────────────────────────────────────────────────────────────────

interface OverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: number | string;
}

function Overlay({ children, onClose, maxWidth = 480 }: OverlayProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
      />
      {/* Dialog Body */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: maxWidth,
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          animation: "scaleIn 0.2s cubic-bezier(0.4,0,0.2,1)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Extra Helpers for Workout Details ───────────────────────────────────────

const INTENSITY_FACTOR: Record<string, number> = {
  cycling: 0.8,
  running: 1.0,
  swimming: 0.9,
  strength: 0.6,
  other: 0.7,
};

const ZONE_COLORS: Record<number, string> = {
  1: "#60A5FA",
  2: "#34D399",
  3: "#FBBF24",
  4: "#FB923C",
  5: "#F87171",
  6: "#C084FC",
  7: "#F472B6",
};

function formatZoneDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  
  if (h > 0) {
    return `${h}h${m > 0 ? `${m}m` : ""}${s > 0 ? `${s}s` : ""}`;
  }
  if (m > 0) {
    return `${m}m${s > 0 ? `${s}s` : ""}`;
  }
  return `${s}s`;
}

function calculateWorkoutZoneDurations(steps: WorkoutStep[]): {
  zones: Record<number, number>;
  totalSeconds: number;
} {
  const zones: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  let totalSeconds = 0;

  function processStep(step: WorkoutStep, multiplier = 1) {
    if (step.type === "repeat" && step.steps) {
      const count = step.count ?? 1;
      for (const subStep of step.steps) {
        processStep(subStep, multiplier * count);
      }
    } else {
      const dur = step.duration?.value ?? 0;
      if (dur > 0) {
        const stepSec = dur * multiplier;
        totalSeconds += stepSec;

        let z = 2; // Default to Z2
        if (step.type === "warmup" || step.type === "cooldown" || step.type === "rest") {
          z = 1;
        }

        if (step.target) {
          if (step.target.type === "power_zone" || step.target.type === "hr_zone") {
            z = step.target.zone ?? z;
          } else if (step.target.type === "power_pct") {
            const pct = ((step.target.min ?? 0.5) + (step.target.max ?? 0.8)) / 2;
            if (pct < 0.55) z = 1;
            else if (pct < 0.75) z = 2;
            else if (pct < 0.90) z = 3;
            else if (pct < 1.05) z = 4;
            else if (pct < 1.20) z = 5;
            else if (pct < 1.50) z = 6;
            else z = 7;
          } else if (step.target.type === "pace") {
            if (step.target.min != null && step.target.max != null) {
              const mid = (step.target.min + step.target.max) / 2;
              if (mid < 0.70) z = 1;
              else if (mid < 0.85) z = 2;
              else if (mid < 0.95) z = 3;
              else if (mid < 1.05) z = 4;
              else if (mid < 1.20) z = 5;
              else z = 6;
            }
          }
        }
        
        z = Math.max(1, Math.min(7, z));
        zones[z] += stepSec;
      }
    }
  }

  for (const step of steps) {
    processStep(step);
  }

  return { zones, totalSeconds };
}





function parsePaceToSeconds(paceStr: string): number {
  if (!paceStr) return 0;
  const parts = paceStr.split(":");
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (!isNaN(mins) && !isNaN(secs)) {
      return mins * 60 + secs;
    }
  }
  return parseInt(paceStr, 10) || 0;
}

function formatSecondsToPace(totalSecs: number): string {
  if (totalSecs <= 0 || isNaN(totalSecs) || !isFinite(totalSecs)) return "--:--";
  const m = Math.floor(totalSecs / 60);
  const s = Math.round(totalSecs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const DEFAULT_CYCLING_PCT_RANGES: Record<number, [number, number]> = {
  1: [0, 0.55],
  2: [0.55, 0.75],
  3: [0.75, 0.87],
  4: [0.87, 1.0],
  5: [1.0, 1.12],
  6: [1.12, 1.3],
  7: [1.3, 2.0],
};

const DEFAULT_HR_PCT_RANGES: Record<number, [number, number]> = {
  1: [0, 0.80],
  2: [0.80, 0.89],
  3: [0.89, 0.93],
  4: [0.93, 0.99],
  5: [0.99, 1.02],
  6: [1.02, 1.05],
  7: [1.05, 1.20],
};

function formatStepToReadableText(step: WorkoutStep, sport: string, zones?: SportZones): string {
  let desc = step.description || "";
  
  if (!desc) {
    if (step.type === "warmup") desc = "Warm Up";
    else if (step.type === "cooldown") desc = "Cool Down";
    else if (step.type === "rest") desc = "Recovery";
    else if (step.type === "work") desc = "Work Interval";
  }

  let durStr = "";
  if (step.duration) {
    if (step.duration.type === "time" && step.duration.value != null) {
      const val = step.duration.value;
      if (val >= 60 && val % 60 === 0) {
        durStr = `${val / 60}m`;
      } else if (val >= 60) {
        durStr = `${Math.floor(val / 60)}m${val % 60}s`;
      } else {
        durStr = `${val}s`;
      }
    } else if (step.duration.type === "distance" && step.duration.value != null) {
      const val = step.duration.value;
      if (sport === "swimming") {
        durStr = `${val}mtr`;
      } else if (val >= 1000) {
        durStr = `${(val / 1000).toFixed(1)}km`;
      } else {
        durStr = `${val}m`;
      }
    } else if (step.duration.type === "lap_button") {
      durStr = "Lap Button";
    }
  }

  let tgtStr = "";
  if (step.target) {
    if (step.target.type === "power_pct") {
      const min = step.target.min != null ? Math.round(step.target.min * 100) : null;
      const max = step.target.max != null ? Math.round(step.target.max * 100) : null;
      const metricName = sport === "cycling" ? "FTP" : "Pace";
      
      let absStr = "";
      if (zones?.ftp && zones.ftp > 0) {
        if (step.target.min != null && step.target.max != null) {
          const minW = Math.round(step.target.min * zones.ftp);
          const maxW = Math.round(step.target.max * zones.ftp);
          absStr = ` (${minW}-${maxW}W)`;
        } else if (step.target.min != null) {
          const minW = Math.round(step.target.min * zones.ftp);
          absStr = ` (${minW}W)`;
        }
      }
      
      if (min != null && max != null) {
        tgtStr = `${min}-${max}% ${metricName}${absStr}`;
      } else if (min != null) {
        tgtStr = `${min}% ${metricName}${absStr}`;
      }
    } else if (step.target.type === "power_zone") {
      const zNum = step.target.zone ?? 2;
      let absStr = "";
      if (zones) {
        const zDef = zones.zones?.find((z) => z.zone === zNum);
        if (zDef && zDef.min != null && zDef.max != null) {
          if (zDef.min === 0) {
            absStr = ` (<${zDef.max}W)`;
          } else {
            absStr = ` (${zDef.min}-${zDef.max}W)`;
          }
        } else if (zones.ftp && zones.ftp > 0) {
          const pct = DEFAULT_CYCLING_PCT_RANGES[zNum];
          if (pct) {
            const minW = Math.round(pct[0] * zones.ftp);
            const maxW = Math.round(pct[1] * zones.ftp);
            if (minW === 0) {
              absStr = ` (<${maxW}W)`;
            } else {
              absStr = ` (${minW}-${maxW}W)`;
            }
          }
        }
      }
      tgtStr = `Z${zNum}${absStr}`;
    } else if (step.target.type === "hr_zone") {
      const zNum = step.target.zone ?? 2;
      let absStr = "";
      if (zones) {
        const zDef = zones.zones?.find((z) => z.zone === zNum);
        if (zDef && zDef.min != null && zDef.max != null) {
          if (zDef.min === 0) {
            absStr = ` (<${zDef.max} bpm)`;
          } else {
            absStr = ` (${zDef.min}-${zDef.max} bpm)`;
          }
        } else if (zones.lthr && zones.lthr > 0) {
          const pct = DEFAULT_HR_PCT_RANGES[zNum];
          if (pct) {
            const minBpm = Math.round(pct[0] * zones.lthr);
            const maxBpm = Math.round(pct[1] * zones.lthr);
            if (minBpm === 0) {
              absStr = ` (<${maxBpm} bpm)`;
            } else {
              absStr = ` (${minBpm}-${maxBpm} bpm)`;
            }
          }
        }
      }
      tgtStr = `HR Z${zNum}${absStr}`;
    } else if (step.target.type === "pace") {
      if (step.target.min != null && step.target.max != null) {
        const minPct = Math.round(step.target.min * 100);
        const maxPct = Math.round(step.target.max * 100);
        
        let absStr = "";
        if (zones?.thresholdPace && sport === "running") {
          const thresholdSecs = parsePaceToSeconds(zones.thresholdPace);
          if (thresholdSecs > 0) {
            const maxPaceSecs = Math.round(thresholdSecs / step.target.max);
            const minPaceSecs = Math.round(thresholdSecs / step.target.min);
            absStr = ` (${formatSecondsToPace(maxPaceSecs)}-${formatSecondsToPace(minPaceSecs)}/km)`;
          }
        } else if (zones?.thresholdPace && sport === "swimming") {
          const thresholdSecs = parsePaceToSeconds(zones.thresholdPace);
          if (thresholdSecs > 0) {
            const maxPaceSecs = Math.round(thresholdSecs / step.target.max);
            const minPaceSecs = Math.round(thresholdSecs / step.target.min);
            absStr = ` (${formatSecondsToPace(maxPaceSecs)}-${formatSecondsToPace(minPaceSecs)}/100m)`;
          }
        }
        
        tgtStr = `${minPct}-${maxPct}% Pace${absStr}`;
      } else if (step.target.value != null) {
        tgtStr = `${step.target.value} min/km`;
      } else {
        tgtStr = "Pace";
      }
    } else if (step.target.type === "cadence") {
      tgtStr = step.target.value != null ? `${step.target.value} rpm` : "Cadence";
    }
  }

  const parts = [];
  if (desc) parts.push(desc);
  if (durStr) parts.push(durStr);
  if (tgtStr) parts.push(tgtStr);

  let text = parts.join(" ");
  if (step.type === "rest") {
    text += " intensity=rest";
  }
  return text;
}

function renderWorkoutStepInstructions(step: WorkoutStep, sport: string, index: number, zones?: SportZones): React.ReactNode {
  if (step.type === "repeat" && step.steps) {
    return (
      <div key={index} style={{ marginBottom: "12px" }}>
        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px", marginBottom: "4px" }}>
          {step.count}x
        </div>
        <div style={{ paddingLeft: "12px", borderLeft: "2px solid var(--border-default)" }}>
          {step.steps.map((subStep, subIdx) => (
            <div
              key={subIdx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: "1.5",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>•</span>
              <span>{formatStepToReadableText(subStep, sport, zones)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      key={index}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "6px",
        fontSize: "13px",
        color: "var(--text-secondary)",
        lineHeight: "1.5",
        marginBottom: "6px",
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>•</span>
      <span>{formatStepToReadableText(step, sport, zones)}</span>
    </div>
  );
}


// ─── Workout picker ───────────────────────────────────────────────────────────

interface WorkoutPickerProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function WorkoutPicker({ selectedId, onSelect }: WorkoutPickerProps) {
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("all");

  useEffect(() => {
    workoutsService
      .list({ size: 100, sort: "createdAt,desc" }) // Fetch a larger set to allow tab filtering
      .then((res) => setWorkouts(res.content))
      .catch(() => setWorkouts([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = workouts.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchesSport = sportFilter === "all" || w.sport === sportFilter;
    return matchesSearch && matchesSport;
  });

  const getSportCount = (sport: string) => {
    if (sport === "all") return workouts.length;
    return workouts.filter((w) => w.sport === sport).length;
  };

  const SPORT_FILTERS = [
    { value: "all", label: "All" },
    { value: "running", label: "Run" },
    { value: "cycling", label: "Bike" },
    { value: "swimming", label: "Swim" },
    { value: "strength", label: "Gym" },
    { value: "other", label: "Other" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Search Input with modern styling */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder="Search workouts by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "10px 14px 10px 36px",
            color: "var(--text-primary)",
            fontSize: "var(--text-sm)",
            outline: "none",
            width: "100%",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 156, 222, 0.15)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {/* Search icon */}
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex", alignItems: "center" }}>
          <SearchIcon size={14} color="var(--text-muted)" />
        </span>
      </div>

      {/* Sport category grid (no scroller needed, 3-column layout) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          width: "100%",
          paddingTop: "2px",
          paddingBottom: "2px",
        }}
      >
        {SPORT_FILTERS.map((f) => {
          const isActive = sportFilter === f.value;
          const count = getSportCount(f.value);
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setSportFilter(f.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "8px 10px",
                background: isActive ? "rgba(0, 156, 222, 0.15)" : "rgba(255, 255, 255, 0.02)",
                border: `1.5px solid ${isActive ? "var(--color-accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
                color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0, overflow: "hidden" }}>
                <SportIcon sport={f.value} size={14} color={isActive ? "var(--color-accent)" : "var(--text-secondary)"} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.label}</span>
              </div>
              <span style={{
                fontSize: "9px",
                background: isActive ? "rgba(0, 156, 222, 0.25)" : "rgba(255, 255, 255, 0.05)",
                color: isActive ? "var(--color-accent)" : "var(--text-muted)",
                padding: "1px 5px",
                borderRadius: "4px",
                marginLeft: "auto",
                flexShrink: 0,
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Workout list container with custom thin scrollbar */}
      <style>{`
        .workout-list::-webkit-scrollbar {
          width: 5px;
        }
        .workout-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .workout-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 4px;
        }
        .workout-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.25);
        }
      `}</style>
      <div
        className="workout-list"
        style={{
          maxHeight: "260px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingRight: "8px",
        }}
      >
        {/* None option */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 12px",
            background: selectedId === null ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.02)",
            border: selectedId === null ? "1.5px solid #10b981" : "1.5px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <EventIcon type="rest" size={14} color={selectedId === null ? "#10b981" : "var(--text-secondary)"} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: selectedId === null ? "#10b981" : "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>
              No workout (rest / note)
            </div>
          </div>
        </button>

        {loading ? (
          <div style={{ padding: "var(--space-3)", color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center" }}>
            Loading workouts...
          </div>
        ) : (
          filtered.map((w) => {
            const isSelected = selectedId === w.id;
            const sportHex = getSportHex(w.sport);
            const estLoad = w.estimatedTss ?? Math.round(((w.estimatedDuration ?? 0) / 60) * (INTENSITY_FACTOR[w.sport] ?? 0.7));

            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onSelect(w.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "8px 12px",
                  background: isSelected ? `${sportHex.primary}0c` : "rgba(255, 255, 255, 0.02)",
                  border: `1.5px solid ${isSelected ? sportHex.primary : "var(--border-subtle)"}`,
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: `${sportHex.primary}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${sportHex.primary}30`
                }}>
                  <SportIcon sport={w.sport} size={14} color={isSelected ? sportHex.primary : "var(--text-secondary)"} />
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{
                    color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: "13px",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}>
                    {w.name}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", display: "flex", gap: "6px", alignItems: "center", marginTop: "1px" }}>
                    <span style={{ textTransform: "capitalize" }}>{w.sport}</span>
                    <span>•</span>
                    <span>{w.estimatedDuration ? formatDuration(w.estimatedDuration) : "--"}</span>
                    {estLoad > 0 && (
                      <>
                        <span>•</span>
                        <span style={{ color: "var(--color-warning)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <LoadIcon size={12} color="var(--color-warning)" />
                          <span>{estLoad} Load</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckIcon size={14} color={sportHex.primary} />
                )}
              </button>
            );
          })
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "var(--text-sm)", textAlign: "center" }}>
            No workouts found
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Metadata Parser for Edit Mode ───────────────────────────────────────────

interface InitialParsedData {
  initialPriority: "A" | "B" | "C";
  initialTargetTime: string;
  initialTargetPace: string;
  initialTitle: string;
  initialNotes: string;
  initialNoteCategory: "General" | "Travel" | "Gear" | "Health" | "Diet";
  initialRecoveryPreset: string;
}

function parseInitialData(event?: CalendarEvent): InitialParsedData {
  let initialPriority: "A" | "B" | "C" = "A";
  let initialTargetTime = "";
  let initialTargetPace = "";
  let initialTitle = event?.title ?? "";
  let initialNotes = event?.notes ?? "";
  let initialNoteCategory: "General" | "Travel" | "Gear" | "Health" | "Diet" = "General";
  let initialRecoveryPreset = "";

  if (event) {
    if (event.eventType === "race") {
      const raceMatch = event.title?.match(/^\[([A-C])-Race\]\s*(.*)$/);
      if (raceMatch) {
        initialPriority = raceMatch[1] as "A" | "B" | "C";
        initialTitle = raceMatch[2];
      }
      
      if (event.notes) {
        const timeMatch = event.notes.match(/⏱️ Target Finish Time:\s*([^\n]+)/);
        if (timeMatch) initialTargetTime = timeMatch[1].trim();

        const paceMatch = event.notes.match(/🎯 Goal Pace\/Power:\s*([^\n]+)/);
        if (paceMatch) initialTargetPace = paceMatch[1].trim();

        // Extract clean notes by removing the metadata block
        const cleanNotes = event.notes.replace(/^🏆 Priority:[^\n]*\n⏱️ Target Finish Time:[^\n]*\n🎯 Goal Pace\/Power:[^\n]*\n*\s*/g, "");
        initialNotes = cleanNotes;
      }
    } else if (event.eventType === "rest") {
      const restMatch = event.title?.match(/^\[Rest\]\s*(.*)$/);
      if (restMatch) {
        initialTitle = restMatch[1];
      }
      
      if (event.notes) {
        const typeMatch = event.notes.match(/💆 Type:\s*([^\n]+)/);
        if (typeMatch) {
          initialRecoveryPreset = typeMatch[1].trim();
        }
        const cleanNotes = event.notes.replace(/^💆 Type:[^\n]*\n*\s*/g, "");
        initialNotes = cleanNotes;
      }
    } else if (event.eventType === "note") {
      const noteMatch = event.title?.match(/^\[(General|Travel|Gear|Health|Diet)\]\s*(.*)$/);
      if (noteMatch) {
        initialNoteCategory = noteMatch[1] as any;
        initialTitle = noteMatch[2];
      }
    }
  }

  return {
    initialPriority,
    initialTargetTime,
    initialTargetPace,
    initialTitle,
    initialNotes,
    initialNoteCategory,
    initialRecoveryPreset
  };
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export interface CalendarEventModalProps {
  /** "create" opens an empty form, "edit" opens the form pre-filled with event data */
  mode: "create" | "edit";
  /** Pre-fill the date when creating */
  initialDate?: string;
  /** Event to edit (required when mode === "edit") */
  event?: CalendarEvent;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CalendarEventModal({
  mode,
  initialDate,
  event,
  onClose,
  onSuccess,
}: CalendarEventModalProps) {
  const { createEvent, updateEvent, deleteEvent, markComplete, markSkipped } =
    useCalendarStore();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Form and view state
  const [viewMode, setViewMode] = useState<"detail" | "edit">(
    mode === "edit" && event?.eventType === "workout" ? "detail" : "edit"
  );
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [athleteZones, setAthleteZones] = useState<SportZones[]>([]);

  useEffect(() => {
    zonesService.listAll()
      .then((res) => setAthleteZones(res))
      .catch((err) => console.error("Failed to load athlete zones:", err));
  }, []);

  useEffect(() => {
    if (viewMode === "detail" && event?.workout?.id) {
      setLoadingDetail(true);
      workoutsService
        .get(event.workout.id)
        .then((res) => setWorkoutDetail(res))
        .catch((err) => console.error("Failed to load workout details:", err))
        .finally(() => setLoadingDetail(false));
    }
  }, [viewMode, event]);

  // Form state
  const initialData = parseInitialData(event);

  const [selectedType, setSelectedType] = useState<CalendarEventType>(
    event?.eventType ?? "workout",
  );
  const [date, setDate] = useState<string>(
    event?.date ?? initialDate ?? new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState<string>(initialData.initialNotes);
  const [title, setTitle] = useState<string>(
    event?.eventType !== "workout" ? initialData.initialTitle : "",
  );
  const [workoutId, setWorkoutId] = useState<string | null>(
    event?.workout?.id ?? null,
  );

  // Preview workout detail
  const [previewWorkout, setPreviewWorkout] = useState<WorkoutDetail | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  // Expanded Athlete & Coach fields
  const [racePriority, setRacePriority] = useState<"A" | "B" | "C">(initialData.initialPriority);
  const [targetTime, setTargetTime] = useState<string>(initialData.initialTargetTime);
  const [targetPace, setTargetPace] = useState<string>(initialData.initialTargetPace);
  const [recoveryPreset, setRecoveryPreset] = useState<string>(initialData.initialRecoveryPreset);
  const [noteCategory, setNoteCategory] = useState<"General" | "Travel" | "Gear" | "Health" | "Diet">(initialData.initialNoteCategory);

  useEffect(() => {
    if (selectedType === "workout" && workoutId) {
      setLoadingPreview(true);
      workoutsService
        .get(workoutId)
        .then((res) => setPreviewWorkout(res))
        .catch((err) => {
          console.error("Failed to load workout preview:", err);
          setPreviewWorkout(null);
        })
        .finally(() => setLoadingPreview(false));
    } else {
      setPreviewWorkout(null);
    }
  }, [workoutId, selectedType]);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Garmin Training API sync state
  const [garminSyncing, setGarminSyncing]   = useState(false);
  const [garminRemoving, setGarminRemoving] = useState(false);
  const [garminError, setGarminError]       = useState<string | null>(null);
  const isSyncedToGarmin = Boolean(event?.garminWorkoutId);

  const handleGarminSync = useCallback(async () => {
    if (!event) return;
    setGarminSyncing(true);
    setGarminError(null);
    try {
      await calendarService.syncToGarmin(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setGarminError(err instanceof Error ? err.message : "Garmin sync failed");
    } finally {
      setGarminSyncing(false);
    }
  }, [event, onSuccess, onClose]);

  const handleGarminRemove = useCallback(async () => {
    if (!event) return;
    setGarminRemoving(true);
    setGarminError(null);
    try {
      await calendarService.removeFromGarmin(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setGarminError(err instanceof Error ? err.message : "Failed to remove from Garmin");
    } finally {
      setGarminRemoving(false);
    }
  }, [event, onSuccess, onClose]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      let finalTitle = title;
      let finalNotes = notes;

      if (selectedType === "workout") {
        // Workout title is derived on the backend, nothing special here
      } else if (selectedType === "race") {
        finalTitle = `[${racePriority}-Race] ${title || "Race Day"}`;
        const goalsBlock = `🏆 Priority: ${racePriority}-Race\n⏱️ Target Finish Time: ${targetTime || "--"}\n🎯 Goal Pace/Power: ${targetPace || "--"}`;
        finalNotes = notes ? `${goalsBlock}\n\n${notes}` : goalsBlock;
      } else if (selectedType === "rest") {
        finalTitle = `[Rest] ${title || recoveryPreset || "Rest Day"}`;
        const presetBlock = recoveryPreset ? `💆 Type: ${recoveryPreset}` : "";
        finalNotes = presetBlock ? `${presetBlock}\n\n${notes}` : notes;
      } else if (selectedType === "note") {
        finalTitle = `[${noteCategory}] ${title || "Daily Log"}`;
      }

      if (mode === "create") {
        const payload: CreateCalendarPayload = {
          date,
          notes: finalNotes || undefined,
          eventType: selectedType,
          title: finalTitle || undefined,
        };
        if (selectedType === "workout") {
          if (!workoutId) {
            setError("Please select a workout");
            setSubmitting(false);
            return;
          }
          payload.workoutId = workoutId;
        }
        await createEvent(payload);
      } else if (event) {
        const payload: UpdateCalendarPayload = {
          date,
          notes: finalNotes || undefined,
          title: finalTitle || undefined,
          eventType: selectedType,
        };
        if (selectedType === "workout" && workoutId) {
          payload.workoutId = workoutId;
        }
        await updateEvent(event.id, payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }, [mode, date, notes, title, workoutId, selectedType, racePriority, targetTime, targetPace, recoveryPreset, noteCategory, event, createEvent, updateEvent, onClose, onSuccess]);

  const handleDelete = useCallback(async () => {
    if (!event) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteEvent(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }, [event, deleteEvent, onClose, onSuccess]);

  const handleMarkComplete = useCallback(async () => {
    if (!event) return;
    try {
      await markComplete(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [event, markComplete, onClose, onSuccess]);

  const handleMarkSkipped = useCallback(async () => {
    if (!event) return;
    try {
      await markSkipped(event.id);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [event, markSkipped, onClose, onSuccess]);

  const isCreateMode = mode === "create";
  const canSubmit = isCreateMode ? (selectedType === "workout" ? workoutId !== null : true) : true;

  if (viewMode === "detail" && event && event.eventType === "workout" && event.workout) {
    const sport = event.workout.sport ?? "other";
    const activeZones = athleteZones.find((z) => z.sport === sport);
    const sportHex = getSportHex(sport);
    const dateLabel = new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    
    const steps = workoutDetail?.steps ?? [];
    
    const workoutDuration = workoutDetail?.estimatedDuration ?? event.workout?.estimatedDuration ?? 0;
    const workoutDistance = workoutDetail?.estimatedDistance ?? event.workout?.estimatedDistance ?? 0;
    const workoutLoad = workoutDetail?.estimatedTss ?? event.workout?.estimatedTss ?? getEstimatedLoad(event);
    const workoutIntensity = workoutDetail?.averageIntensity ?? Math.round((INTENSITY_FACTOR[sport] ?? 0.7) * 100);

    const { zones: zoneSecs, totalSeconds: totalZoneSecs } = calculateWorkoutZoneDurations(steps);
    
    const s1_sec = zoneSecs[1] + zoneSecs[2];
    const s2_sec = zoneSecs[3] + zoneSecs[4];
    const s3_sec = zoneSecs[5] + zoneSecs[6] + zoneSecs[7];
    const totalS = s1_sec + s2_sec + s3_sec;

    const s1_ratio = s1_sec / (totalS || 1);
    const s2_ratio = s2_sec / (totalS || 1);
    const s3_ratio = s3_sec / (totalS || 1);

    let tidModel = "Base";
    let polarizationIndex = 0.00;

    if (totalZoneSecs > 0) {
      if (s1_ratio > 0 && s2_ratio > 0 && s3_ratio > 0) {
        polarizationIndex = Math.log10(((s1_ratio * s3_ratio) / s2_ratio) * 100);
        if (isNaN(polarizationIndex) || !isFinite(polarizationIndex)) {
          polarizationIndex = 0;
        }
      }

      if (s2_ratio >= 0.22) {
        tidModel = "Threshold";
      } else if (s1_ratio >= 0.72 && s3_ratio >= 0.08 && s2_ratio < 0.16) {
        tidModel = "Polarized";
      } else if (s1_ratio >= 0.55 && s2_ratio >= 0.10) {
        tidModel = "Pyramidal";
      } else if (s1_ratio >= 0.85) {
        tidModel = "Base";
      } else {
        tidModel = "Pyramidal";
      }
    }

    const handleCopyText = () => {
      if (!workoutDetail) return;
      const lines: string[] = [];
      if (workoutDetail.sport === "swimming") {
        lines.push("pool length: 25m\n");
      }
      
      workoutDetail.steps.forEach((step) => {
        if (step.type === "repeat" && step.steps) {
          lines.push(`${step.count}x`);
          step.steps.forEach((sub) => {
            lines.push(`  • ${formatStepToReadableText(sub, workoutDetail.sport, activeZones)}`);
          });
          lines.push("");
        } else {
          lines.push(`• ${formatStepToReadableText(step, workoutDetail.sport, activeZones)}`);
        }
      });

      const fullText = lines.join("\n");
      navigator.clipboard.writeText(fullText)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to copy workout text:", err);
        });
    };

    const handleExportFit = async () => {
      if (!event.workout?.id) return;
      try {
        const res = await workoutsService.exportFit(event.workout.id);
        if (res && res.downloadUrl) {
          const a = document.createElement("a");
          a.href = res.downloadUrl;
          a.download = res.filename || "workout.fit";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error("Failed to export FIT file:", err);
      }
    };

    return (
      <Overlay onClose={onClose} maxWidth={680}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: isMobile ? "16px" : "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${sportHex.light}88 0%, ${sportHex.light}44 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${sportHex.primary}40`,
                fontSize: "24px",
              }}
            >
              <SportIcon sport={sport} size={24} color={sportHex.primary} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: isMobile ? "16px" : "18px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: "1.3",
                }}
              >
                {event.title}
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  fontWeight: 500,
                }}
              >
                {dateLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "24px",
              padding: "4px",
              lineHeight: "1",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            background: "var(--bg-surface)",
            padding: isMobile ? "12px 8px" : "12px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Duration</div>
            <div style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutDuration > 0 ? formatDuration(workoutDuration) : "--"}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-subtle)", height: "32px", alignSelf: "center" }} />
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Distance</div>
            <div style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutDistance > 0 ? (workoutDistance >= 1000 ? `${(workoutDistance / 1000).toFixed(1)} km` : `${Math.round(workoutDistance)} m`) : "--"}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-subtle)", height: "32px", alignSelf: "center" }} />
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Load</div>
            <div style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutLoad}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-subtle)", height: "32px", alignSelf: "center" }} />
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em" }}>Intensity</div>
            <div style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: 700, color: "var(--text-primary)", marginTop: "4px" }}>
              {workoutIntensity}%
            </div>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isMobile ? "16px" : "24px",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "16px" : "24px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
              gap: isMobile ? "16px" : "24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {isMobile && steps.length > 0 && !loadingDetail && (
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                  Workout Steps
                </div>
              )}
              {loadingDetail ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", padding: "20px 0" }}>Loading steps...</div>
              ) : steps.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "13px", fontStyle: "italic" }}>No specific workout steps defined.</div>
              ) : (
                <div style={{
                  background: isMobile ? "transparent" : "var(--bg-surface)",
                  borderRadius: isMobile ? "0px" : "var(--radius-md)",
                  padding: isMobile ? "0px" : "16px",
                  border: isMobile ? "none" : "1px solid var(--border-subtle)",
                  maxHeight: isMobile ? "none" : "280px",
                  overflowY: isMobile ? "visible" : "auto"
                }}>
                  {sport === "swimming" && (
                    <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px", fontFamily: "var(--font-mono, monospace)" }}>
                      pool length: 25m
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {steps.map((step, idx) => renderWorkoutStepInstructions(step, sport, idx, activeZones))}
                  </div>
                </div>
              )}

              {event.notes && (
                <div
                  style={{
                    padding: isMobile ? "8px 0 8px 12px" : "12px 16px",
                    background: isMobile ? "transparent" : "var(--bg-surface)",
                    borderLeft: `4px solid ${sportHex.primary}`,
                    borderRadius: isMobile ? "0px" : "var(--radius-sm)",
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    lineHeight: "1.5",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>Athlete Notes</div>
                  {event.notes}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{
                background: isMobile ? "transparent" : "var(--bg-surface)",
                borderRadius: isMobile ? "0px" : "var(--radius-md)",
                padding: isMobile ? "0px" : "16px",
                border: isMobile ? "none" : "1px solid var(--border-subtle)"
              }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
                    Zones {tidModel}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
                    PI {polarizationIndex > 0 ? polarizationIndex.toFixed(2) : "0.00"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((zNum) => {
                    const sec = zoneSecs[zNum] || 0;
                    const pct = totalZoneSecs > 0 ? (sec / totalZoneSecs) * 100 : 0;
                    const color = ZONE_COLORS[zNum] ?? "#8B8B9E";

                    return (
                      <div key={zNum} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                        <span style={{ width: "20px", fontWeight: 600, color: "var(--text-muted)" }}>Z{zNum}</span>
                        <div style={{ width: "12px", height: "12px", borderRadius: "2px", background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, height: "8px", background: "var(--bg-input)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px" }} />
                        </div>
                        <span style={{ width: "50px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: sec > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                          {sec > 0 ? formatZoneDuration(sec) : "--"}
                        </span>
                        <span style={{ width: "40px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: pct > 0 ? "var(--text-secondary)" : "var(--text-muted)" }}>
                          {pct > 0 ? `${pct.toFixed(1)}%` : "0.0%"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {steps.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <InteractiveWorkoutChart steps={steps} sport={sport} athleteZones={activeZones} />
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "16px" : "12px",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            justifyContent: isMobile ? "center" : "flex-start",
            order: isMobile ? 2 : 1,
          }}>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: "none",
                border: "none",
                cursor: deleting ? "not-allowed" : "pointer",
                color: "var(--color-danger)",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: deleting ? 0.5 : 1,
              }}
              title="Delete Workout Event"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              disabled={!workoutDetail}
              style={{
                background: "none",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
                fontSize: "12px",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                cursor: !workoutDetail ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                opacity: !workoutDetail ? 0.5 : 1,
              }}
            >
              <span>{copySuccess ? "COPIED" : "COPY"}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleExportFit}
              disabled={!event.workout?.id}
              style={{
                background: "none",
                border: "none",
                cursor: !event.workout?.id ? "not-allowed" : "pointer",
                color: "var(--text-secondary)",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: !event.workout?.id ? 0.5 : 1,
              }}
              title="Download FIT file"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
          </div>

          <div style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            justifyContent: isMobile ? "stretch" : "flex-end",
            width: isMobile ? "100%" : "auto",
            order: isMobile ? 1 : 2,
          }}>
            {event.status === "planned" && (
              <button
                type="button"
                onClick={handleMarkComplete}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  background: "var(--color-success-10)",
                  border: "1px solid var(--color-success-30)",
                  color: "var(--color-success)",
                  fontSize: "13px",
                  fontWeight: 600,
                  padding: "8px 16px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  flex: isMobile ? 1 : "initial",
                }}
              >
                <CheckIcon size={14} color="var(--color-success)" />
                <span>MARK DONE</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode("edit")}
              style={{
                background: "var(--color-accent-10)",
                border: "1px solid var(--color-accent-30)",
                color: "var(--color-accent)",
                fontSize: "13px",
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                flex: isMobile ? 1 : "initial",
                textAlign: "center",
                justifyContent: "center",
              }}
            >
              EDIT
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--bg-input)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
                fontSize: "13px",
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                flex: isMobile ? 1 : "initial",
                textAlign: "center",
                justifyContent: "center",
              }}
            >
              CLOSE
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  const showPreview = selectedType === "workout" && previewWorkout;
  const modalWidth = showPreview ? 820 : 520;

  return (
    <Overlay onClose={onClose} maxWidth={modalWidth}>
      {/* Scoped keyframes */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.97); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {isCreateMode ? "Add to Calendar" : "Edit Event"}
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            {formatDateLabel(date)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            background: "var(--bg-input)",
            border: "none",
            borderRadius: "var(--radius-full)",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Scrollable body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className={showPreview ? "modal-layout-grid" : ""}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            width: "100%",
          }}
        >
          <style>{`
            @media (min-width: 768px) {
              .modal-layout-grid {
                display: grid !important;
                grid-template-columns: 1.1fr 1.25fr !important;
                gap: 24px !important;
                align-items: start;
              }
            }
          `}</style>

          {/* LEFT COLUMN: CORE FORM */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Event Type Tab Selector (Create Mode Only) */}
            {isCreateMode && (
              <div>
                <label
                  style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
                >
                  Event Type
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                    background: "rgba(255, 255, 255, 0.02)",
                    padding: 4,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {(["workout", "rest", "race", "note"] as const).map((type) => {
                    const isActive = selectedType === type;
                    let label = "Workout";
                    let activeColor = "var(--color-accent)";
                    let activeBg = "rgba(0, 156, 222, 0.12)";
                    let activeBorder = "1px solid rgba(0, 156, 222, 0.3)";

                    if (type === "rest") {
                      label = "Rest";
                      activeColor = "#10b981"; // Emerald
                      activeBg = "rgba(16, 185, 129, 0.12)";
                      activeBorder = "1px solid rgba(16, 185, 129, 0.3)";
                    } else if (type === "race") {
                      label = "Race";
                      activeColor = "#ef4444"; // Red
                      activeBg = "rgba(239, 68, 68, 0.12)";
                      activeBorder = "1px solid rgba(239, 68, 68, 0.3)";
                    } else if (type === "note") {
                      label = "Note";
                      activeColor = "#8b5cf6"; // Violet
                      activeBg = "rgba(139, 92, 246, 0.12)";
                      activeBorder = "1px solid rgba(139, 92, 246, 0.3)";
                    }

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSelectedType(type);
                          setError(null);
                          if (type !== "workout") setWorkoutId(null);
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          padding: "8px 2px",
                          background: isActive ? activeBg : "transparent",
                          border: isActive ? activeBorder : "1px solid transparent",
                          borderRadius: "var(--radius-sm)",
                          color: isActive ? activeColor : "var(--text-muted)",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          transition: "all 150ms ease",
                        }}
                      >
                        <EventIcon type={type} size={18} color={isActive ? activeColor : "var(--text-muted)"} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date Picker */}
            <div>
              <label
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
              >
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  width: "100%",
                  colorScheme: "dark",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
              />
            </div>

            {/* Workout Selector (Only in Workout Mode & Create Mode) */}
            {isCreateMode && selectedType === "workout" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label
                  style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}
                >
                  Select Workout
                </label>
                <WorkoutPicker selectedId={workoutId} onSelect={setWorkoutId} />
              </div>
            )}

            {/* Rest Day Presets (Only in Rest Mode) */}
            {selectedType === "rest" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", animation: "slideDown 0.2s ease" }}>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>
                  HLV Recovery Suggestion Presets
                </label>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px dashed var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px"
                }}>
                  {[
                    { type: "Complete Rest", label: "Complete Rest", text: "Total recovery focus. Prioritize sleep (8+ hours), hydration, and clean nutrition. No training.", title: "Complete Rest Day" },
                    { type: "Active Recovery", label: "Active Recovery", text: "Keep heart rate strictly in Zone 1. 20-30 minutes of light spinning, walking, or swimming. Flush the legs.", title: "Active Recovery" },
                    { type: "Mobility & Stretch", label: "Mobility & Flex", text: "Focus on joint mobility, hamstring flexibility, and thoracic opening. 20 minutes of dynamic stretching or foam rolling.", title: "Mobility & Stretching" },
                    { type: "Recovery Therapy", label: "Therapy", text: "Utilize massage, sauna, ice bath, or pneumatic compression boots (e.g. Normatec) to accelerate recovery.", title: "Recovery Therapy" }
                  ].map((preset) => {
                    const isActive = recoveryPreset === preset.type;
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => {
                          setRecoveryPreset(preset.type);
                          setTitle(preset.title);
                          setNotes(preset.text);
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 10px",
                          background: isActive ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${isActive ? "#10b981" : "var(--border-subtle)"}`,
                          borderRadius: "var(--radius-full)",
                          color: isActive ? "#10b981" : "var(--text-secondary)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <RestPresetIcon type={preset.type} size={14} color={isActive ? "#10b981" : "var(--text-secondary)"} />
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Race Goals Grid (Only in Race Mode) */}
            {selectedType === "race" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", animation: "slideDown 0.2s ease" }}>
                {/* Star Priority Selector */}
                <div>
                  <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "8px" }}>
                    Race Priority
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {(["A", "B", "C"] as const).map((priority) => {
                      const isActive = racePriority === priority;
                      let activeBg = "rgba(239, 68, 68, 0.1)";
                      let activeBorder = "1.5px solid #ef4444";
                      let activeColor = "#ef4444";
                      let rLabel = "A-Race (Peak)";

                      if (priority === "B") {
                        activeBg = "rgba(245, 158, 11, 0.1)";
                        activeBorder = "1.5px solid #f59e0b";
                        activeColor = "#f59e0b";
                        rLabel = "B-Race (Prep)";
                      } else if (priority === "C") {
                        activeBg = "rgba(59, 130, 246, 0.1)";
                        activeBorder = "1.5px solid #3b82f6";
                        activeColor = "#3b82f6";
                        rLabel = "C-Race (Train)";
                      }

                      return (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => setRacePriority(priority)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            padding: "10px 4px",
                            background: isActive ? activeBg : "rgba(255, 255, 255, 0.02)",
                            border: isActive ? activeBorder : "1px solid var(--border-default)",
                            borderRadius: "var(--radius-md)",
                            color: isActive ? activeColor : "var(--text-secondary)",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 120ms ease",
                          }}
                        >
                          <RacePriorityIcon priority={priority} size={14} color={isActive ? activeColor : "var(--text-secondary)"} />
                          <span>{rLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Goals */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Target Finish Time
                    </label>
                    <input
                      type="text"
                      value={targetTime}
                      onChange={(e) => setTargetTime(e.target.value)}
                      placeholder="e.g. 3h 45m"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        padding: "8px 12px",
                        color: "var(--text-primary)",
                        fontSize: "var(--text-sm)",
                        outline: "none",
                        width: "100%",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#ef4444"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "6px" }}>
                      Goal Pace / Power
                    </label>
                    <input
                      type="text"
                      value={targetPace}
                      onChange={(e) => setTargetPace(e.target.value)}
                      placeholder="e.g. 4:45 /km, 250W"
                      style={{
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--radius-md)",
                        padding: "8px 12px",
                        color: "var(--text-primary)",
                        fontSize: "var(--text-sm)",
                        outline: "none",
                        width: "100%",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#ef4444"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Note Categories (Only in Note Mode) */}
            {selectedType === "note" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", animation: "slideDown 0.2s ease" }}>
                <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Note Category
                </label>
                <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                  {[
                    { value: "General", label: "General" },
                    { value: "Travel", label: "Travel" },
                    { value: "Gear", label: "Gear & Tech" },
                    { value: "Health", label: "Health" },
                    { value: "Diet", label: "Diet & Carbs" }
                  ].map((c) => {
                    const isActive = noteCategory === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNoteCategory(c.value as any)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "6px 12px",
                          background: isActive ? "rgba(139, 92, 246, 0.15)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${isActive ? "#8b5cf6" : "var(--border-subtle)"}`,
                          borderRadius: "var(--radius-full)",
                          color: isActive ? "#8b5cf6" : "var(--text-secondary)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <NoteCategoryIcon category={c.value} size={14} color={isActive ? "#8b5cf6" : "var(--text-secondary)"} />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Title / Description Label (Non-workout, or edit mode) */}
            {(!isCreateMode || selectedType !== "workout") && (
              <div>
                <label
                  style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
                >
                  {selectedType === "race" ? "Race Name" : selectedType === "rest" ? "Recovery Label" : "Title"}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    selectedType === "race"
                      ? "e.g. Da Nang Ironman 70.3"
                      : selectedType === "rest"
                      ? "e.g. Recovery Session"
                      : "Enter event title..."
                  }
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px 14px",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-sm)",
                    outline: "none",
                    width: "100%",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
                />
              </div>
            )}

            {/* Notes / Details text area */}
            <div>
              <label
                style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}
              >
                {selectedType === "workout"
                  ? "Focus / Instructions"
                  : selectedType === "rest"
                  ? "Recovery Focus Details"
                  : selectedType === "race"
                  ? "Race Strategy & Fueling Plan"
                  : "Details"}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  selectedType === "workout"
                    ? "Key intervals focus, target power, etc..."
                    : selectedType === "rest"
                    ? "Hydration, stretching, foam rolling instructions..."
                    : selectedType === "race"
                    ? "Tapering execution, pacing strategy, split goals..."
                    : "Notes, reminders, details..."
                }
                rows={3}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  color: "var(--text-primary)",
                  fontSize: "var(--text-sm)",
                  outline: "none",
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "inherit",
                  lineHeight: 1.5,
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "var(--color-accent)"}
                onBlur={(e) => e.currentTarget.style.borderColor = "var(--border-default)"}
              />
            </div>

            {/* Edit mode quick actions & Garmin Sync (only for Workout events) */}
            {!isCreateMode && event && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Status markings */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {event.status === "planned" && (
                    <button
                      type="button"
                      onClick={handleMarkComplete}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 12px",
                        background: "var(--color-success-10)",
                        border: "1px solid var(--color-success-30)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-success)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <CheckIcon size={13} color="var(--color-success)" />
                      <span>Mark Done</span>
                    </button>
                  )}
                  {(event.status === "planned" || event.status === "partial") && (
                    <button
                      type="button"
                      onClick={handleMarkSkipped}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 12px",
                        background: "var(--color-danger-10)",
                        border: "1px solid var(--color-danger-30)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--color-danger)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <SkipIcon size={13} color="var(--color-danger)" />
                      <span>Mark Skipped</span>
                    </button>
                  )}
                </div>

                {/* Garmin Connect scheduling */}
                {event.eventType === "workout" && event.workout && (
                  <div
                    style={{
                      padding: "12px",
                      background: isSyncedToGarmin
                        ? "rgba(0, 156, 222, 0.05)"
                        : "rgba(255, 255, 255, 0.01)",
                      border: `1px solid ${
                        isSyncedToGarmin
                          ? "rgba(0, 156, 222, 0.3)"
                          : "var(--border-subtle)"
                      }`,
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "#009CDE",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <WatchIcon size={14} color="white" />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                        Garmin Connect Sync
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {isSyncedToGarmin
                          ? `Synced${event.garminSyncedAt ? " · " + new Date(event.garminSyncedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}`
                          : "Schedule workout on your Garmin Connect"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      {isSyncedToGarmin ? (
                        <>
                          <button
                            type="button"
                            onClick={handleGarminSync}
                            disabled={garminSyncing || garminRemoving}
                            title="Re-sync workout to Garmin"
                            style={{
                              padding: "4px 8px",
                              background: "rgba(0, 156, 222, 0.1)",
                              border: "1px solid rgba(0, 156, 222, 0.3)",
                              borderRadius: "var(--radius-sm)",
                              color: "#009CDE",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: garminSyncing ? "not-allowed" : "pointer",
                              opacity: garminSyncing ? 0.6 : 1,
                            }}
                          >
                            {garminSyncing ? "Syncing…" : "↺ Re-sync"}
                          </button>
                          <button
                            type="button"
                            onClick={handleGarminRemove}
                            disabled={garminSyncing || garminRemoving}
                            title="Remove from Garmin calendar"
                            style={{
                              padding: "4px 8px",
                              background: "transparent",
                              border: "1px solid var(--border-default)",
                              borderRadius: "var(--radius-sm)",
                              color: "var(--text-muted)",
                              fontSize: "11px",
                              fontWeight: 500,
                              cursor: garminRemoving ? "not-allowed" : "pointer",
                              opacity: garminRemoving ? 0.6 : 1,
                            }}
                          >
                            {garminRemoving ? "Removing…" : "Remove"}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGarminSync}
                          disabled={garminSyncing}
                          id="garmin-sync-button"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 12px",
                            background: "#009CDE",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            color: "white",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: garminSyncing ? "not-allowed" : "pointer",
                            opacity: garminSyncing ? 0.7 : 1,
                          }}
                        >
                          <WatchIcon size={13} color="white" />
                          <span>{garminSyncing ? "Syncing…" : "Push to Garmin"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Garmin error log */}
                {garminError && (
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "var(--color-danger-10)",
                      border: "1px solid var(--color-danger-30)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--color-danger)",
                      fontSize: "11px",
                    }}
                  >
                    {garminError}
                  </div>
                )}
              </div>
            )}

            {/* Standard error log */}
            {error && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--color-danger-10)",
                  border: "1px solid var(--color-danger-30)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--color-danger)",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: WORKOUT PREVIEW PANEL */}
          {showPreview && (() => {
            const previewZones = athleteZones.find((z) => z.sport === previewWorkout.sport);
            return (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.01)",
                  borderRadius: "var(--radius-lg)",
                  border: "1.5px dashed rgba(255, 255, 255, 0.08)",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  maxHeight: "680px",
                  overflowY: "auto",
                  backdropFilter: "blur(8px)",
                  animation: "scaleIn 0.22s ease-out",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: `${getSportHex(previewWorkout.sport).primary}15`,
                    border: `1.5px solid ${getSportHex(previewWorkout.sport).primary}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "20px"
                  }}>
                    <SportIcon sport={previewWorkout.sport} size={20} color={getSportHex(previewWorkout.sport).primary} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {previewWorkout.name}
                    </h3>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                      Structured {previewWorkout.sport} Plan
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 8px",
                  textAlign: "center"
                }}>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Duration</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                      {previewWorkout.estimatedDuration ? formatDuration(previewWorkout.estimatedDuration) : "--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Distance</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                      {previewWorkout.estimatedDistance && previewWorkout.estimatedDistance > 0
                        ? formatDistance(previewWorkout.estimatedDistance)
                        : "--"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Est. Load</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                      {Math.round(previewWorkout.estimatedTss ?? 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Intensity</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                      {previewWorkout.averageIntensity ?? Math.round((INTENSITY_FACTOR[previewWorkout.sport] ?? 0.7) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Step Viz Bar */}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>Zone Distribution</div>
                  <WorkoutStepViz
                    sport={previewWorkout.sport}
                    zoneDistribution={Object.values(calculateWorkoutZoneDurations(previewWorkout.steps).zones)}
                    height={16}
                  />
                </div>

                {/* Chart timeline */}
                <div style={{ marginTop: "4px" }}>
                  <InteractiveWorkoutChart
                    steps={previewWorkout.steps}
                    sport={previewWorkout.sport}
                    athleteZones={previewZones}
                  />
                </div>

                {/* Steps Instructions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)" }}>Workout Profile Steps</div>
                  <div style={{
                    maxHeight: "120px",
                    overflowY: "auto",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px",
                    fontSize: "11px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}>
                    {previewWorkout.steps.map((step, idx) => (
                      <div key={idx}>
                        {renderWorkoutStepInstructions(step, previewWorkout.sport, idx, previewZones)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Footer Actions */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-5)",
          borderTop: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        {/* Delete (Edit mode only) */}
        {!isCreateMode && event && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: "var(--space-2) var(--space-3)",
              background: "transparent",
              border: "1px solid var(--color-danger-40)",
              borderRadius: "var(--radius-sm)",
              color: "var(--color-danger)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.5 : 1,
            }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "var(--space-2) var(--space-4)",
            background: "var(--bg-input)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !canSubmit}
          style={{
            padding: "var(--space-2) var(--space-5)",
            background: submitting || !canSubmit ? "var(--color-accent-40)" : "var(--color-accent)",
            border: "none",
            borderRadius: "var(--radius-sm)",
            color: "white",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: submitting || !canSubmit ? "not-allowed" : "pointer",
            transition: "background var(--duration-micro) ease-out",
          }}
        >
          {submitting
            ? "Saving…"
            : isCreateMode
            ? selectedType === "workout"
              ? "Add Workout"
              : selectedType === "rest"
              ? "Add Rest Day"
              : selectedType === "race"
              ? "Add Race Day"
              : "Add Note"
            : "Save Changes"}
        </button>
      </div>
    </Overlay>
  );
}
