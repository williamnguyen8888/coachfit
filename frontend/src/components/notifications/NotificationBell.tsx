"use client";

// src/components/notifications/NotificationBell.tsx
// Bell icon with unread count badge. Toggles NotificationDropdown.

import { useState, useEffect, useCallback } from "react";
import { Bell } from "lucide-react";
import { notificationsService, getMockNotifications } from "@/lib/services/notifications";
import { useCoachStore } from "@/stores/coach.store";
import type { Notification } from "@/lib/types/coach";
import { NotificationDropdown } from "./NotificationDropdown";

const POLL_INTERVAL = 60_000; // poll every 60 seconds

export function NotificationBell() {
  const { unreadNotificationCount, setUnreadCount, clearUnread } = useCoachStore();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationsService.list({ size: 10 });
      setNotifications(res.content);
      const unread = res.content.filter((n) => !n.read).length;
      setUnreadCount(unread);
    } catch {
      // If backend not available, use mock data during development
      const mocks = getMockNotifications();
      setNotifications(mocks);
      setUnreadCount(mocks.filter((n) => !n.read).length);
    }
  }, [setUnreadCount]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling
  useEffect(() => {
    if (open) return; // don't poll while dropdown is open
    const id = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [open, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
    } catch {
      // optimistic fallback
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    clearUnread();
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markRead(id);
    } catch {
      // optimistic
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const newUnread = notifications.filter((n) => n.id !== id && !n.read).length;
    setUnreadCount(newUnread);
  };

  const badgeCount = Math.min(unreadNotificationCount, 99);

  return (
    <div style={{ position: "relative" }}>
      <button
        id="notification-bell-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${badgeCount > 0 ? `, ${badgeCount} unread` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        style={{
          position: "relative",
          width: 36,
          height: 36,
          borderRadius: "var(--radius-sm)",
          border: open
            ? "1px solid var(--border-default)"
            : "1px solid var(--border-subtle)",
          background: open ? "var(--bg-elevated)" : "var(--bg-surface)",
          color: open ? "var(--text-primary)" : "var(--text-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all var(--duration-micro)",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = "var(--bg-elevated)";
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "var(--border-default)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "var(--bg-surface)";
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
          }
        }}
      >
        <Bell size={16} />

        {/* Badge */}
        {badgeCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              borderRadius: "var(--radius-full)",
              background: "var(--color-accent)",
              color: "white",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              border: "2px solid var(--bg-primary)",
              lineHeight: 1,
            }}
          >
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          onClose={() => setOpen(false)}
          onMarkAllRead={handleMarkAllRead}
          onMarkRead={handleMarkRead}
        />
      )}
    </div>
  );
}
