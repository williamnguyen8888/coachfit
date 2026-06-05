"use client";

/**
 * ActivityCard — a single activity row / card in the list.
 * Supports "grid" and "list" layouts.
 *
 * Displays: sport icon, name, date, key metrics (distance, duration, HR, power, TSS),
 * and a source badge. Highlighted variant uses the sport's accent colour on the left border.
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
  hiking: "#84cc16",
  walking: "#a78bfa",
  other: "var(--sport-other)",
};

const sportGlowVar: Record<Sport, string> = {
  cycling: "var(--sport-cycling-glow, rgba(59, 130, 246, 0.15))",
  running: "var(--sport-running-glow, rgba(34, 197, 94, 0.15))",
  swimming: "var(--sport-swimming-glow, rgba(6, 182, 212, 0.15))",
  strength: "var(--sport-strength-glow, rgba(249, 115, 22, 0.15))",
  hiking: "rgba(132, 204, 22, 0.15)",
  walking: "rgba(167, 139, 250, 0.15)",
  other: "var(--sport-other-glow, rgba(107, 114, 128, 0.1))",
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
  isHighIntensity?: boolean;
}

function MetricChip({ icon, value, label, isHighIntensity }: MetricChipProps) {
  return (
    <div
      className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-[var(--radius-sm)] border border-[rgba(255,255,255,0.02)] bg-[rgba(255,255,255,0.01)] transition-all duration-200 hover:bg-[rgba(255,255,255,0.03)]"
      title={label}
      aria-label={`${label}: ${value}`}
    >
      <span 
        className={isHighIntensity ? "animate-pulse" : ""} 
        style={{ color: isHighIntensity ? "var(--color-danger)" : "var(--text-muted)" }} 
        aria-hidden="true"
      >
        {icon}
      </span>
      <span
        className="tabular-nums text-xs sm:text-token-sm"
        style={{
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
  viewMode?: "grid" | "list";
  /** Called when the card is clicked (future: navigate to detail) */
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

  const [hovered, setHovered] = React.useState(false);

  const accentColor = sportColorVar[sport] ?? sportColorVar.other;
  const glowColor = sportGlowVar[sport] ?? sportGlowVar.other;

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
      isHighIntensity: avgHeartRate > 150,
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

  const customStyle: React.CSSProperties = {
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: hovered 
      ? `0 10px 30px -5px ${glowColor}, 0 0 15px ${glowColor}` 
      : "var(--shadow-sm)",
    borderColor: hovered ? accentColor : undefined,
    transform: hovered ? "translateY(-2px)" : "none",
  };

  if (viewMode === "grid") {
    return (
      <Card
        variant="highlighted"
        accentColor={accentColor}
        className={`${onClick ? "cursor-pointer" : ""} flex flex-col justify-between h-full`}
        onClick={onClick ? () => onClick(id) : undefined}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
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
        style={customStyle}
      >
        <div>
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div
              aria-hidden="true"
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--radius-md)",
                background: `linear-gradient(135deg, ${accentColor}2A 0%, ${accentColor}0A 100%)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: `1px solid ${accentColor}20`,
              }}
            >
              <SportIcon sport={sport} size={22} />
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
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              {formatActivityDate(startedAt)} · {formatActivityTime(startedAt)}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        {metrics.length > 0 && (
          <div
            className="grid grid-cols-2 gap-2 pt-3"
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

  // List View (sleek table row)
  return (
    <Card
      variant="highlighted"
      accentColor={accentColor}
      className={onClick ? "cursor-pointer" : ""}
      onClick={onClick ? () => onClick(id) : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      style={customStyle}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon + Title details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              borderRadius: "var(--radius-md)",
              background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}05 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              border: `1px solid ${accentColor}15`,
            }}
          >
            <SportIcon sport={sport} size={18} />
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
            <p
              className="shrink-0"
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

        {/* Right: Metrics + Source badge */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
          {metrics.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
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
