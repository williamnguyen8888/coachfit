"use client";

// src/app/(app)/notifications/page.tsx
// Full notification list page with pagination and mark-read actions.

import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Dumbbell,
  CheckCircle,
  MessageCircle,
  AlertTriangle,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  coach_invite: "Invite",
  workout_assigned: "Workout Assigned",
  workout_completed: "Completed",
  comment_added: "Comment",
  alert_overtraining: "Alert",
  alert_missed_workout: "Alert",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { setUnreadCount, clearUnread } = useCoachStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsService.list({ page, size: 20 });
      setNotifications(res.content);
      setTotalPages(res.totalPages);
    } catch {
      // Fallback to mock data
      const mocks = getMockNotifications();
      setNotifications(mocks);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsService.markRead(id);
    } catch { /* optimistic */ }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const remaining = notifications.filter((n) => n.id !== id && !n.read).length;
    setUnreadCount(remaining);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
    } catch { /* optimistic */ }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    clearUnread();
  };

  const handleClick = async (n: Notification) => {
    await handleMarkRead(n.id);
    if (n.linkUrl) router.push(n.linkUrl);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--space-6) var(--space-4)",
      }}
    >
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "var(--color-accent-10)",
              border: "1px solid var(--color-accent-20)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div>
            <h1
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              padding: "7px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: "var(--color-accent)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all var(--duration-micro)",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-accent-8)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 68,
                  borderRadius: "var(--radius-md)",
                  background: "linear-gradient(90deg, var(--bg-elevated) 25%, var(--bg-surface) 50%, var(--bg-elevated) 75%)",
                  backgroundSize: "400px 100%",
                  animation: "skeleton-shimmer 1.6s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              padding: "var(--space-16) var(--space-8)",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <Bell size={40} style={{ marginBottom: "var(--space-4)", opacity: 0.2 }} />
            <p style={{ fontSize: "var(--text-base)", margin: 0 }}>
              You're all caught up — no notifications!
            </p>
          </div>
        ) : (
          notifications.map((n, i) => {
            const Icon = NOTIFICATION_ICONS[n.type];
            const color = NOTIFICATION_COLORS[n.type];
            const typeLabel = NOTIFICATION_TYPE_LABELS[n.type];
            const timeAgo = (() => {
              try {
                return formatDistanceToNow(new Date(n.createdAt), { addSuffix: true });
              } catch {
                return n.createdAt;
              }
            })();

            return (
              <div key={n.id}>
                {i > 0 && (
                  <div
                    style={{
                      height: 1,
                      background: "var(--border-subtle)",
                      margin: "0 var(--space-5)",
                    }}
                  />
                )}
                <button
                  onClick={() => handleClick(n)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    gap: "var(--space-4)",
                    alignItems: "flex-start",
                    padding: "var(--space-4) var(--space-5)",
                    background: n.read ? "transparent" : "var(--color-accent-4)",
                    border: "none",
                    cursor: "pointer",
                    transition: "background var(--duration-micro)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-elevated)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = n.read ? "transparent" : "var(--color-accent-4)";
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "var(--radius-md)",
                      background: `${color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} color={color} />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        style={{
                          fontSize: "var(--text-sm)",
                          fontWeight: n.read ? 500 : 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {n.title}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color,
                          background: `${color}14`,
                          border: `1px solid ${color}25`,
                          borderRadius: "var(--radius-full)",
                          padding: "1px 6px",
                        }}
                      >
                        {typeLabel}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--text-secondary)",
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {n.body}
                    </p>
                    <p
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--text-muted)",
                        margin: "var(--space-1) 0 0",
                      }}
                    >
                      {timeAgo}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--color-accent)",
                        flexShrink: 0,
                        marginTop: 6,
                        boxShadow: "0 0 6px var(--color-accent)",
                      }}
                    />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{
              width: 36, height: 36,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: page === 0 ? "var(--text-muted)" : "var(--text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: page === 0 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{
              width: 36, height: 36,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-default)",
              background: "transparent",
              color: page >= totalPages - 1 ? "var(--text-muted)" : "var(--text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
