"use client";

import { Sidebar } from "./Sidebar";
import { BottomTabBar } from "./BottomTabBar";
import { useUIStore } from "@/stores/ui.store";
import { useEffect } from "react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { theme } = useUIStore();

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div
      className="flex h-full min-h-screen"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main
        id="main-content"
        className="flex-1 min-w-0 flex flex-col"
        style={{
          /* On mobile, add bottom padding for the tab bar */
          paddingBottom: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Remove bottom padding on desktop (sidebar replaces tab bar) */}
        <style jsx>{`
          @media (min-width: 1024px) {
            #main-content {
              padding-bottom: 0;
            }
          }
        `}</style>

        {children}
      </main>

      {/* Mobile / Tablet bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
