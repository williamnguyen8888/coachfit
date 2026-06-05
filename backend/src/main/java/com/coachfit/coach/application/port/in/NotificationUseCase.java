package com.coachfit.coach.application.port.in;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Input port: in-app notification management.
 *
 * <p>Covers:
 * <ul>
 *   <li>{@code GET  /notifications?page=0&amp;size=20}  — list notifications (paginated)</li>
 *   <li>{@code PUT  /notifications/{id}/read}         — mark one as read</li>
 *   <li>{@code PUT  /notifications/read-all}          — mark all as read</li>
 *   <li>{@code GET  /notifications/unread-count}      — badge count</li>
 * </ul>
 *
 * <p>Notifications are per-user; no cross-user access is allowed.
 */
public interface NotificationUseCase {

    /** Returns paginated notifications for the caller (newest first). */
    NotificationPage list(UUID userId, int page, int size);

    /** Marks a single notification as read. Returns false if not found / not owned. */
    boolean markRead(UUID userId, UUID notificationId);

    /** Marks ALL unread notifications for the user as read. Returns count updated. */
    int markAllRead(UUID userId);

    /** Returns the count of unread notifications for the user (used for the badge). */
    long unreadCount(UUID userId);

    // ── Result types ──────────────────────────────────────────────────────────

    record NotificationPage(
            List<NotificationView> content,
            int  page,
            int  size,
            long totalElements
    ) {}

    record NotificationView(
            UUID    id,
            String  type,       // coach_invite / workout_assigned / workout_completed / comment_added / alert_overtraining / alert_missed_workout
            String  title,
            String  body,
            Object  data,       // parsed JSON payload
            boolean isRead,
            Instant createdAt
    ) {}
}
