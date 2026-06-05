"use client";

/**
 * ActivityHero — top-of-page hero card for the activity detail.
 *
 * Shows: sport icon + name, date/time, source badge, and the primary
 * metrics row (duration, distance, elevation, avg HR, avg power, TSS).
 */

import * as React from "react";
import { ArrowLeft, Clock, Ruler, TrendingUp, Heart, Zap, Mountain, Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SportIcon } from "../SportIcon";
import { SourceBadge } from "../SourceBadge";
import { formatDuration, formatDistance } from "@/lib/utils";
import type { ActivityDetail, Sport } from "@/lib/types/activity";

/* ------------------------------------------------------------------ */
/*  Sport → CSS var                                                      */
/* ------------------------------------------------------------------ */

const sportColorVar: Record<Sport, string> = {
  cycling:  "var(--sport-cycling)",
  running:  "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  hiking:   "#84cc16",
  walking:  "#a78bfa",
  other:    "var(--sport-other)",
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                         */
/* ------------------------------------------------------------------ */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/*  Metric tile                                                          */
/* ------------------------------------------------------------------ */

interface MetricTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function MetricTile({ icon, label, value, sub }: MetricTileProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--text-muted)",
          fontSize: "var(--text-xs)",
          fontWeight: 500,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </div>
      <div
        className="font-metric tabular-nums"
        style={{
          fontSize: "var(--text-2xl)",
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ActivityHero                                                         */
/* ------------------------------------------------------------------ */

interface ActivityHeroProps {
  activity: ActivityDetail;
  onBack?: () => void;
}

export function ActivityHero({ activity, onBack }: ActivityHeroProps) {
  const {
    sport,
    name,
    description,
    startedAt,
    durationSeconds,
    movingTimeSeconds,
    distanceMeters,
    elevationGainMeters,
    avgHeartRate,
    avgPower,
    normalizedPower,
    tss,
    calories,
    source,
  } = activity;

  const accentColor = sportColorVar[sport] ?? sportColorVar.other;

  const tiles: MetricTileProps[] = [];

  tiles.push({
    icon: <Clock size={11} />,
    label: "Duration",
    value: formatDuration(durationSeconds),
    sub: movingTimeSeconds ? `${formatDuration(movingTimeSeconds)} moving` : undefined,
  });

  if (distanceMeters && distanceMeters > 0) {
    tiles.push({
      icon: <Ruler size={11} />,
      label: "Distance",
      value: formatDistance(distanceMeters),
    });
  }

  if (elevationGainMeters && elevationGainMeters > 0) {
    tiles.push({
      icon: <Mountain size={11} />,
      label: "Elevation",
      value: `${Math.round(elevationGainMeters)} m`,
    });
  }

  if (avgHeartRate) {
    tiles.push({
      icon: <Heart size={11} />,
      label: "Avg HR",
      value: `${avgHeartRate}`,
      sub: "bpm",
    });
  }

  if (avgPower) {
    tiles.push({
      icon: <Zap size={11} />,
      label: "Avg Power",
      value: `${avgPower}`,
      sub: normalizedPower ? `${normalizedPower} W NP` : "W",
    });
  }

  if (tss != null) {
    tiles.push({
      icon: <TrendingUp size={11} />,
      label: "TSS",
      value: tss.toFixed(0),
    });
  }

  if (calories) {
    tiles.push({
      icon: <Flame size={11} />,
      label: "Calories",
      value: calories.toLocaleString(),
      sub: "kcal",
    });
  }

  return (
    <Card variant="highlighted" accentColor={accentColor} noPadding style={{ overflow: "visible" }}>
      {/* Header */}
      <div style={{ padding: "var(--space-5)" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-secondary)",
              fontSize: "var(--text-sm)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 0 var(--space-4) 0",
              transition: "color var(--duration-micro) ease-out",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            aria-label="Back to activities"
          >
            <ArrowLeft size={15} />
            All Activities
          </button>
        )}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <div
              aria-hidden="true"
              style={{
                width: 52,
                height: 52,
                borderRadius: "var(--radius-lg)",
                background: `${accentColor}1A`,
                border: `1px solid ${accentColor}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <SportIcon sport={sport} size={26} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h1
                style={{
                  fontSize: "var(--text-xl)",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.25,
                  margin: 0,
                }}
              >
                {name}
              </h1>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 3 }}>
                <SportIcon sport={sport} showLabel size={13} />
                {" · "}
                {fmtDate(startedAt)} at {fmtTime(startedAt)}
              </p>
              {description && (
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--text-secondary)",
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          <SourceBadge source={source} />
        </div>
      </div>

      {/* Metrics bar */}
      {tiles.length > 0 && (
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            padding: "var(--space-4) var(--space-5)",
            display: "flex",
            gap: "var(--space-8)",
            flexWrap: "wrap",
            rowGap: "var(--space-4)",
          }}
        >
          {tiles.map((t) => (
            <MetricTile key={t.label} {...t} />
          ))}
        </div>
      )}
    </Card>
  );
}
