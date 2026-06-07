// src/lib/types/settings.ts
// Type definitions for CoachFit settings surfaces.
// Aligned with docs/05-api-design.md — /athlete, /athlete/zones,
// /athlete/connections, /api-keys, /subscription endpoints.

/* ─── Athlete profile ──────────────────────────────────────────────────────── */

export type Sport = "cycling" | "running" | "swimming" | "strength" | "other";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced" | "elite";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type UnitSystem = "metric" | "imperial";

export interface AthleteProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: "athlete" | "coach" | "admin";
  tier: "free" | "pro" | "elite" | "coach" | "admin";
  /** Null for brand-new accounts that haven't completed onboarding */
  profile: {
    sports: Sport[];
    primarySport: Sport | null;
    experienceLevel: ExperienceLevel | null;
    weightKg: number | null;
    gender: Gender | null;
  } | null;
  /** Null for brand-new accounts */
  settings: {
    locale: string;
    units: UnitSystem;
    timezone: string;
  } | null;
}

export interface AthleteProfileUpdateRequest {
  fullName?: string;
  profile?: {
    sports?: Sport[];
    primarySport?: Sport | null;
    experienceLevel?: ExperienceLevel | null;
    weightKg?: number | null;
    gender?: Gender | null;
  };
  settings?: {
    locale?: string;
    units?: UnitSystem;
    timezone?: string;
  };
}

/* ─── Training zones ───────────────────────────────────────────────────────── */

export interface ZoneDefinition {
  zone: number; // 1–7
  name: string;
  /** Generic min value (bpm for HR zones, watts for power zones) */
  min?: number | null;
  /** Generic max value */
  max?: number | null;
}

export interface SportZones {
  id?: string;
  sport: Sport;
  zoneType?: string;
  /** FTP in watts (cycling) — backend field: `ftp` */
  ftp?: number | null;
  /** Lactate threshold HR in bpm — backend field: `lthr` */
  lthr?: number | null;
  /** Max heart rate in bpm — backend field: `maxHr` */
  maxHr?: number | null;
  /** Threshold pace in seconds per km (running) or seconds per 100m (swimming).
   *  Backend field: `threshold_pace` (INTEGER). Display as mm:ss in UI. */
  thresholdPace?: number | null;
  /** Critical Swim Speed in seconds per 100m.
   *  Backend field: `css` (INTEGER). Display as mm:ss in UI. */
  css?: number | null;
  zones: ZoneDefinition[];
  effectiveDate?: string | null; // YYYY-MM-DD
}

export type ZonesResponse = SportZones[];

/* ─── Connected accounts ───────────────────────────────────────────────────── */

export type ConnectionProvider = "strava" | "garmin" | "google";

export interface ConnectedAccount {
  provider: ConnectionProvider;
  connectedAt: string; // ISO date
  athleteName?: string | null;
  externalId?: string | null;
  scopes?: string[];
}

export type ConnectionsResponse = ConnectedAccount[];

/* ─── API keys ─────────────────────────────────────────────────────────────── */

export interface ApiKey {
  id: string;
  name: string;
  /** Prefix shown for identification — backend field: `keyPrefix` */
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface ApiKeyCreateRequest {
  name: string;
  /** ISO-8601 timestamp or null for non-expiring — backend field: `expiresAt` */
  expiresAt?: string | null;
}

export interface ApiKeyCreateResponse extends ApiKey {
  /** Full key — only returned once at creation time — backend field: `rawKey` */
  rawKey: string;
}

/* ─── Subscription ─────────────────────────────────────────────────────────── */

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Subscription {
  tier: "free" | "pro" | "elite";
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null; // ISO date
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}
