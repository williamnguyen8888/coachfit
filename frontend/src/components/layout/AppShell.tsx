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
      className="flex h-dvh min-h-0 overflow-hidden"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Desktop Sidebar — hidden on mobile/tablet via lg:flex in Sidebar */}
      <Sidebar />

      {/* Main content
          • Mobile/tablet: padding-bottom reserves space for the fixed bottom tab bar
          • Desktop (lg+): bottom padding is removed via the app-shell-main class
      */}
      <main
        id="main-content"
        className="app-shell-main flex-1 min-w-0 h-dvh min-h-0 flex flex-col overflow-y-auto overflow-x-hidden"
      >
        {children}
      </main>

      {/* Mobile / Tablet bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
