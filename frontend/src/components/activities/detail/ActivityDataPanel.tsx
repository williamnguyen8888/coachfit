/**
 * ActivityDataPanel.tsx
 * Comprehensive "Data" view — all activity metadata, metrics, gear, source info,
 * and download link. This is the "everything" tab for data nerds.
 */
"use client";

import * as React from "react";
import { useState } from "react";
import {
  AlertCircle,
  Database,
  Download,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, Sport } from "@/lib/types/activity";
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

function DataSection({ title, rows }: { title: string; rows: DataRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
        {title}
      </div>
      <div className="rounded-xl border border-border-subtle overflow-hidden">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-4 py-2.5 text-xs ${
              i < rows.length - 1 ? "border-b border-border-subtle/50" : ""
            } ${i % 2 === 0 ? "bg-bg-elevated/20" : ""}`}
          >
            <span className="text-text-secondary">{row.label}</span>
            <span
              className={`font-semibold ${
                row.emphasis ? "text-accent" : "text-text-primary"
              }`}
            >
              {row.value ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Database size={15} className="text-text-muted" />
          <h2 className="text-base font-bold text-text-primary">Activity Data</h2>
        </div>

        <div className="flex flex-col gap-4">
          <DataSection title="Time" rows={timeSection} />
          <DataSection title="Performance" rows={perfSection} />
          {hrSection.length > 0 && <DataSection title="Heart Rate" rows={hrSection} />}
          {powerSection.length > 0 && <DataSection title="Power & Training Load" rows={powerSection} />}

          {/* Gear */}
          {activity.gear && (
            <div>
              <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">Equipment</div>
              <div className="rounded-xl border border-border-subtle bg-bg-elevated/20 px-4 py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Gear</span>
                  <span className="font-semibold text-text-primary">{activity.gear.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Source & file info */}
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">Source</div>
            <div className="rounded-xl border border-border-subtle overflow-hidden">
              <div className="flex items-center justify-between border-b border-border-subtle/50 bg-bg-elevated/20 px-4 py-2.5 text-xs">
                <span className="text-text-secondary">Source</span>
                <span className="capitalize font-semibold text-text-primary">{activity.source}</span>
              </div>
              {activity.rawFileFormat && (
                <div className="flex items-center justify-between border-b border-border-subtle/50 px-4 py-2.5 text-xs">
                  <span className="text-text-secondary">File Format</span>
                  <span className="font-mono font-bold text-accent uppercase">{activity.rawFileFormat}</span>
                </div>
              )}
              <div className="flex items-center justify-between bg-bg-elevated/20 px-4 py-2.5 text-xs">
                <span className="text-text-secondary">Activity ID</span>
                <span className="font-mono text-text-muted truncate max-w-[200px]">{activity.id}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Download original file */}
      {activity.rawFileFormat && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Download Original File</h3>
              <p className="mt-0.5 text-xs text-text-secondary">
                Download the raw {activity.rawFileFormat} file that was uploaded.
              </p>
            </div>
            <button
              id="download-original-btn"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-elevated px-4 py-2 text-xs font-semibold text-text-primary transition-all hover:bg-accent/10 hover:border-accent/50 disabled:opacity-50"
            >
              <Download size={14} />
              {downloading ? "Generating link…" : `Download .${activity.rawFileFormat.toLowerCase()}`}
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

      {/* Methodology note */}
      <Card>
        <div className="flex items-start gap-3">
          <Info size={15} className="mt-0.5 shrink-0 text-text-muted" />
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
