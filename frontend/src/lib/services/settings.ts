// src/lib/services/settings.ts
// API service layer for the CoachFit settings surfaces.
//
// Covered endpoints (docs/05-api-design.md):
//   GET/PUT  /athlete             — profile
//   GET/PUT  /athlete/zones/{sport}
//   GET/DEL  /athlete/connections — connected platforms
//   GET/POST/DEL /api-keys
//   GET      /subscription

import { api } from "@/lib/api";
import type {
  AthleteProfile,
  AthleteProfileUpdateRequest,
  ZonesResponse,
  SportZones,
  Sport,
  ConnectionsResponse,
  ApiKey,
  ApiKeyCreateRequest,
  ApiKeyCreateResponse,
  Subscription,
} from "@/lib/types/settings";

/* ─── Athlete profile ──────────────────────────────────────────────────────── */

export const athleteService = {
  /** GET /athlete — fetch current profile */
  getProfile: (): Promise<AthleteProfile> =>
    api.get<AthleteProfile>("/athlete"),

  /** PUT /athlete — update profile fields */
  updateProfile: (body: AthleteProfileUpdateRequest): Promise<AthleteProfile> =>
    api.put<AthleteProfile>("/athlete", body),
};

/* ─── Training zones ───────────────────────────────────────────────────────── */

export const zonesService = {
  /** GET /athlete/zones — list all sport zones */
  listAll: (): Promise<ZonesResponse> =>
    api.get<ZonesResponse>("/athlete/zones"),

  /** PUT /athlete/zones/{sport} — update zones for a sport */
  update: (sport: Sport, body: Partial<SportZones>): Promise<SportZones> =>
    api.put<SportZones>(`/athlete/zones/${sport}`, body),
};

/* ─── Connected accounts ───────────────────────────────────────────────────── */

export const connectionsService = {
  /** GET /athlete/connections — list connected providers */
  list: (): Promise<ConnectionsResponse> =>
    api.get<ConnectionsResponse>("/athlete/connections"),

  /**
   * DELETE /athlete/connections/{provider}
   * Disconnect a platform (Strava, Garmin, …).
   */
  disconnect: (provider: string): Promise<void> =>
    api.delete<void>(`/athlete/connections/${provider}`),

  /**
   * Returns the backend OAuth initiation URL for a provider.
   * The user is navigated to this URL to begin the OAuth flow.
   * Garmin uses OAuth 1.0a; Strava/Google use OAuth 2.0.
   */
  getConnectUrl: (provider: "strava" | "garmin" | "google"): string => {
    const base =
      (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080") + "/api/v1";
    return `${base}/auth/oauth/${provider}`;
  },
};

/* ─── API keys ─────────────────────────────────────────────────────────────── */

export const apiKeysService = {
  /** GET /api-keys */
  list: (): Promise<ApiKey[]> => api.get<ApiKey[]>("/api-keys"),

  /** POST /api-keys */
  create: (body: ApiKeyCreateRequest): Promise<ApiKeyCreateResponse> =>
    api.post<ApiKeyCreateResponse>("/api-keys", body),

  /** DELETE /api-keys/{id} */
  revoke: (id: string): Promise<void> =>
    api.delete<void>(`/api-keys/${id}`),
};

/* ─── Subscription ─────────────────────────────────────────────────────────── */

export const subscriptionService = {
  /** GET /subscription */
  get: (): Promise<Subscription> => api.get<Subscription>("/subscription"),

  /** POST /subscription/checkout — initiate Stripe checkout */
  checkout: (tier: "pro" | "elite"): Promise<{ url: string }> =>
    api.post<{ url: string }>("/subscription/checkout", { tier }),

  /** POST /subscription/portal — customer portal (pro+ only) */
  portal: (): Promise<{ url: string }> =>
    api.post<{ url: string }>("/subscription/portal"),
};
