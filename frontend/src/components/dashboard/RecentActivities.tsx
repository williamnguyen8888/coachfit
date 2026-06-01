"use client";
// src/components/dashboard/RecentActivities.tsx
// Feed of last 3-5 activities: sport icon, name, date, distance, duration, TSS.
// Mobile: slim list rows with source and training-load metadata.

import React from "react";
import { clsx } from "clsx";
import {
  Bike,
  Footprints,
  Waves,
  Dumbbell,
  Activity,
  ChevronRight,
  Clock,
  Flame,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import type { ActivitySummary } from "@/lib/types/activity";

/* ─── helpers ─────────────────────────────────────────────────────────── */

function SportIcon({ sport, size = 16 }: { sport: string; size?: number }) {
  const props = { size, strokeWidth: 1.75 };
  switch (sport) {
    case "cycling":
      return <Bike {...props} />;
    case "running":
      return <Footprints {...props} />;
    case "swimming":
      return <Waves {...props} />;
    case "strength":
      return <Dumbbell {...props} />;
    default:
      return <Activity {...props} />;
  }
}

function sportColor(sport: string): string {
  const map: Record<string, string> = {
    cycling: "var(--sport-cycling)",
    running: "var(--sport-running)",
    swimming: "var(--sport-swimming)",
    strength: "var(--sport-strength)",
  };
  return map[sport] ?? "var(--sport-other)";
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(meters: number | null, sport: string): string {
  if (meters === null || meters === 0) return "";
  if (sport === "swimming") {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${Math.round(meters)}m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)}km`;
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function sourceColor(source?: string | null): string {
  if (!source) return "var(--text-muted)";
  const s = source.toLowerCase();
  if (s === "strava") return "#fc4c02"; // Strava Orange
  if (s === "garmin") return "#007cc3"; // Garmin Connect Blue
  return "var(--text-muted)";
}

function sourceBg(source?: string | null): string {
  if (!source) return "var(--bg-elevated)";
  const s = source.toLowerCase();
  if (s === "strava") return "rgba(252, 76, 2, 0.08)";
  if (s === "garmin") return "rgba(0, 124, 195, 0.08)";
  return "var(--bg-elevated)";
}

function sourceLabel(source?: string | null): string {
  if (!source) return "Manual";
  const s = source.toLowerCase();
  const map: Record<string, string> = {
    strava: "Strava",
    garmin: "Garmin",
    manual: "Manual",
    upload: "Upload",
  };
  return map[s] ?? source;
}

/* ─── Activity card row ────────────────────────────────────────────────── */

function ActivityCardRow({ activity }: { activity: ActivitySummary }) {
  const color = sportColor(activity.sport);
  const hasDistance = activity.distanceMeters !== null && activity.distanceMeters > 0;
  const hasTss = activity.tss !== null && activity.tss > 0;

  // Deriving performance zones dynamically for elite coach dashboard context
  const tssVal = activity.tss ?? 0;
  const intensityLabel = tssVal > 150 ? "Epic load"
                       : tssVal > 100 ? "High stress"
                       : tssVal > 50 ? "Moderate"
                       : "Recovery";

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover-elevation transition-all duration-[var(--duration-micro)] group"
      style={{
        background: "var(--bg-elevated)",
      }}
    >
      {/* Sport icon container with colored glow */}
      <div
        className="flex-shrink-0 rounded-[var(--radius-sm)] p-2.5 flex items-center justify-center"
        style={{ 
          background: `color-mix(in srgb, ${color} 12%, var(--bg-elevated))`, 
          color,
        }}
      >
        <SportIcon sport={activity.sport} size={16} />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <h4
          className="truncate font-semibold tracking-tight transition-colors group-hover:text-[var(--color-accent)]"
          style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
        >
          {activity.name}
        </h4>
        <div
          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 font-medium"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          <span style={{ color: "var(--text-secondary)" }}>{formatRelativeDate(activity.startedAt)}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          {hasDistance && (
            <>
              <span className="font-metric font-semibold text-secondary" style={{ color: "var(--text-secondary)" }}>
                {formatDistance(activity.distanceMeters, activity.sport)}
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
            </>
          )}
          <span className="flex items-center gap-1 font-metric">
            <Clock size={11} className="opacity-60" />
            {formatDuration(activity.durationSeconds)}
          </span>
        </div>
      </div>

      {/* TSS Indicator + Source tag */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {hasTss && (
          <div className="flex flex-col items-end">
            <span 
              className="rounded-[var(--radius-sm)] px-2 py-0.5 font-metric font-bold"
              style={{ 
                fontSize: "11px", 
                color: "var(--color-fatigue)", 
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.15)"
              }}
              title={`Training Stress Score: ${activity.tss}. Intensity label: ${intensityLabel}`}
            >
              {Math.round(activity.tss!)} TSS
            </span>
            <span style={{ fontSize: "8px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>
              {intensityLabel}
            </span>
          </div>
        )}

        <div className="flex flex-col items-end gap-1">
          <span
            className="rounded-full px-2 py-0.5 font-semibold text-[10px] tracking-wide"
            style={{
              color: sourceColor(activity.source),
              background: sourceBg(activity.source),
              border: `1px solid color-mix(in srgb, ${sourceColor(activity.source)} 18%, transparent)`,
            }}
          >
            {sourceLabel(activity.source)}
          </span>
          <ChevronRight
            size={14}
            style={{ color: "var(--text-muted)", opacity: 0.4 }}
            className="transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
            strokeWidth={2.5}
          />
        </div>
      </div>
    </Link>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10 border border-dashed border-[var(--border-default)] rounded-[var(--radius-lg)]"
      style={{ color: "var(--text-muted)", background: "rgba(0,0,0,0.1)" }}
    >
      <div className="rounded-[var(--radius-sm)] p-2.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
        <TrendingUp size={24} strokeWidth={1.5} />
      </div>
      <div className="text-center">
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>No training activities</p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
          Connect fitness apps or upload FIT files to populate feed.
        </p>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ────────────────────────────────────────────────── */

export function RecentActivitiesSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-md)] p-5 flex flex-col gap-4 glass-card"
    >
      <Skeleton width="140px" height="22px" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 border border-[var(--border-subtle)] rounded-[var(--radius-lg)]">
          <Skeleton shape="circle" width="34px" height="34px" />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton width="55%" height="15px" />
            <Skeleton width="35%" height="11px" />
          </div>
          <Skeleton width="55px" height="22px" className="rounded-[var(--radius-sm)]" />
        </div>
      ))}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */

interface Props {
  activities: ActivitySummary[];
  className?: string;
}

export function RecentActivities({ activities, className }: Props) {
  return (
    <div
      className={clsx("rounded-[var(--radius-md)] p-5 flex flex-col gap-3 glass-card", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2
          className="font-bold tracking-tight"
          style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
        >
          Recent activities
        </h2>
        <Link
          href="/activities"
          className="flex items-center gap-0.5 transition-all hover:text-[var(--color-accent)] font-semibold"
          style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)" }}
        >
          View activity list
          <ChevronRight size={13} strokeWidth={2.5} />
        </Link>
      </div>

      {/* List */}
      {activities.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-2.5">
          {activities.slice(0, 4).map((a) => (
            <ActivityCardRow key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}
