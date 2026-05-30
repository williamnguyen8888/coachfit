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
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Analytics", href: "/analytics", icon: BarChart2 },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarExpanded, toggleSidebar } = useUIStore();

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
            boxShadow: "var(--shadow-glow)",
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
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={!sidebarExpanded ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg transition-all duration-150 group relative",
                sidebarExpanded ? "px-3 py-2.5" : "px-0 py-2.5 justify-center",
              )}
              style={{
                color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
                background: isActive ? "rgba(139, 92, 246, 0.1)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                if (!isActive)
                  e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
                if (!isActive)
                  e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}

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
                  {label}
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
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div
        className="px-2 pb-4 shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}
      >
        <button
          onClick={toggleSidebar}
          aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2.5 transition-all duration-150",
            !sidebarExpanded && "justify-center",
          )}
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
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
