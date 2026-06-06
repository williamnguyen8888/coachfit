/**
 * ActivityDataPanel.tsx
 * Comprehensive "Data" view — all activity metadata, metrics, gear, source info,
 * and download link. This is the "everything" tab for data nerds.
 */
"use client";

import * as React from "react";
import { useState } from "react";
import {
  Activity,
  AlertCircle,
  Bike,
  Clock,
  Database,
  Download,
  Flame,
  Heart,
  Info,
  Loader2,
  Mountain,
  Ruler,
  Settings2,
  Tag,
  Waves,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, ActivitySource, Sport } from "@/lib/types/activity";
import { activitiesService } from "@/lib/services/activities";
import { fmtClock, fmtPace, fmtSpeedKph, fmtDuration } from "@/lib/utils/streamUtils";

interface Props {
  activity: ActivityDetail;
}

interface DataRow {
  label: string;
  value: string | null;
  emphasis?: boolean;
}

// ─── Data builders (unchanged logic) ──────────────────────────────────────────

function buildTimeSection(activity: ActivityDetail): DataRow[] {
  return [
    {
      label: "Total Duration",
      value: fmtClock(activity.durationSeconds),
    },
    activity.movingTimeSeconds != null && activity.movingTimeSeconds !== activity.durationSeconds
      ? {
          label: "Moving Time",
          value: fmtClock(activity.movingTimeSeconds),
        }
      : null,
    {
      label: "Started At",
      value: new Date(activity.startedAt).toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    },
  ].filter(Boolean) as DataRow[];
}

function buildPerformanceSection(activity: ActivityDetail): DataRow[] {
  const sport = activity.sport;
  const rows: Array<DataRow | null> = [
    activity.distanceMeters != null
      ? {
          label: "Distance",
          value:
            sport === "swimming"
              ? `${Math.round(activity.distanceMeters)} m`
              : `${(activity.distanceMeters / 1000).toFixed(2)} km`,
        }
      : null,
    activity.elevationGainMeters != null
      ? {
          label: "Elevation Gain",
          value: `+${Math.round(activity.elevationGainMeters)} m`,
        }
      : null,
    activity.avgSpeed != null
      ? {
          label: sport === "running" ? "Avg Pace" : sport === "swimming" ? "Avg Pace" : "Avg Speed",
          value:
            sport === "running"
              ? fmtPace(1000 / activity.avgSpeed, "/km")
              : sport === "swimming"
                ? fmtPace(100 / activity.avgSpeed, "/100m")
                : fmtSpeedKph(activity.avgSpeed),
        }
      : null,
    activity.avgCadence != null
      ? {
          label: sport === "swimming" ? "Avg Stroke Rate" : sport === "running" ? "Avg Cadence" : "Avg Cadence",
          value: `${activity.avgCadence} ${sport === "swimming" ? "spm" : "rpm"}`,
        }
      : null,
    activity.calories != null
      ? { label: "Calories", value: `${activity.calories.toLocaleString()} kcal` }
      : null,
  ];
  return rows.filter(Boolean) as DataRow[];
}

function buildHRSection(activity: ActivityDetail): DataRow[] {
  const rows: Array<DataRow | null> = [
    activity.avgHeartRate != null
      ? { label: "Avg Heart Rate", value: `${activity.avgHeartRate} bpm` }
      : null,
    activity.maxHeartRate != null
      ? { label: "Max Heart Rate", value: `${activity.maxHeartRate} bpm` }
      : null,
  ];
  return rows.filter(Boolean) as DataRow[];
}

function buildPowerSection(activity: ActivityDetail): DataRow[] {
  const rows: Array<DataRow | null> = [
    activity.avgPower != null
      ? { label: "Average Power", value: `${activity.avgPower} W` }
      : null,
    activity.maxPower != null
      ? { label: "Peak Power", value: `${activity.maxPower} W` }
      : null,
    activity.normalizedPower != null
      ? { label: "Normalized Power (NP)", value: `${activity.normalizedPower} W`, emphasis: true }
      : null,
    activity.intensityFactor != null
      ? { label: "Intensity Factor (IF)", value: activity.intensityFactor.toFixed(3), emphasis: true }
      : null,
    activity.tss != null
      ? { label: "Training Stress Score (TSS)", value: Math.round(activity.tss).toString(), emphasis: true }
      : null,
  ];
  return rows.filter(Boolean) as DataRow[];
}

function buildExtendedSection(activity: ActivityDetail): DataRow[] {
  const rows: Array<DataRow | null> = [
    activity.maxSpeed != null
      ? {
          label: "Max Speed",
          value: activity.sport === "running"
            ? fmtPace(1000 / activity.maxSpeed, "/km")
            : `${(activity.maxSpeed * 3.6).toFixed(1)} km/h`,
        }
      : null,
    activity.totalDescentMeters != null && activity.totalDescentMeters > 0
      ? { label: "Total Descent", value: `-${Math.round(activity.totalDescentMeters)} m` }
      : null,
    activity.avgTemperature != null
      ? { label: "Avg Temperature", value: `${activity.avgTemperature.toFixed(1)} °C` }
      : null,
    activity.minAltitude != null
      ? { label: "Min Altitude", value: `${Math.round(activity.minAltitude)} m` }
      : null,
    activity.maxAltitude != null
      ? { label: "Max Altitude", value: `${Math.round(activity.maxAltitude)} m` }
      : null,
    activity.aerobicTrainingEffect != null
      ? { label: "Aerobic Training Effect", value: activity.aerobicTrainingEffect.toFixed(1), emphasis: true }
      : null,
    activity.anaerobicTrainingEffect != null
      ? { label: "Anaerobic Training Effect", value: activity.anaerobicTrainingEffect.toFixed(1), emphasis: true }
      : null,
  ];
  return rows.filter(Boolean) as DataRow[];
}

function buildRunningDynamicsSection(activity: ActivityDetail): DataRow[] {
  if (activity.sport !== "running") return [];
  const rows: Array<DataRow | null> = [
    activity.avgVerticalOscillation != null
      ? { label: "Avg Vertical Oscillation", value: `${activity.avgVerticalOscillation.toFixed(1)} mm` }
      : null,
    activity.avgGroundContactTime != null
      ? { label: "Avg Ground Contact Time", value: `${Math.round(activity.avgGroundContactTime)} ms` }
      : null,
    activity.avgStepLength != null
      ? { label: "Avg Step Length", value: `${(activity.avgStepLength / 1000).toFixed(2)} m` }
      : null,
    activity.avgVerticalRatio != null
      ? { label: "Vertical Ratio", value: `${activity.avgVerticalRatio.toFixed(1)} %` }
      : null,
  ];
  return rows.filter(Boolean) as DataRow[];
}

function buildCyclingTechSection(activity: ActivityDetail): DataRow[] {
  if (activity.sport !== "cycling") return [];
  const rows: Array<DataRow | null> = [
    activity.leftRightBalance != null
      ? { label: "L/R Balance", value: `${activity.leftRightBalance}% / ${100 - activity.leftRightBalance}%` }
      : null,
    activity.avgLeftPedalSmoothness != null
      ? { label: "Pedal Smoothness", value: `${activity.avgLeftPedalSmoothness.toFixed(1)} %` }
      : null,
    activity.avgLeftTorqueEffectiveness != null
      ? { label: "Torque Effectiveness", value: `${activity.avgLeftTorqueEffectiveness.toFixed(1)} %` }
      : null,
  ];
  return rows.filter(Boolean) as DataRow[];
}

function buildSwimmingSection(activity: ActivityDetail): DataRow[] {
  if (activity.sport !== "swimming") return [];
  const rows: Array<DataRow | null> = [
    activity.swimStroke != null
      ? { label: "Swim Stroke", value: activity.swimStroke }
      : null,
    activity.poolLength != null
      ? { label: "Pool Length", value: `${activity.poolLength} m` }
      : null,
    activity.avgSwolf != null
      ? { label: "SWOLF", value: `${activity.avgSwolf.toFixed(0)}` }
      : null,
  ];
  return rows.filter(Boolean) as DataRow[];
}

// ─── UI sub-components ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  iconColor?: string;
}

function SectionHeader({ icon, title, iconColor = "#8b8b9e" }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span style={{ color: iconColor }}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">{title}</span>
      <div className="flex-1 border-t border-border-subtle/60" />
    </div>
  );
}

function DataRowItem({ row, isLast }: { row: DataRow; isLast: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-0 py-2.5 ${
        !isLast ? "border-b border-border-subtle/40" : ""
      }`}
    >
      <span className="text-[11px] text-text-secondary shrink-0">{row.label}</span>
      <span
        className={`font-mono font-bold truncate text-right ${
          row.emphasis
            ? "text-sm text-accent"
            : "text-xs text-text-primary"
        }`}
      >
        {row.value ?? "—"}
      </span>
    </div>
  );
}

interface DataSectionProps {
  title: string;
  rows: DataRow[];
  icon: React.ReactNode;
  iconColor?: string;
}

function DataSection({ title, rows, icon, iconColor }: DataSectionProps) {
  if (rows.length === 0) return null;
  return (
    <div>
      <SectionHeader icon={icon} title={title} iconColor={iconColor} />
      <div>
        {rows.map((row, i) => (
          <DataRowItem key={row.label} row={row} isLast={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: ActivitySource }) {
  const styles: Record<ActivitySource, string> = {
    garmin: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    strava: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    manual: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    upload: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
        styles[source] ?? "bg-zinc-500/15 text-zinc-400 border-zinc-500/30"
      }`}
    >
      {source}
    </span>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ActivityDataPanel({ activity }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await activitiesService.getDownloadUrl(activity.id);
      window.open(res.url, "_blank");
    } catch {
      setDownloadError("Failed to generate download link. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const timeSection = buildTimeSection(activity);
  const perfSection = buildPerformanceSection(activity);
  const hrSection = buildHRSection(activity);
  const powerSection = buildPowerSection(activity);
  const extendedSection = buildExtendedSection(activity);
  const runningDynamicsSection = buildRunningDynamicsSection(activity);
  const cyclingTechSection = buildCyclingTechSection(activity);
  const swimmingSection = buildSwimmingSection(activity);

  const sportIcon =
    activity.sport === "cycling" ? <Bike size={13} /> :
    activity.sport === "swimming" ? <Waves size={13} /> :
    <Activity size={13} />;

  const sportIconColor =
    activity.sport === "cycling" ? "#3b82f6" :
    activity.sport === "swimming" ? "#06b6d4" :
    "#22c55e";

  const rightColSections =
    runningDynamicsSection.length > 0 || cyclingTechSection.length > 0 || swimmingSection.length > 0;

  return (
    <div className="flex flex-col gap-4">

      {/* 2-column grid on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-4">

          {/* Time & Performance */}
          <Card>
            <div className="flex flex-col gap-0">
              <DataSection
                title="Time"
                rows={timeSection}
                icon={<Clock size={13} />}
                iconColor="#8b8b9e"
              />
              {perfSection.length > 0 && (
                <div className="mt-4">
                  <DataSection
                    title="Performance"
                    rows={perfSection}
                    icon={sportIcon}
                    iconColor={sportIconColor}
                  />
                </div>
              )}
              {extendedSection.length > 0 && (
                <div className="mt-4">
                  <DataSection
                    title="Extended Metrics"
                    rows={extendedSection}
                    icon={<Mountain size={13} />}
                    iconColor="#a78bfa"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Power section */}
          {powerSection.length > 0 && (
            <Card>
              <DataSection
                title="Power & Training Load"
                rows={powerSection}
                icon={<Zap size={13} />}
                iconColor="#3b82f6"
              />
            </Card>
          )}

          {/* HR section */}
          {hrSection.length > 0 && (
            <Card>
              <DataSection
                title="Heart Rate"
                rows={hrSection}
                icon={<Heart size={13} />}
                iconColor="#ef4444"
              />
            </Card>
          )}
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">

          {/* Sport-specific sections */}
          {runningDynamicsSection.length > 0 && (
            <Card>
              <DataSection
                title="Running Dynamics"
                rows={runningDynamicsSection}
                icon={<Activity size={13} />}
                iconColor="#22c55e"
              />
            </Card>
          )}

          {cyclingTechSection.length > 0 && (
            <Card>
              <DataSection
                title="Cycling Technique"
                rows={cyclingTechSection}
                icon={<Bike size={13} />}
                iconColor="#3b82f6"
              />
            </Card>
          )}

          {swimmingSection.length > 0 && (
            <Card>
              <DataSection
                title="Swimming"
                rows={swimmingSection}
                icon={<Waves size={13} />}
                iconColor="#06b6d4"
              />
            </Card>
          )}

          {/* Source & File info */}
          <Card>
            <SectionHeader icon={<Database size={13} />} title="Source & File" iconColor="#8b8b9e" />
            <div>
              <div className="flex items-center justify-between py-2.5 border-b border-border-subtle/40">
                <span className="text-[11px] text-text-secondary">Source</span>
                <SourceBadge source={activity.source} />
              </div>
              {activity.rawFileFormat && (
                <div className="flex items-center justify-between py-2.5 border-b border-border-subtle/40">
                  <span className="text-[11px] text-text-secondary">File Format</span>
                  <span className="font-mono text-xs font-bold text-accent uppercase">
                    .{activity.rawFileFormat.toLowerCase()}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[11px] text-text-secondary">Activity ID</span>
                <span className="font-mono text-[10px] text-text-muted truncate max-w-[160px]">{activity.id}</span>
              </div>
            </div>
          </Card>

          {/* Gear */}
          {activity.gear && (
            <Card>
              <SectionHeader icon={<Settings2 size={13} />} title="Equipment" iconColor="#8b8b9e" />
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[11px] text-text-secondary">Gear</span>
                <span className="flex items-center gap-1.5">
                  <Tag size={11} className="text-text-muted" />
                  <span className="text-xs font-semibold text-text-primary">{activity.gear.name}</span>
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Download CTA ── */}
      {activity.rawFileFormat && (
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Download Original File</h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Download the raw{" "}
                <span className="font-mono font-bold text-accent uppercase">
                  .{activity.rawFileFormat.toLowerCase()}
                </span>{" "}
                file that was uploaded.
              </p>
            </div>
            <button
              id="download-original-btn"
              onClick={handleDownload}
              disabled={downloading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-5 py-2.5 text-xs font-bold text-accent transition-all hover:bg-accent/20 hover:border-accent/70 disabled:opacity-50 sm:w-auto"
            >
              {downloading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Generating link…
                </>
              ) : (
                <>
                  <Download size={13} />
                  Download .{activity.rawFileFormat.toLowerCase()}
                </>
              )}
            </button>
          </div>
          {downloadError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              <AlertCircle size={13} />
              {downloadError}
            </div>
          )}
        </Card>
      )}

      {/* ── Data integrity note ── */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated border border-border-subtle">
            <Info size={13} className="text-text-muted" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-text-primary">Data Integrity Note</h3>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              All metrics shown on this page are derived from the original uploaded file or
              calculated using industry-standard formulas (TrainingPeaks methodology):
              NP = 30s rolling avg → 4th power → mean → 4th root;
              IF = NP / FTP; TSS = (duration × NP × IF) / (FTP × 3600) × 100.
              No synthetic data is injected — fields show "—" when data is unavailable.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
