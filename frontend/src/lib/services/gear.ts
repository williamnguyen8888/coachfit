// src/lib/services/gear.ts
// API service layer for gear management.
// These endpoints are served by GearController.java.
//
// Endpoints:
//   GET    /gear               — list all gear
//   POST   /gear               — add new gear
//   PUT    /gear/{id}          — update gear
//   DELETE /gear/{id}          — remove gear

import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GearType = "bike" | "shoes" | "wetsuit" | "other";

export interface Gear {
  id: string;
  name: string;
  type: GearType;
  brand?: string | null;
  model?: string | null;
  /** Total distance in meters accumulated on this gear */
  totalDistanceMeters: number;
  /** Whether this gear is currently active/in use */
  isRetired: boolean;
  purchasedAt?: string | null;  // ISO date
  notes?: string | null;
}

export interface GearCreateRequest {
  name: string;
  type: GearType;
  brand?: string;
  model?: string;
  purchasedAt?: string | null;
  notes?: string;
}

export type GearUpdateRequest = Partial<GearCreateRequest> & { isRetired?: boolean };

// ─── Service ──────────────────────────────────────────────────────────────────

export const gearService = {
  /** GET /gear — list all gear for the current athlete */
  list: (): Promise<Gear[]> =>
    api.get<Gear[]>("/gear"),

  /** POST /gear — add a new piece of gear */
  create: (body: GearCreateRequest): Promise<Gear> =>
    api.post<Gear>("/gear", body),

  /** PUT /gear/{id} — update gear details or retire it */
  update: (id: string, body: GearUpdateRequest): Promise<Gear> =>
    api.put<Gear>(`/gear/${id}`, body),

  /** DELETE /gear/{id} — permanently remove gear */
  delete: (id: string): Promise<void> =>
    api.delete<void>(`/gear/${id}`),
};
