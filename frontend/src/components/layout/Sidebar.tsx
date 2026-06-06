"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Activity,
  Dumbbell,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  HeartPulse,
  Users,
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore, useIsCoach } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

const NAV_ITEMS = [
  { label: "Dashboard", key: "menu.dashboard", href: "/", icon: Home },
  { label: "Calendar", key: "menu.calendar", href: "/calendar", icon: Calendar },
  { label: "Activities", key: "menu.activities", href: "/activities", icon: Activity },
  { label: "Workouts", key: "menu.workouts", href: "/workouts", icon: Dumbbell },
  { label: "Wellness", key: "menu.wellness", href: "/wellness", icon: HeartPulse },
  { label: "Analytics", key: "menu.analytics", href: "/analytics", icon: BarChart2 },
  { label: "Settings", key: "menu.settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarExpanded, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isCoach = useIsCoach();
  const { t } = useTranslation();

  const allNavItems = [
    ...NAV_ITEMS,
    ...(isCoach
      ? ([{ label: "Team", key: "menu.team", href: "/coach", icon: Users }] as const)
      : []),
  ];

  return (
    <aside
      aria-label="Main navigation"
      style={{
        width: sidebarExpanded ? "var(--sidebar-expanded)" : "var(--sidebar-collapsed)",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        transition: "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className="hidden lg:flex flex-col h-screen sticky top-0 overflow-hidden shrink-0 z-30"
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 shrink-0"
        style={{ height: 64, borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          className="flex items-center justify-center shrink-0 rounded-lg"
          style={{
            width: 32,
            height: 32,
            background: "var(--color-accent)",
          }}
        >
          <Zap size={16} color="white" strokeWidth={2.5} />
        </div>
        {sidebarExpanded && (
          <span
            className="font-semibold tracking-tight whitespace-nowrap overflow-hidden"
            style={{
              fontSize: "var(--text-lg)",
              color: "var(--text-primary)",
            }}
          >
            CoachFit
          </span>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
        {allNavItems.map(({ label, key, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const translatedLabel = t(key);

          return (
            <Link
              key={href}
              href={href}
              aria-label={translatedLabel}
              title={!sidebarExpanded ? translatedLabel : undefined}
              className={cn(
                "nav-link",
                isActive && "active",
                !sidebarExpanded && "collapsed",
              )}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className="shrink-0"
              />

              {sidebarExpanded && (
                <span
                  className="text-sm font-medium whitespace-nowrap"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {translatedLabel}
                </span>
              )}

              {/* Tooltip when collapsed */}
              {!sidebarExpanded && (
                <span
                  className="pointer-events-none absolute left-full ml-2 rounded-md px-2 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-primary)",
                    boxShadow: "var(--shadow-md)",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  {translatedLabel}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User profile & Logout */}
      <div
        className="px-2 pb-2 mt-auto shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}
      >
        <div
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2",
            !sidebarExpanded && "justify-center",
          )}
        >
          {/* Avatar / Initials */}
          <div
            className="flex items-center justify-center rounded-full shrink-0 font-semibold"
            style={{
              width: 32,
              height: 32,
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              fontSize: "var(--text-xs)",
              border: "1px solid var(--border-default)",
            }}
          >
            {user?.fullName ? user.fullName.substring(0, 2).toUpperCase() : (user?.email ? user.email.substring(0, 2).toUpperCase() : "U")}
          </div>

          {sidebarExpanded && (
            <div className="flex-1 min-w-0 flex flex-col">
              <span
                className="text-sm font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {user?.fullName || "Athlete"}
              </span>
              <span
                className="text-xs truncate"
                style={{ color: "var(--text-muted)", fontSize: "11px" }}
              >
                {user?.email}
              </span>
            </div>
          )}
        </div>

        {/* Logout button — neutral, not danger */}
        <button
          onClick={logout}
          aria-label="Log out"
          className={cn(
            "logout-btn mt-1",
            !sidebarExpanded && "justify-center",
          )}
        >
          <LogOut size={16} className="shrink-0" />
          {sidebarExpanded && <span className="text-sm font-medium">{t("menu.logout")}</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <div
        className="px-2 pb-4 shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}
      >
        <button
          onClick={toggleSidebar}
          aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "icon-btn w-full",
            sidebarExpanded ? "justify-start gap-3 px-3" : "justify-center",
          )}
        >
          {sidebarExpanded ? (
            <>
              <ChevronLeft size={16} className="shrink-0" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          ) : (
            <ChevronRight size={16} className="shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
