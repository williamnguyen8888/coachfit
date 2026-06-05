// src/lib/types/analytics.ts
// Type definitions for Phase 2 Analytics APIs — aligned to docs/05-api-design.md § Training Load

// ─── PMC (Performance Management Chart) ──────────────────────────────────────

export interface PmcPoint {
  date: string;   // YYYY-MM-DD
  ctl: number;    // Chronic Training Load (fitness)
  atl: number;    // Acute Training Load (fatigue)
  tsb: number;    // Training Stress Balance (form)
  tss: number;    // Training Stress Score for that day
}

export interface PmcResponse {
  points: PmcPoint[];
}

// ─── Power Duration Curve ─────────────────────────────────────────────────────

export interface PowerCurvePoint {
  /** Duration in seconds (e.g. 5, 30, 60, 300, 1200, 3600) */
  duration: number;
  /** Mean maximal power in watts */
  power: number;
}

export interface PowerCurveResponse {
  /** FTP in watts (null if not set) */
  ftp: number | null;
  points: PowerCurvePoint[];
}

// ─── Zone Distribution ────────────────────────────────────────────────────────

export interface ZoneDistributionEntry {
  /** Zone number (1–7) */
  zone: number;
  /** Human-readable zone name (e.g. "Recovery", "Endurance") */
  name: string;
  /** Time in zone in seconds */
  seconds: number;
  /** Percentage of total time in this zone (0–100) */
  percentage: number;
}

export interface ZoneDistributionResponse {
  sport: string | null;
  from: string | null; // YYYY-MM-DD
  to: string | null;   // YYYY-MM-DD
  zones: ZoneDistributionEntry[];
  /** Total time across all zones in seconds */
  totalSeconds: number;
}
