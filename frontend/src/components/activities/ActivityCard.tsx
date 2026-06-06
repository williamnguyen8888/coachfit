"use client";

/**
 * ActivityCard — a single activity row / card in the list.
 * Supports "grid" and "list" layouts.
 */

import * as React from "react";
import { Clock, Ruler, Heart, Zap, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SportIcon } from "./SportIcon";
import { SourceBadge } from "./SourceBadge";
import { formatDuration, formatDistance } from "@/lib/utils";
import type { ActivitySummary, Sport } from "@/lib/types/activity";

/* ─── Sport color map — token-based only ─────────────────────────────── */

const sportColorVar: Record<Sport, string> = {
  cycling: "var(--sport-cycling)",
  running: "var(--sport-running)",
  swimming: "var(--sport-swimming)",
  strength: "var(--sport-strength)",
  hiking: "var(--sport-hiking)",
  walking: "var(--sport-walking)",
  other: "var(--sport-other)",
};

/* ─── Date formatting ─────────────────────────────────────────────────── */

function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─── Metric chip — icon + value, no bg tint ─────────────────────────── */

interface MetricChipProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  /** Use danger color for icon only — no animation */
  isHighIntensity?: boolean;
}

function MetricChip({ icon, value, label, isHighIntensity }: MetricChipProps) {
  return (
    <div
      className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[var(--radius-sm)]"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-subtle)",
      }}
      title={label}
      aria-label={`${label}: ${value}`}
    >
      <span
        aria-hidden="true"
        style={{ color: isHighIntensity ? "var(--color-danger)" : "var(--text-muted)" }}
      >
        {icon}
      </span>
      <span
        className="tabular-nums"
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--text-primary)",
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── ActivityCard ────────────────────────────────────────────────────── */

export interface ActivityCardProps {
  activity: ActivitySummary;
  viewMode?: "grid" | "list";
  onClick?: (id: string) => void;
}

export function ActivityCard({ activity, viewMode = "list", onClick }: ActivityCardProps) {
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
      icon: <Clock size={12} />,
      value: formatDuration(durationSeconds),
      label: "Duration",
    });
  }

  if (distanceMeters && distanceMeters > 0) {
    metrics.push({
      icon: <Ruler size={12} />,
      value: formatDistance(distanceMeters),
      label: "Distance",
    });
  }

  if (avgHeartRate) {
    metrics.push({
      icon: <Heart size={12} />,
      value: `${avgHeartRate} bpm`,
      label: "Avg heart rate",
      isHighIntensity: avgHeartRate > 150,
    });
  }

  if (avgPower) {
    metrics.push({
      icon: <Zap size={12} />,
      value: `${avgPower} W`,
      label: "Avg power",
    });
  }

  if (tss != null) {
    metrics.push({
      icon: <TrendingUp size={12} />,
      value: `${tss.toFixed(0)} TSS`,
      label: "Training stress score",
    });
  }

  // Hover: only border highlight — no glow, no translate
  const cardStyle: React.CSSProperties = {
    transition: `border-color var(--duration-micro) var(--ease-standard),
                 background var(--duration-micro) var(--ease-standard)`,
  };

  if (viewMode === "grid") {
    return (
      <Card
        variant="highlighted"
        accentColor={accentColor}
        className={`${onClick ? "cursor-pointer interactive-card" : ""} flex flex-col justify-between h-full`}
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
        style={cardStyle}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "var(--bg-elevated)",
                border: `2px solid ${accentColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                color: accentColor,
              }}
            >
              <SportIcon sport={sport} size={20} />
            </div>
            <SourceBadge source={source} />
          </div>

          {/* Title & Date */}
          <div className="mb-4">
            <h3
              className="font-semibold line-clamp-2"
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {name}
            </h3>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 4 }}>
              {formatActivityDate(startedAt)} · {formatActivityTime(startedAt)}
            </p>
          </div>
        </div>

        {/* Metrics */}
        {metrics.length > 0 && (
          <div
            className="flex flex-wrap gap-1.5 pt-3"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            {metrics.map((m) => (
              <MetricChip key={m.label} {...m} />
            ))}
          </div>
        )}
      </Card>
    );
  }

  // List View
  return (
    <Card
      variant="highlighted"
      accentColor={accentColor}
      className={onClick ? "cursor-pointer interactive-card" : ""}
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
      style={cardStyle}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: "var(--bg-elevated)",
              border: `2px solid ${accentColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: accentColor,
            }}
          >
            <SportIcon sport={sport} size={17} />
          </div>
          <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:gap-4">
            <h3
              className="truncate font-semibold sm:max-w-[280px] md:max-w-[360px]"
              style={{
                fontSize: "var(--text-base)",
                color: "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {name}
            </h3>
            <p className="shrink-0" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 2 }}>
              {formatActivityDate(startedAt)} · {formatActivityTime(startedAt)}
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
          {metrics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {metrics.map((m) => (
                <MetricChip key={m.label} {...m} />
              ))}
            </div>
          )}
          <SourceBadge source={source} />
        </div>
      </div>
    </Card>
  );
}
