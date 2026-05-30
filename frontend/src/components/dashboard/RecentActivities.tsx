"use client";
// src/components/dashboard/RecentActivities.tsx
// Feed of last 3-5 activities: sport icon, name, date, distance, duration, TSS.
// Mobile: slim list rows. No map thumbnails (dashboard constraint).

import React from "react";
import { clsx } from "clsx";
import {
  Bike,
  Footprints,
  Waves,
  Dumbbell,
  Activity,
  ChevronRight,
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
  if (meters === null) return "";
  // Swimming — show in meters
  if (sport === "swimming") {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${Math.round(meters)}m`;
  }
  // Others — km
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

function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    strava: "Strava",
    garmin: "Garmin",
    manual: "Manual",
    upload: "Upload",
  };
  return map[source] ?? source;
}

/* ─── Activity row ───────────────────────────────────────────────────── */

function ActivityRow({ activity }: { activity: ActivitySummary }) {
  const color = sportColor(activity.sport);
  const hasDistance = activity.distanceMeters !== null && activity.distanceMeters > 0;
  const hasTss = activity.tss !== null && activity.tss > 0;

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="flex items-center gap-3 group -mx-1 px-1 py-2.5 rounded-[var(--radius-md)] transition-all duration-[var(--duration-micro)] hover:bg-[var(--bg-elevated)]"
      style={{ borderBottom: "1px solid var(--border-subtle)" }}
    >
      {/* Sport icon */}
      <div
        className="flex-shrink-0 rounded-[var(--radius-sm)] p-2 flex items-center justify-center"
        style={{ background: `${color}18`, color }}
      >
        <SportIcon sport={activity.sport} size={15} />
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p
          className="truncate font-medium"
          style={{ fontSize: "var(--text-sm)", color: "var(--text-primary)" }}
        >
          {activity.name}
        </p>
        <div
          className="flex items-center gap-2 mt-0.5"
          style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}
        >
          <span>{formatRelativeDate(activity.startedAt)}</span>
          {hasDistance && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{formatDistance(activity.distanceMeters, activity.sport)}</span>
            </>
          )}
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{formatDuration(activity.durationSeconds)}</span>
          {hasTss && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <span
                className="font-metric tabular-nums"
                style={{ color: "var(--color-fatigue)" }}
              >
                {Math.round(activity.tss!)} TSS
              </span>
            </>
          )}
        </div>
      </div>

      {/* Source badge + chevron */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span
          className="rounded-full px-2 py-0.5"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {sourceLabel(activity.source)}
        </span>
        <ChevronRight
          size={14}
          style={{ color: "var(--text-muted)", opacity: 0.5 }}
          className="transition-opacity group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </div>
    </Link>
  );
}

/* ─── Empty state ─────────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 py-8"
      style={{ color: "var(--text-muted)" }}
    >
      <Activity size={28} strokeWidth={1.5} />
      <p style={{ fontSize: "var(--text-sm)" }}>No recent activities</p>
      <p style={{ fontSize: "var(--text-xs)" }}>
        Sync from Strava or upload a file to get started
      </p>
    </div>
  );
}

/* ─── Loading skeleton ────────────────────────────────────────────────── */

export function RecentActivitiesSkeleton() {
  return (
    <div
      className="rounded-[var(--radius-xl)] p-5 flex flex-col gap-3"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      <Skeleton width="140px" height="20px" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <Skeleton shape="circle" width="36px" height="36px" />
          <div className="flex-1 flex flex-col gap-1">
            <Skeleton width="60%" height="14px" />
            <Skeleton width="40%" height="11px" />
          </div>
          <Skeleton width="48px" height="20px" />
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
      className={clsx("rounded-[var(--radius-xl)] p-5 flex flex-col gap-1", className)}
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2
          className="font-semibold"
          style={{ fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
        >
          Recent Activities
        </h2>
        <Link
          href="/activities"
          className="flex items-center gap-0.5 transition-opacity hover:opacity-80"
          style={{ fontSize: "var(--text-xs)", color: "var(--color-accent)" }}
        >
          View all
          <ChevronRight size={12} strokeWidth={2} />
        </Link>
      </div>

      {/* List */}
      {activities.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col">
          {activities.slice(0, 5).map((a) => (
            <ActivityRow key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}
