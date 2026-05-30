// src/lib/constants.ts
// Navigation items — single source of truth for sidebar + bottom tab bar

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "home" },
  { label: "Calendar", href: "/calendar", icon: "calendar" },
  { label: "Workouts", href: "/workouts", icon: "dumbbell" },
  { label: "Analytics", href: "/analytics", icon: "bar-chart-2" },
  { label: "Settings", href: "/settings", icon: "settings" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

// Sidebar state key in localStorage
export const SIDEBAR_STATE_KEY = "coachfit:sidebar-expanded";
