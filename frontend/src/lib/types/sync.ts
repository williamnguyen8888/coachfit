// src/lib/types/sync.ts
// Types for the sync status API — GET /sync/status, POST /sync/trigger/{provider}

export type SyncState = "idle" | "syncing" | "success" | "error";

export interface ProviderSyncStatus {
  provider: "strava" | "garmin";
  state: SyncState;
  lastSyncAt: string | null; // ISO 8601
  lastError: string | null;
  activitiesSynced: number | null;
}

export interface SyncStatusResponse {
  providers: ProviderSyncStatus[];
}
