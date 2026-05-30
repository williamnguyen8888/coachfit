"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Activity, Dumbbell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const TAB_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Activities", href: "/activities", icon: Activity },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-center justify-around"
      style={{
        height: "var(--tab-bar-height)",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TAB_ITEMS.map(({ label, href, icon: Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-150",
              "min-w-[44px] min-h-[44px] px-3",
            )}
            style={{
              color: isActive ? "var(--color-accent)" : "var(--text-muted)",
            }}
          >
            {/* Pill indicator on active */}
            <div className="relative">
              {isActive && (
                <span
                  className="absolute -inset-1.5 rounded-lg -z-10"
                  style={{ background: "rgba(139, 92, 246, 0.12)" }}
                />
              )}
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  transition: "transform 150ms ease-out",
                }}
              />
            </div>
            <span
              className="font-medium leading-none"
              style={{
                fontSize: 10,
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
