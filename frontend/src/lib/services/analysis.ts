// src/lib/services/analysis.ts
// API service layer for activity compliance analysis report.

import { api } from "@/lib/api";

export interface SummaryComparison {
  plannedDuration: number; // seconds
  actualDuration: number | null; // seconds
  durationCompliance: number; // %

  plannedDistance: number; // meters
  actualDistance: number | null; // meters
  distanceCompliance: number; // %

  plannedTss: number;
  actualTss: number;
  tssCompliance: number; // %

  plannedAvgIntensity: number;
  actualAvgIntensity: number;
  intensityCompliance: number; // %
}

export interface StepAnalysis {
  stepIndex: number;
  stepType: string;
  name: string;
  targetType: string;
  targetValueStr: string;

  plannedDuration: number;
  plannedDistance: number;

  actualDuration: number;
  actualDistance: number;
  actualAvgHr: number;
  actualAvgPower: number;
  actualAvgSpeed: number;
  actualAvgPaceStr: string;

  durationCompliance: number;
  intensityCompliance: number;
  stepCompliance: number;
  isTargetMet: boolean;
  heartRateRecovery?: number | null;
}

export interface ZoneDistributionMatch {
  zone: number;
  zoneName: string;
  plannedPct: number;
  actualPct: number;
}

export interface MetricsAnalysis {
  zoneMatches: ZoneDistributionMatch[];
}

export interface CoachingFeedback {
  rating: 'EXCELLENT' | 'GOOD' | 'INCONSISTENT' | 'UNDERACHIEVED' | 'OVERACHIEVED';
  summary: string;
  pacingFeedback: string;
  durationFeedback: string;
  recommendations: string[];
}

export interface CalendarEventAnalysis {
  eventId: string;
  workoutId: string;
  activityId: string;
  title: string;
  sport: string;
  complianceScore: number;
  summary: SummaryComparison;
  steps: StepAnalysis[];
  metrics: MetricsAnalysis;
  coaching: CoachingFeedback;
}

export const analysisService = {
  /** GET /calendar/{id}/analysis — retrieves detailed comparison report */
  getAnalysis: (eventId: string): Promise<CalendarEventAnalysis> =>
    api.get<CalendarEventAnalysis>(`/calendar/${eventId}/analysis`),
};
