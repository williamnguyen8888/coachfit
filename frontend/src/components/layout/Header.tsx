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
} from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

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
  const { t } = useTranslation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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
          className="flex items-center justify-center shrink-0 rounded-lg transition-transform group-hover:scale-105"
          style={{
            width: 32,
            height: 32,
            background: "var(--color-accent)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Zap size={16} color="white" strokeWidth={2.5} />
        </div>
        <span
          className="font-semibold tracking-tight text-glow transition-colors group-hover:text-white"
          style={{
            fontSize: "var(--text-lg)",
            color: "var(--text-primary)",
          }}
        >
          CoachFit
        </span>
      </Link>

      {/* Center: Main Navigation Menu */}
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map(({ label, key, href, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const translatedLabel = t(key);

          return (
            <Link
              key={href}
              href={href}
              aria-label={translatedLabel}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all relative group",
              )}
              style={{
                color: isActive ? "var(--color-accent)" : "var(--text-secondary)",
                background: isActive ? "var(--color-accent-6)" : "transparent",
              }}
            >
              <Icon size={16} className="shrink-0 transition-transform group-hover:scale-105" />
              <span>{translatedLabel}</span>

              {/* Hover highlight overlay */}
              {!isActive && (
                <span
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10"
                  style={{ background: "var(--bg-elevated)" }}
                />
              )}

              {/* Underline for active state */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right: Actions (Theme toggle, User avatar dropdown) */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          className="flex items-center justify-center rounded-lg p-2 transition-all hover:bg-opacity-80"
          style={{
            color: "var(--text-secondary)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          {theme === "dark" ? (
            <Sun size={16} className="transition-transform hover:rotate-45" />
          ) : (
            <Moon size={16} className="transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* User profile avatar dropdown */}
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
            {/* Avatar Initials */}
            <div
              className="flex items-center justify-center rounded-full shrink-0 font-bold"
              style={{
                width: 32,
                height: 32,
                background: "var(--color-accent-20)",
                color: "var(--color-accent)",
                fontSize: "var(--text-xs)",
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
              className={cn("text-secondary transition-transform duration-200", {
                "transform rotate-180": dropdownOpen,
              })}
            />
          </button>

          {/* Floating Dropdown Card */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-lg overflow-hidden z-50 transition-all shadow-lg border"
              style={{
                background: "color-mix(in srgb, var(--bg-elevated) 95%, transparent)",
                borderColor: "var(--border-default)",
                backdropFilter: "blur(16px)",
                animation: "tooltipFadeIn 150ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {/* User Info Header */}
              <div
                className="px-4 py-3 flex flex-col border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <span
                  className="text-sm font-semibold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {user?.fullName || "Athlete"}
                </span>
                <span
                  className="text-xs truncate mt-0.5"
                  style={{ color: "var(--text-muted)", fontSize: "11px" }}
                >
                  {user?.email}
                </span>
              </div>

              {/* Menu Actions */}
              <div className="p-1.5 flex flex-col gap-0.5">
                {/* Settings Link */}
                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-surface)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  <Settings size={16} className="shrink-0" />
                  <span>{t("menu.settings")}</span>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors"
                  style={{ color: "var(--color-danger)", background: "transparent", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-danger-6)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <LogOut size={16} className="shrink-0" />
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
