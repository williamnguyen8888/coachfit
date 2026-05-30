// src/stores/ui.store.ts — Global UI state (sidebar collapse, theme)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SIDEBAR_STATE_KEY } from "@/lib/constants";

interface UIState {
  sidebarExpanded: boolean;
  theme: "dark" | "light";
}

interface UIActions {
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      theme: "dark" as const,
      toggleSidebar: () =>
        set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: SIDEBAR_STATE_KEY },
  ),
);
