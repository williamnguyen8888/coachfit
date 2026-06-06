// src/stores/coach.store.ts
// Zustand store for coach UI state — selected athlete, active tab, notification count.

import { create } from "zustand";

export type AthleteDetailTab =
  | "calendar"
  | "activities"
  | "pmc"
  | "health"
  | "notes";

interface CoachState {
  /** Currently selected athlete ID in the roster */
  selectedAthleteId: string | null;
  /** Active tab in the athlete detail panel */
  activeTab: AthleteDetailTab;
  /** Notification unread count (drives bell badge) */
  unreadNotificationCount: number;
  /** Whether the assign workout modal is open */
  assignModalOpen: boolean;
  /** Whether the invite modal is open */
  inviteModalOpen: boolean;
  /** Pre-selected athlete IDs for bulk assign */
  bulkAssignAthleteIds: string[];
}

interface CoachActions {
  setSelectedAthlete: (id: string | null) => void;
  setActiveTab: (tab: AthleteDetailTab) => void;
  setUnreadCount: (count: number) => void;
  decrementUnread: () => void;
  clearUnread: () => void;
  openAssignModal: (athleteIds?: string[]) => void;
  closeAssignModal: () => void;
  openInviteModal: () => void;
  closeInviteModal: () => void;
}

export const useCoachStore = create<CoachState & CoachActions>((set) => ({
  selectedAthleteId: null,
  activeTab: "calendar",
  unreadNotificationCount: 0,
  assignModalOpen: false,
  inviteModalOpen: false,
  bulkAssignAthleteIds: [],

  setSelectedAthlete: (id) =>
    set({ selectedAthleteId: id, activeTab: "calendar" }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setUnreadCount: (count) => set({ unreadNotificationCount: count }),

  decrementUnread: () =>
    set((s) => ({
      unreadNotificationCount: Math.max(0, s.unreadNotificationCount - 1),
    })),

  clearUnread: () => set({ unreadNotificationCount: 0 }),

  openAssignModal: (athleteIds = []) =>
    set({ assignModalOpen: true, bulkAssignAthleteIds: athleteIds }),

  closeAssignModal: () =>
    set({ assignModalOpen: false, bulkAssignAthleteIds: [] }),

  openInviteModal: () => set({ inviteModalOpen: true }),

  closeInviteModal: () => set({ inviteModalOpen: false }),
}));
