// src/lib/services/notifications.ts
// API service layer for the notification system.

import { api } from "@/lib/api";
import type { Notification, PaginatedNotifications } from "@/lib/types/coach";

export const notificationsService = {
  /** GET /notifications?page=0&size=20 */
  list: (params?: { page?: number; size?: number }): Promise<PaginatedNotifications> => {
    const qs = new URLSearchParams();
    if (params?.page !== undefined) qs.set("page", String(params.page));
    qs.set("size", String(params?.size ?? 20));
    return api.get<PaginatedNotifications>(`/notifications?${qs.toString()}`);
  },

  /** GET /notifications/unread-count */
  getUnreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>(`/notifications/unread-count`),

  /** PUT /notifications/{id}/read */
  markRead: (id: string): Promise<void> =>
    api.put<void>(`/notifications/${id}/read`, {}),

  /** PUT /notifications/read-all */
  markAllRead: (): Promise<void> =>
    api.put<void>(`/notifications/read-all`, {}),
};

// ─── Mock data helpers (used until backend is live) ──────────────────────────

export function getMockNotifications(): Notification[] {
  const now = new Date();
  const ago = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

  return [
    {
      id: "n1",
      type: "workout_completed",
      title: "Minh completed a workout",
      body: "Minh Nguyen completed Tempo Intervals with 92% compliance.",
      read: false,
      createdAt: ago(1),
      linkUrl: "/coach?athlete=a1",
      meta: { athleteId: "a1", athleteName: "Minh Nguyen", workoutTitle: "Tempo Intervals" },
    },
    {
      id: "n2",
      type: "alert_missed_workout",
      title: "Missed workout alert",
      body: "Lan Tran missed the scheduled Easy Run on Tuesday.",
      read: false,
      createdAt: ago(5),
      linkUrl: "/coach?athlete=a2",
      meta: { athleteId: "a2", athleteName: "Lan Tran", workoutTitle: "Easy Run" },
    },
    {
      id: "n3",
      type: "comment_added",
      title: "New comment on your activity",
      body: 'Coach Tran commented: "Great power output!"',
      read: true,
      createdAt: ago(24),
      linkUrl: "/activities/act1",
      meta: { activityId: "act1" },
    },
    {
      id: "n4",
      type: "alert_overtraining",
      title: "Overtraining risk detected",
      body: "Duc Bui's TSB has dropped below -20. Consider reducing load.",
      read: true,
      createdAt: ago(48),
      linkUrl: "/coach?athlete=a3",
      meta: { athleteId: "a3", athleteName: "Duc Bui" },
    },
    {
      id: "n5",
      type: "workout_assigned",
      title: "Workout assigned",
      body: "You have been assigned Long Run 90min for this Saturday.",
      read: true,
      createdAt: ago(72),
      linkUrl: "/calendar",
      meta: { workoutTitle: "Long Run 90min" },
    },
  ];
}
