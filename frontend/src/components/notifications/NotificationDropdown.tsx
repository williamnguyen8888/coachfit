"use client";

// src/components/notifications/NotificationDropdown.tsx
// Floating notification panel with recent notifications and actions.

import { useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Dumbbell,
  CheckCircle,
  MessageCircle,
  AlertTriangle,
  UserPlus,
  X,
} from "lucide-react";
import { notificationsService, getMockNotifications } from "@/lib/services/notifications";
import { useCoachStore } from "@/stores/coach.store";
import type { Notification, NotificationType } from "@/lib/types/coach";
import { formatDistanceToNow } from "@/lib/utils/time";

const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  coach_invite: UserPlus,
  workout_assigned: Dumbbell,
  workout_completed: CheckCircle,
  comment_added: MessageCircle,
  alert_overtraining: AlertTriangle,
  alert_missed_workout: AlertTriangle,
};

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  coach_invite: "var(--color-accent)",
  workout_assigned: "var(--color-fitness)",
  workout_completed: "var(--color-success)",
  comment_added: "var(--color-info)",
  alert_overtraining: "var(--color-danger)",
  alert_missed_workout: "var(--color-warning)",
};

interface NotificationDropdownProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
}

export function NotificationDropdown({
  notifications,
  onClose,
  onMarkAllRead,
  onMarkRead,
}: NotificationDropdownProps) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const unread = notifications.filter((n) => !n.read);

  const handleNotificationClick = (n: Notification) => {
    onMarkRead(n.id);
    onClose();
    if (n.linkUrl) {
      router.push(n.linkUrl);
    }
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Notifications"
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 360,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        zIndex: 200,
        animation: "tooltipFadeIn 150ms cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4) var(--space-5)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: "var(--color-accent)" }} />
          <span
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            Notifications
          </span>
          {unread.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "white",
                background: "var(--color-accent)",
                borderRadius: "var(--radius-full)",
                padding: "1px 6px",
              }}
            >
              {unread.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unread.length > 0 && (
            <button
              onClick={onMarkAllRead}
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-accent)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              width: 24, height: 24,
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div
        style={{
          maxHeight: 380,
          overflowY: "auto",
        }}
      >
        {notifications.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-10) var(--space-5)",
              color: "var(--text-muted)",
              fontSize: "var(--text-sm)",
            }}
          >
            <Bell size={24} style={{ marginBottom: "var(--space-3)", opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 8).map((n) => {
            const Icon = NOTIFICATION_ICONS[n.type];
            const color = NOTIFICATION_COLORS[n.type];
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });
              } catch {
                return "";
              }
            })();

            return (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  gap: "var(--space-3)",
                  alignItems: "flex-start",
                  padding: "var(--space-4) var(--space-5)",
                  background: n.read ? "transparent" : "var(--color-accent-4)",
                  borderBottom: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                  border: "none",
                  transition: "background var(--duration-micro)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-surface)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = n.read ? "transparent" : "var(--color-accent-4)";
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-sm)",
                    background: `${color}18`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={14} color={color} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: n.read ? 400 : 600,
                      color: "var(--text-primary)",
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: "var(--text-xs)",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {n.body}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                    {timeAgo}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "var(--space-3) var(--space-5)",
          borderTop: "1px solid var(--border-subtle)",
          textAlign: "center",
        }}
      >
        <Link
          href="/notifications"
          onClick={onClose}
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            color: "var(--color-accent)",
            textDecoration: "none",
          }}
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}
