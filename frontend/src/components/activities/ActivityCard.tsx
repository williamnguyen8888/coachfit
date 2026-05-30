"use client";

/**
 * ActivityCard — a single activity row / card in the list.
 *
 * Displays: sport icon, name, date, key metrics (distance, duration, HR, power, TSS),
 * and a source badge. Highlighted variant uses the sport's accent colour on the left border.
 *
 * The card is NOT a link to the detail page (that's a separate ticket).
 */

import * as React from "react";
import { Clock, Ruler, Heart, Zap, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SportIcon } from "./SportIcon";
import { SourceBadge } from "./SourceBadge";
import { formatDuration, formatDistance } from "@/lib/utils";
import type { ActivitySummary, Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Sport → CSS var mapping                                             */
/* ------------------------------------------------------------------ */

const sportColorVar: Record<Sport, string> = {
  cycling: "var(--sport-cycling)",
  running: "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  other: "var(--sport-other)",
};

/* ------------------------------------------------------------------ */
/*  Date formatting                                                      */
/* ------------------------------------------------------------------ */

function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Metric chip                                                          */
/* ------------------------------------------------------------------ */

interface MetricChipProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function MetricChip({ icon, value, label }: MetricChipProps) {
  return (
    <div
      className="flex items-center gap-1"
      title={label}
      aria-label={`${label}: ${value}`}
    >
      <span style={{ color: "var(--text-muted)" }} aria-hidden="true">
        {icon}
      </span>
      <span
        className="tabular-nums"
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--text-primary)",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ActivityCard                                                         */
/* ------------------------------------------------------------------ */

export interface ActivityCardProps {
  activity: ActivitySummary;
  /** Called when the card is clicked (future: navigate to detail) */
  onClick?: (id: string) => void;
}

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const {
    id,
    sport,
    name,
    startedAt,
    durationSeconds,
    distanceMeters,
    avgHeartRate,
    avgPower,
    tss,
    source,
  } = activity;

  const accentColor = sportColorVar[sport] ?? sportColorVar.other;

  const metrics: MetricChipProps[] = [];

  if (durationSeconds) {
    metrics.push({
      icon: <Clock size={13} />,
      value: formatDuration(durationSeconds),
      label: "Duration",
    });
  }

  if (distanceMeters && distanceMeters > 0) {
    metrics.push({
      icon: <Ruler size={13} />,
      value: formatDistance(distanceMeters),
      label: "Distance",
    });
  }

  if (avgHeartRate) {
    metrics.push({
      icon: <Heart size={13} />,
      value: `${avgHeartRate} bpm`,
      label: "Avg heart rate",
    });
  }

  if (avgPower) {
    metrics.push({
      icon: <Zap size={13} />,
      value: `${avgPower} W`,
      label: "Avg power",
    });
  }

  if (tss != null) {
    metrics.push({
      icon: <TrendingUp size={13} />,
      value: `${tss.toFixed(0)} TSS`,
      label: "Training stress score",
    });
  }

  return (
    <Card
      variant="highlighted"
      accentColor={accentColor}
      className={onClick ? "cursor-pointer" : ""}
      onClick={onClick ? () => onClick(id) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(id);
              }
            }
          : undefined
      }
      aria-label={`Activity: ${name}`}
      style={{
        transition: `transform var(--duration-micro) ease-out, box-shadow var(--duration-micro) ease-out`,
      }}
    >
      {/* ── Row: Icon + Name + Source + Date ── */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: sport icon + name */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            aria-hidden="true"
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: `${accentColor}1A`, // 10% opacity
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SportIcon sport={sport} size={20} />
          </div>
          <div className="min-w-0">
            <h3
              className="truncate font-semibold"
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {name}
            </h3>
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {formatActivityDate(startedAt)} · {formatActivityTime(startedAt)}
            </p>
          </div>
        </div>

        {/* Right: source badge */}
        <SourceBadge source={source} />
      </div>

      {/* ── Metrics row ── */}
      {metrics.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3"
          style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}
        >
          {metrics.map((m) => (
            <MetricChip key={m.label} {...m} />
          ))}
        </div>
      )}
    </Card>
  );
}
