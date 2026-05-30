// src/stores/onboarding.store.ts
// Manages onboarding wizard state: selected sports, experience level, and
// connected device/platform state.  Persisted to sessionStorage so a mid-flow
// refresh does not drop the user back to step 1.
//
// Pattern mirrors auth.store.ts — thin store, side-effects in actions.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Sport =
  | "cycling"
  | "running"
  | "swimming"
  | "triathlon"
  | "strength"
  | "other";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type ConnectProvider = "strava" | "garmin" | "skip";

export type ImportStatus =
  | "idle"
  | "connecting"
  | "importing"
  | "done"
  | "error";

// Per-provider import status (shown in step 3)
export interface ProviderStatus {
  provider: ConnectProvider;
  status: ImportStatus;
  /** Number of activities imported (once done) */
  count?: number;
  /** Error message if status=error */
  error?: string;
}

export interface OnboardingState {
  /** Current wizard step (1-indexed) */
  step: 1 | 2 | 3;
  /** Step 1 — at least one sport must be selected */
  selectedSports: Sport[];
  /** Step 2 */
  experienceLevel: ExperienceLevel | null;
  /** Step 3 — which providers the user chose to connect */
  connectedProviders: ConnectProvider[];
  /** Live import/connect status per provider */
  providerStatuses: ProviderStatus[];
  /** True once the wizard completes (user lands on dashboard) */
  completed: boolean;
}

interface OnboardingActions {
  /** Navigate to a specific step (1-3) */
  setStep: (step: OnboardingState["step"]) => void;

  /** Toggle a sport on/off */
  toggleSport: (sport: Sport) => void;

  /** Set experience level */
  setExperienceLevel: (level: ExperienceLevel) => void;

  /**
   * Initiate Strava OAuth connect.
   * Redirects the browser to the backend OAuth entry point.
   * When backend APIs exist, this is a real redirect; for now it is a
   * stub that sets status=connecting so the UI can show the loading state.
   */
  connectStrava: () => void;

  /**
   * Initiate Garmin OAuth connect.
   * Same pattern as connectStrava.
   */
  connectGarmin: () => void;

  /** Mark a provider as connected (called from OAuth callback handler) */
  markProviderConnected: (provider: ConnectProvider, count?: number) => void;

  /** Mark a provider connection as failed */
  markProviderError: (provider: ConnectProvider, error: string) => void;

  /** Skip device connection and proceed */
  skipDeviceConnection: () => void;

  /** Complete the wizard — called after step 3 action */
  complete: () => void;

  /** Reset everything (e.g. user goes back and re-does onboarding) */
  reset: () => void;

  /** Update provider status directly */
  setProviderStatus: (status: ProviderStatus) => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: OnboardingState = {
  step: 1,
  selectedSports: [],
  experienceLevel: null,
  connectedProviders: [],
  providerStatuses: [],
  completed: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      setStep: (step) => set({ step }),

      toggleSport: (sport) =>
        set((s) => ({
          selectedSports: s.selectedSports.includes(sport)
            ? s.selectedSports.filter((x) => x !== sport)
            : [...s.selectedSports, sport],
        })),

      setExperienceLevel: (level) => set({ experienceLevel: level }),

      connectStrava: () => {
        // Record intent and set connecting state
        set((s) => ({
          connectedProviders: s.connectedProviders.includes("strava")
            ? s.connectedProviders
            : [...s.connectedProviders, "strava"],
          providerStatuses: upsertStatus(s.providerStatuses, {
            provider: "strava",
            status: "connecting",
          }),
        }));

        // Real OAuth redirect — only fires once backend is wired up.
        // The env flag lets us skip the redirect in dev/preview.
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
        // Only navigate in production (when NEXT_PUBLIC_STRAVA_CONNECT is set)
        if (process.env.NEXT_PUBLIC_STRAVA_CONNECT === "true") {
          window.location.href = `${apiUrl}/api/v1/auth/oauth/strava?return_to=/onboarding/callback/strava`;
        } else {
          // Simulate import flow in dev / before backend is ready
          simulateImport(get, set, "strava");
        }
      },

      connectGarmin: () => {
        set((s) => ({
          connectedProviders: s.connectedProviders.includes("garmin")
            ? s.connectedProviders
            : [...s.connectedProviders, "garmin"],
          providerStatuses: upsertStatus(s.providerStatuses, {
            provider: "garmin",
            status: "connecting",
          }),
        }));

        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
        if (process.env.NEXT_PUBLIC_GARMIN_CONNECT === "true") {
          window.location.href = `${apiUrl}/api/v1/auth/oauth/garmin?return_to=/onboarding/callback/garmin`;
        } else {
          simulateImport(get, set, "garmin");
        }
      },

      markProviderConnected: (provider, count) =>
        set((s) => ({
          providerStatuses: upsertStatus(s.providerStatuses, {
            provider,
            status: "done",
            count,
          }),
        })),

      markProviderError: (provider, error) =>
        set((s) => ({
          providerStatuses: upsertStatus(s.providerStatuses, {
            provider,
            status: "error",
            error,
          }),
        })),

      skipDeviceConnection: () => {
        set({ connectedProviders: ["skip"] });
        get().complete();
      },

      complete: () => set({ completed: true }),

      reset: () => set(INITIAL_STATE),

      setProviderStatus: (status) =>
        set((s) => ({
          providerStatuses: upsertStatus(s.providerStatuses, status),
        })),
    }),
    {
      name: "coachfit-onboarding",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? sessionStorage : memoryStorage(),
      ),
      // Only persist the data fields, not the action functions
      partialize: (s) => ({
        step: s.step,
        selectedSports: s.selectedSports,
        experienceLevel: s.experienceLevel,
        connectedProviders: s.connectedProviders,
        providerStatuses: s.providerStatuses,
        completed: s.completed,
      }),
    },
  ),
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upsertStatus(
  statuses: ProviderStatus[],
  update: ProviderStatus,
): ProviderStatus[] {
  const exists = statuses.some((s) => s.provider === update.provider);
  if (exists) {
    return statuses.map((s) => (s.provider === update.provider ? update : s));
  }
  return [...statuses, update];
}

/**
 * Simulates the Strava/Garmin connect→import flow for dev/preview
 * (before real backend OAuth is wired up).
 *
 * Timeline: connecting (1.5s) → importing (2s) → done
 */
function simulateImport(
  get: () => OnboardingState & OnboardingActions,
  set: (partial: Partial<OnboardingState>) => void,
  provider: "strava" | "garmin",
) {
  // connecting → importing after 1.5s
  setTimeout(() => {
    set({
      providerStatuses: upsertStatus(get().providerStatuses, {
        provider,
        status: "importing",
      }),
    });

    // importing → done after another 2s
    setTimeout(() => {
      const count = provider === "strava" ? 42 : 28;
      set({
        providerStatuses: upsertStatus(get().providerStatuses, {
          provider,
          status: "done",
          count,
        }),
      });
    }, 2000);
  }, 1500);
}

/**
 * SSR-safe in-memory storage fallback (when window is not available).
 */
function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
}

// ─── Selector hooks ───────────────────────────────────────────────────────────

export function useOnboardingStep() {
  return useOnboardingStore((s) => s.step);
}

export function useSelectedSports() {
  return useOnboardingStore((s) => s.selectedSports);
}

export function useExperienceLevel() {
  return useOnboardingStore((s) => s.experienceLevel);
}

export function useProviderStatus(provider: ConnectProvider) {
  return useOnboardingStore((s) =>
    s.providerStatuses.find((p) => p.provider === provider),
  );
}
