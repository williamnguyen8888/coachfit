"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Activity,
  Dumbbell,
  BarChart2,
  Settings,
  Zap,
  LogOut,
  HeartPulse,
  Sun,
  Moon,
  ChevronDown,
  Users,
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore, useIsCoach } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const NAV_ITEMS = [
  { label: "Dashboard", key: "menu.dashboard", href: "/", icon: Home },
  { label: "Calendar", key: "menu.calendar", href: "/calendar", icon: Calendar },
  { label: "Activities", key: "menu.activities", href: "/activities", icon: Activity },
  { label: "Workouts", key: "menu.workouts", href: "/workouts", icon: Dumbbell },
  { label: "Wellness", key: "menu.wellness", href: "/wellness", icon: HeartPulse },
  { label: "Analytics", key: "menu.analytics", href: "/analytics", icon: BarChart2 },
] as const;

export function Header() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isCoach = useIsCoach();
  const { t } = useTranslation();

  const navItems = [
    ...NAV_ITEMS,
    ...(isCoach
      ? ([{ label: "Team", key: "menu.team", href: "/coach", icon: Users }] as const)
      : []),
  ];

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header
      aria-label="Main navigation header"
      style={{
        height: 64,
        background: "color-mix(in srgb, var(--bg-surface) 85%, transparent)",
        borderBottom: "1px solid var(--border-subtle)",
        backdropFilter: "blur(12px) saturate(180%)",
        WebkitBackdropFilter: "blur(12px) saturate(180%)",
      }}
      className="hidden lg:flex items-center justify-between px-6 sticky top-0 z-40 select-none shrink-0"
    >
      {/* Left: Branding & Logo */}
      <Link href="/" className="flex items-center gap-3 group">
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
        <span
          className="font-semibold tracking-tight"
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--text-primary)",
          }}
        >
          CoachFit
        </span>
      </Link>

      {/* Center: Main Navigation */}
      <nav className="flex items-center gap-0.5">
        {navItems.map(({ key, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const translatedLabel = t(key);

          return (
            <Link
              key={href}
              href={href}
              aria-label={translatedLabel}
              className={cn(
                "nav-link",
                isActive && "active",
              )}
              style={{ gap: 6, padding: "8px 12px" }}
            >
              <Icon size={15} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              <span style={{ fontSize: "var(--text-sm)", fontWeight: isActive ? 600 : 500 }}>
                {translatedLabel}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="icon-btn"
          style={{
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-surface)",
          }}
        >
          {theme === "dark" ? (
            <Sun size={16} />
          ) : (
            <Moon size={16} />
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            className="flex items-center gap-2 rounded-lg p-1.5 transition-all outline-none"
            style={{
              background: dropdownOpen ? "var(--bg-elevated)" : "transparent",
              cursor: "pointer",
            }}
          >
            {/* Avatar */}
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
              {user?.fullName
                ? user.fullName.substring(0, 2).toUpperCase()
                : user?.email
                ? user.email.substring(0, 2).toUpperCase()
                : "U"}
            </div>
            <ChevronDown
              size={14}
              className={cn("transition-transform duration-200", {
                "transform rotate-180": dropdownOpen,
              })}
              style={{ color: "var(--text-muted)" }}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-52 rounded-lg overflow-hidden z-50"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-md)",
                animation: "tooltipFadeIn 150ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* User Info */}
              <div
                className="px-4 py-3 flex flex-col"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {user?.fullName || "Athlete"}
                </span>
                <span className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {user?.email}
                </span>
              </div>

              {/* Actions */}
              <div className="p-1.5 flex flex-col gap-0.5">
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-surface)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <Settings size={15} className="shrink-0" />
                  <span>{t("menu.settings")}</span>
                </Link>

                {/* Logout — neutral color, not danger */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="logout-btn"
                  style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)" }}
                >
                  <LogOut size={15} className="shrink-0" />
                  <span>{t("menu.logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
