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
  minBpm?: number | null;
  maxBpm?: number | null;
  minWatts?: number | null;
  maxWatts?: number | null;
  minPace?: string | null; // "mm:ss/km"
  maxPace?: string | null;
  description?: string;
}

export interface SportZones {
  sport: Sport;
  ftpWatts?: number | null;       // cycling FTP
  thresholdPace?: string | null;  // running threshold pace mm:ss/km
  lthrBpm?: number | null;        // lactate threshold HR
  maxHrBpm?: number | null;
  zones: ZoneDefinition[];
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
  prefix: string; // e.g. "cfk_abc1..." — last 4 chars visible
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export interface ApiKeyCreateRequest {
  name: string;
  expiresInDays?: number | null;
}

export interface ApiKeyCreateResponse extends ApiKey {
  /** Full key — only returned once at creation time */
  key: string;
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
