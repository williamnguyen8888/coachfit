package com.coachfit.coach.adapter.in;

import com.coachfit.coach.application.port.in.NotificationUseCase;
import com.coachfit.coach.application.port.in.NotificationUseCase.NotificationPage;
import com.coachfit.coach.application.port.in.NotificationUseCase.NotificationView;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * REST controller for the in-app notification system.
 *
 * <pre>
 * GET /api/v1/notifications?page=0&amp;size=20     — list notifications (paginated)
 * PUT /api/v1/notifications/{id}/read           — mark one as read
 * PUT /api/v1/notifications/read-all            — mark all as read
 * GET /api/v1/notifications/unread-count        — unread badge count
 * </pre>
 *
 * <p>All endpoints require authentication. Users may only see their own notifications.
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationUseCase notificationUseCase;

    public NotificationController(NotificationUseCase notificationUseCase) {
        this.notificationUseCase = notificationUseCase;
    }

    // ── GET /notifications ────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<NotificationPage> list(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        int effectiveSize = Math.min(size, 100);
        return ResponseEntity.ok(notificationUseCase.list(principal.getUserId(), page, effectiveSize));
    }

    // ── GET /notifications/unread-count ───────────────────────────────────────

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {

        long count = notificationUseCase.unreadCount(principal.getUserId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    // ── PUT /notifications/{id}/read ──────────────────────────────────────────

    @PutMapping("/{notificationId}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID notificationId,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean updated = notificationUseCase.markRead(principal.getUserId(), notificationId);
        if (!updated) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok().build();
    }

    // ── PUT /notifications/read-all ───────────────────────────────────────────

    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Integer>> markAllRead(
            @AuthenticationPrincipal UserPrincipal principal) {

        int count = notificationUseCase.markAllRead(principal.getUserId());
        return ResponseEntity.ok(Map.of("updated", count));
    }
}
