"use client";

import * as React from "react";
import {
  AlertCircle,
  Gauge,
  Heart,
  Info,
  Timer,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { ActivityDetail, Sport, StreamPoint } from "@/lib/types/activity";
import type { SportZones, ZoneDefinition } from "@/lib/types/settings";

type AnalyticsMode = "power" | "pace" | "heart_rate";

interface ActivityAnalyticsTabProps {
  mode: AnalyticsMode;
  activity: ActivityDetail;
  points: StreamPoint[];
  zoneConfig?: SportZones | null;
}

interface SeriesPoint {
  t: number;
  value: number;
  duration: number;
}

interface HistogramBucket {
  label: string;
  seconds: number;
}

interface PeakPoint {
  label: string;
  value: number;
}

interface MetricChipConfig {
  label: string;
  value: string;
  emphasis?: boolean;
}

interface ZoneDuration {
  zone: number;
  name: string;
  rangeLabel: string;
  seconds: number;
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs.toString().padStart(2, "0")}s`;
  }

  return `${secs}s`;
}

function formatSecondsToPace(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "--:--";
  }

  const rounded = Math.round(totalSeconds);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatWindowLabel(seconds: number): string {
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return `${seconds / 3600}h`;
  }
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60}m`;
  }
  return `${seconds}s`;
}

function getPaceUnit(sport: Sport): string {
  return sport === "swimming" ? "/100m" : "/km";
}

function parseThresholdPaceString(value: string | null | undefined): number | null {
  if (!value) return null;

  const parts = value.split(":").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part) || part < 0)) {
    return null;
  }

  return parts[0] * 60 + parts[1];
}

function getThresholdPaceSeconds(zoneConfig: SportZones | null | undefined): number | null {
  if (!zoneConfig) return null;

  if (typeof zoneConfig.ftp === "number" && zoneConfig.ftp > 0) {
    return zoneConfig.ftp;
  }

  return parseThresholdPaceString(zoneConfig.thresholdPace);
}

function buildSampleDuration(points: StreamPoint[], index: number): number {
  if (points.length <= 1) return 1;

  const current = points[index];
  const next = points[index + 1];
  const previous = points[index - 1];
  const delta = next != null ? next.t - current.t : current.t - (previous?.t ?? current.t - 1);

  if (!Number.isFinite(delta) || delta <= 0 || delta > 60) {
    return 1;
  }

  return delta;
}

function buildSeries(
  points: StreamPoint[],
  extractor: (point: StreamPoint) => number | null | undefined,
): SeriesPoint[] {
  const series: SeriesPoint[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const value = extractor(points[index]);
    if (value == null || !Number.isFinite(value) || value <= 0) {
      continue;
    }

    series.push({
      t: points[index].t,
      value,
      duration: buildSampleDuration(points, index),
    });
  }

  return series;
}

function weightedAverage(series: SeriesPoint[]): number | null {
  if (series.length === 0) return null;

  let weightedSum = 0;
  let totalDuration = 0;

  for (const sample of series) {
    weightedSum += sample.value * sample.duration;
    totalDuration += sample.duration;
  }

  return totalDuration > 0 ? weightedSum / totalDuration : null;
}

function weightedMax(series: SeriesPoint[]): number | null {
  if (series.length === 0) return null;
  return series.reduce((currentMax, sample) => Math.max(currentMax, sample.value), series[0].value);
}

function totalSeriesDuration(series: SeriesPoint[]): number {
  return series.reduce((total, sample) => total + sample.duration, 0);
}

function upperBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (values[mid] <= target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

function computePeakRollingAverage(
  series: SeriesPoint[],
  windowsSeconds: number[],
  preferLower: boolean,
): PeakPoint[] {
  if (series.length === 0) return [];

  const prefixTime = [0];
  const prefixWeighted = [0];

  for (const sample of series) {
    prefixTime.push(prefixTime[prefixTime.length - 1] + sample.duration);
    prefixWeighted.push(prefixWeighted[prefixWeighted.length - 1] + sample.value * sample.duration);
  }

  const totalDuration = prefixTime[prefixTime.length - 1];

  return windowsSeconds.flatMap((windowSeconds) => {
    if (totalDuration < windowSeconds) {
      return [];
    }

    let bestAverage: number | null = null;

    for (let startIndex = 0; startIndex < series.length; startIndex += 1) {
      if (totalDuration - prefixTime[startIndex] < windowSeconds) {
        break;
      }

      const targetTime = prefixTime[startIndex] + windowSeconds;
      const boundaryIndex = upperBound(prefixTime, targetTime) - 1;
      const fullWeighted =
        prefixWeighted[boundaryIndex] - prefixWeighted[startIndex];
      const consumedDuration =
        prefixTime[boundaryIndex] - prefixTime[startIndex];
      const remainingDuration = targetTime - prefixTime[boundaryIndex];
      const partialWeighted =
        remainingDuration > 0 ? remainingDuration * (series[boundaryIndex]?.value ?? 0) : 0;
      const average = (fullWeighted + partialWeighted) / windowSeconds;

      if (
        bestAverage == null
        || (preferLower ? average < bestAverage : average > bestAverage)
      ) {
        bestAverage = average;
      }
    }

    return bestAverage == null
      ? []
      : [{ label: formatWindowLabel(windowSeconds), value: bestAverage }];
  });
}

function buildHistogram(
  series: SeriesPoint[],
  bucketCount: number,
  labelFormatter: (min: number, max: number) => string,
): HistogramBucket[] {
  if (series.length === 0) return [];

  const values = series.map((sample) => sample.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return [];
  }

  if (Math.abs(maxValue - minValue) < Number.EPSILON) {
    return [
      {
        label: labelFormatter(minValue, maxValue),
        seconds: totalSeriesDuration(series),
      },
    ];
  }

  const bucketSize = (maxValue - minValue) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketMin = minValue + bucketSize * index;
    const bucketMax = index === bucketCount - 1 ? maxValue : bucketMin + bucketSize;
    return {
      min: bucketMin,
      max: bucketMax,
      seconds: 0,
    };
  });

  for (const sample of series) {
    const bucketIndex =
      sample.value === maxValue
        ? bucketCount - 1
        : Math.min(bucketCount - 1, Math.floor((sample.value - minValue) / bucketSize));
    buckets[bucketIndex].seconds += sample.duration;
  }

  return buckets.map((bucket) => ({
    label: labelFormatter(bucket.min, bucket.max),
    seconds: bucket.seconds,
  }));
}

function formatRangeValue(mode: AnalyticsMode, value: number, sport: Sport): string {
  if (mode === "pace") {
    return `${formatSecondsToPace(value)} ${getPaceUnit(sport)}`;
  }

  if (mode === "power") {
    return `${Math.round(value)} W`;
  }

  return `${Math.round(value)} bpm`;
}

function formatZoneRange(
  mode: AnalyticsMode,
  band: ZoneDefinition,
  sport: Sport,
): string {
  const min = band.min ?? null;
  const max = band.max ?? null;

  if (min == null && max == null) {
    return "Range not specified";
  }

  if (min != null && max != null) {
    return `${formatRangeValue(mode, min, sport)} to ${formatRangeValue(mode, max, sport)}`;
  }

  if (min != null) {
    return `>= ${formatRangeValue(mode, min, sport)}`;
  }

  return `<= ${formatRangeValue(mode, max ?? 0, sport)}`;
}

function buildZoneDurations(
  series: SeriesPoint[],
  zoneConfig: SportZones | null | undefined,
  mode: AnalyticsMode,
  sport: Sport,
): ZoneDuration[] {
  if (!zoneConfig?.zones?.length) {
    return [];
  }

  const sortedBands = [...zoneConfig.zones].sort((left, right) => left.zone - right.zone);
  const durationByZone = new Map<number, number>();

  for (const band of sortedBands) {
    durationByZone.set(band.zone, 0);
  }

  for (const sample of series) {
    const matchingBand = sortedBands.find((band, index) => {
      const min = band.min ?? Number.NEGATIVE_INFINITY;
      const max = band.max ?? Number.POSITIVE_INFINITY;
      const isLastBand = index === sortedBands.length - 1;

      return sample.value >= min && (isLastBand ? sample.value <= max : sample.value < max);
    });

    if (!matchingBand) {
      continue;
    }

    durationByZone.set(
      matchingBand.zone,
      (durationByZone.get(matchingBand.zone) ?? 0) + sample.duration,
    );
  }

  return sortedBands.map((band) => ({
    zone: band.zone,
    name: band.name,
    rangeLabel: formatZoneRange(mode, band, sport),
    seconds: durationByZone.get(band.zone) ?? 0,
  }));
}

function histogramLabelFormatter(
  mode: AnalyticsMode,
  sport: Sport,
): (min: number, max: number) => string {
  return (min, max) => {
    if (mode === "pace") {
      return `${formatSecondsToPace(min)}-${formatSecondsToPace(max)}`;
    }

    const suffix = mode === "power" ? "W" : "bpm";
    return `${Math.round(min)}-${Math.round(max)} ${suffix}`;
  };
}

function formatMetricValue(mode: AnalyticsMode, sport: Sport, value: number): string {
  if (mode === "pace") {
    return `${formatSecondsToPace(value)} ${getPaceUnit(sport)}`;
  }

  if (mode === "power") {
    return `${Math.round(value)} W`;
  }

  return `${Math.round(value)} bpm`;
}

function buildMetricChips(
  mode: AnalyticsMode,
  activity: ActivityDetail,
  sport: Sport,
  series: SeriesPoint[],
  peakCurve: PeakPoint[],
  zoneConfig: SportZones | null | undefined,
): MetricChipConfig[] {
  const totalDuration = totalSeriesDuration(series);
  const avgValue = weightedAverage(series);
  const maxValue = weightedMax(series);

  const chips: Array<MetricChipConfig | null> = [
    {
      label: "Telemetry Samples",
      value: series.length.toLocaleString(),
    },
    {
      label: "Coverage",
      value: formatDuration(totalDuration),
    },
  ];

  if (mode === "power") {
    chips.push(
      activity.avgPower != null || avgValue != null
        ? {
            label: "Avg Power",
            value: `${Math.round(activity.avgPower ?? avgValue ?? 0)} W`,
          }
        : null,
      maxValue != null
        ? {
            label: "Peak Power",
            value: `${Math.round(maxValue)} W`,
          }
        : null,
      activity.normalizedPower != null
        ? {
            label: "Normalized Power",
            value: `${activity.normalizedPower} W`,
            emphasis: true,
          }
        : null,
      activity.intensityFactor != null
        ? {
            label: "Intensity Factor",
            value: activity.intensityFactor.toFixed(3),
            emphasis: true,
          }
        : null,
      zoneConfig?.ftp != null
        ? {
            label: "FTP Anchor",
            value: `${zoneConfig.ftp} W`,
          }
        : null,
      activity.tss != null
        ? {
            label: "TSS",
            value: activity.tss.toFixed(1),
            emphasis: true,
          }
        : null,
    );
  } else if (mode === "pace") {
    const bestFiveMinute = peakCurve.find((point) => point.label === "5m") ?? peakCurve[0] ?? null;
    const thresholdPace = getThresholdPaceSeconds(zoneConfig);

    chips.push(
      avgValue != null || activity.avgSpeed != null
        ? {
            label: sport === "swimming" ? "Avg Swim Pace" : "Avg Pace",
            value:
              activity.avgSpeed != null
                ? `${formatSecondsToPace(sport === "swimming" ? 100 / activity.avgSpeed : 1000 / activity.avgSpeed)} ${getPaceUnit(sport)}`
                : formatMetricValue("pace", sport, avgValue ?? 0),
          }
        : null,
      bestFiveMinute != null
        ? {
            label: `Best ${bestFiveMinute.label}`,
            value: formatMetricValue("pace", sport, bestFiveMinute.value),
          }
        : null,
      thresholdPace != null
        ? {
            label: sport === "swimming" ? "CSS Anchor" : "Threshold Pace",
            value: `${formatSecondsToPace(thresholdPace)} ${getPaceUnit(sport)}`,
            emphasis: true,
          }
        : null,
      activity.avgCadence != null
        ? {
            label: sport === "swimming" ? "Avg Stroke Rate" : "Avg Cadence",
            value: `${activity.avgCadence} spm`,
          }
        : null,
      activity.movingTimeSeconds != null
        ? {
            label: "Moving Time",
            value: formatDuration(activity.movingTimeSeconds),
          }
        : null,
    );
  } else {
    const timeAboveThreshold =
      zoneConfig?.lthr != null
        ? formatDuration(
            series.reduce(
              (total, sample) => total + (sample.value >= zoneConfig.lthr! ? sample.duration : 0),
              0,
            ),
          )
        : null;

    chips.push(
      activity.avgHeartRate != null || avgValue != null
        ? {
            label: "Avg Heart Rate",
            value: `${Math.round(activity.avgHeartRate ?? avgValue ?? 0)} bpm`,
          }
        : null,
      activity.maxHeartRate != null || maxValue != null
        ? {
            label: "Peak Heart Rate",
            value: `${Math.round(activity.maxHeartRate ?? maxValue ?? 0)} bpm`,
          }
        : null,
      zoneConfig?.lthr != null
        ? {
            label: "LTHR Anchor",
            value: `${zoneConfig.lthr} bpm`,
            emphasis: true,
          }
        : null,
      zoneConfig?.maxHr != null
        ? {
            label: "Max HR Anchor",
            value: `${zoneConfig.maxHr} bpm`,
          }
        : null,
      timeAboveThreshold != null
        ? {
            label: "Time >= LTHR",
            value: timeAboveThreshold,
          }
        : null,
    );
  }

  return chips.filter((chip): chip is MetricChipConfig => chip != null);
}

function emptyStateCopy(mode: AnalyticsMode, sport: Sport): { title: string; body: string } {
  if (mode === "power") {
    return {
      title: "No power telemetry available",
      body: "This activity does not include a power stream, so power analytics cannot be calculated from the uploaded file.",
    };
  }

  if (mode === "pace") {
    return {
      title: sport === "swimming" ? "No swim pace telemetry available" : "No pace telemetry available",
      body: "This activity does not include a usable speed stream, so pace analytics cannot be calculated from the uploaded file.",
    };
  }

  return {
    title: "No heart-rate telemetry available",
    body: "This activity does not include a heart-rate stream, so heart-rate analytics cannot be calculated from the uploaded file.",
  };
}

function zoneStatusCopy(
  mode: AnalyticsMode,
  sport: Sport,
  zoneConfig: SportZones | null | undefined,
): string {
  const effectiveDate =
    zoneConfig?.effectiveDate != null
      ? `effective ${new Date(zoneConfig.effectiveDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}`
      : "with no effective date recorded";

  if (zoneConfig?.zones?.length) {
    if (mode === "power") {
      return `Zone distribution uses your cycling power profile (${effectiveDate}).`;
    }

    if (mode === "pace") {
      return `Zone distribution uses your ${sport === "swimming" ? "swim CSS" : "running threshold pace"} profile (${effectiveDate}).`;
    }

    return `Zone distribution uses your heart-rate profile (${effectiveDate}).`;
  }

  if (mode === "power") {
    return "No power-zone profile is configured, so this tab shows raw power analytics only.";
  }

  if (mode === "pace") {
    return `No ${sport === "swimming" ? "CSS" : "threshold pace"} profile is configured, so this tab shows raw pace analytics only.`;
  }

  return "No heart-rate zone profile is configured, so this tab shows raw heart-rate analytics only.";
}

function peakWindowConfig(mode: AnalyticsMode, sport: Sport): number[] {
  if (mode === "power") {
    return [5, 60, 300, 1200];
  }

  if (mode === "pace") {
    return sport === "swimming" ? [30, 60, 180, 600] : [30, 60, 300, 1200];
  }

  return [60, 300, 1200];
}

function sectionTitle(mode: AnalyticsMode, sport: Sport): string {
  if (mode === "power") {
    return "Power Analytics";
  }

  if (mode === "pace") {
    return sport === "swimming" ? "Swim Pace Analytics" : "Pace Analytics";
  }

  return "Heart-Rate Analytics";
}

export function ActivityAnalyticsTab({
  mode,
  activity,
  points,
  zoneConfig,
}: ActivityAnalyticsTabProps) {
  const sport = activity.sport;

  const series = React.useMemo(() => {
    if (mode === "power") {
      return buildSeries(points, (point) => point.power);
    }

    if (mode === "pace") {
      return buildSeries(points, (point) => {
        if (point.speed == null || point.speed <= 0.1) {
          return null;
        }

        return sport === "swimming" ? 100 / point.speed : 1000 / point.speed;
      });
    }

    return buildSeries(points, (point) => point.hr);
  }, [mode, points, sport]);

  const histogram = React.useMemo(
    () => buildHistogram(series, 7, histogramLabelFormatter(mode, sport)),
    [mode, series, sport],
  );

  const peakCurve = React.useMemo(
    () => computePeakRollingAverage(series, peakWindowConfig(mode, sport), mode === "pace"),
    [mode, series, sport],
  );

  const zoneDurations = React.useMemo(
    () => buildZoneDurations(series, zoneConfig, mode, sport),
    [mode, series, sport, zoneConfig],
  );

  const metricChips = React.useMemo(
    () => buildMetricChips(mode, activity, sport, series, peakCurve, zoneConfig),
    [activity, mode, peakCurve, series, sport, zoneConfig],
  );

  const zoneDurationTotal = totalSeriesDuration(series);
  const copy = emptyStateCopy(mode, sport);
  const modeTitle = sectionTitle(mode, sport);

  if (series.length === 0) {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-border-subtle bg-bg-elevated p-2 text-danger">
            <AlertCircle size={16} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-text-primary">{copy.title}</h2>
            <p className="text-sm text-text-secondary">{copy.body}</p>
            <p className="text-xs text-text-muted">
              Summary cards and raw activity metadata remain available in the DATA tab.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Info size={15} className="text-accent" />
          <h2 className="text-base font-semibold text-text-primary">{modeTitle}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-lg border border-border-subtle bg-bg-elevated/40 p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Data Inputs
            </div>
            <p className="text-sm text-text-secondary">
              {zoneStatusCopy(mode, sport, zoneConfig)} All calculations in this tab use parsed
              telemetry from the uploaded activity; no synthetic defaults are injected.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {metricChips.map((chip) => (
              <div
                key={chip.label}
                className="rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  {chip.label}
                </div>
                <div
                  className={`mt-1 text-sm font-semibold ${
                    chip.emphasis ? "text-accent" : "text-text-primary"
                  }`}
                >
                  {chip.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            {mode === "power" ? (
              <Zap size={16} className="text-fitness" />
            ) : mode === "pace" ? (
              <Timer size={16} className="text-accent" />
            ) : (
              <Heart size={16} className="text-danger" />
            )}
            <h3 className="text-sm font-semibold text-text-primary">Time In Distribution</h3>
          </div>

          {zoneDurations.length > 0 ? (
            <div className="flex flex-col gap-3">
              {zoneDurations.map((zone) => {
                const percentage = zoneDurationTotal > 0 ? (zone.seconds / zoneDurationTotal) * 100 : 0;

                return (
                  <div key={zone.zone} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <div className="font-semibold text-text-primary">
                          Z{zone.zone} - {zone.name}
                        </div>
                        <div className="text-xs text-text-muted">{zone.rangeLabel}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold text-text-primary">{formatDuration(zone.seconds)}</div>
                        <div className="text-xs text-text-muted">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-bg-input">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-default bg-bg-elevated/30 p-4">
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-text-primary">
                <Info size={14} className="text-accent" />
                Zone profile unavailable
              </div>
              <p className="text-sm text-text-secondary">
                This activity still exposes raw distribution and peak-effort analytics, but time in
                zone is hidden until the matching athlete threshold profile exists.
              </p>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Gauge size={16} className="text-warning" />
            <h3 className="text-sm font-semibold text-text-primary">Distribution Histogram</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogram} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                  interval={0}
                  angle={histogram.length > 5 ? -20 : 0}
                  textAnchor={histogram.length > 5 ? "end" : "middle"}
                  height={histogram.length > 5 ? 56 : 32}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => formatDuration(value)}
                />
                <Tooltip
                  formatter={(value) => [formatDuration(Number(value ?? 0)), "Time"]}
                  labelFormatter={(label) => String(label)}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar
                  dataKey="seconds"
                  fill={mode === "heart_rate" ? "var(--color-danger)" : "var(--color-accent)"}
                  radius={[4, 4, 0, 0]}
                  name="Time"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-success" />
            <h3 className="text-sm font-semibold text-text-primary">Peak Rolling Curve</h3>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakCurve} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
                <defs>
                  <linearGradient id={`activity-curve-${mode}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={{ stroke: "var(--border-subtle)" }}
                  tickLine={false}
                />
                <YAxis
                  reversed={mode === "pace"}
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => {
                    if (mode === "pace") {
                      return formatSecondsToPace(value);
                    }

                    return Math.round(value).toString();
                  }}
                />
                <Tooltip
                  formatter={(value) => [formatMetricValue(mode, sport, Number(value ?? 0)), "Peak"]}
                  labelFormatter={(label) => `Window: ${String(label)}`}
                  cursor={{ stroke: "var(--border-default)", strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-accent)"
                  strokeWidth={2}
                  fill={`url(#activity-curve-${mode})`}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--color-accent)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Gauge size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-text-primary">Best Efforts</h3>
          </div>
          <div className="flex flex-col gap-3">
            {peakCurve.map((point) => (
              <div
                key={point.label}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-elevated/30 px-3 py-2.5"
              >
                <div className="text-sm font-semibold text-text-primary">{point.label}</div>
                <div className="text-sm font-semibold text-accent">
                  {formatMetricValue(mode, sport, point.value)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
