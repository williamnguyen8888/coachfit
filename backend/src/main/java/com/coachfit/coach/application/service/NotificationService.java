package com.coachfit.coach.application.service;

import com.coachfit.coach.application.port.in.NotificationUseCase;
import com.coachfit.coach.application.port.out.NotificationPersistencePort;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Application service implementing {@link NotificationUseCase}.
 *
 * <p>Reads the {@code notifications} table via {@link NotificationPersistencePort},
 * deserializes the JSONB {@code data} column for each row, and returns paginated views.
 */
@Service
@Transactional(readOnly = true)
public class NotificationService implements NotificationUseCase {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationPersistencePort persistencePort;
    private final ObjectMapper                objectMapper;

    public NotificationService(NotificationPersistencePort persistencePort,
                               ObjectMapper objectMapper) {
        this.persistencePort = persistencePort;
        this.objectMapper    = objectMapper;
    }

    @Override
    public NotificationPage list(UUID userId, int page, int size) {
        int offset = page * size;
        List<NotificationView> views = persistencePort.findByUser(userId, offset, size).stream()
                .map(this::toView)
                .toList();
        long total = persistencePort.countByUser(userId);
        return new NotificationPage(views, page, size, total);
    }

    @Override
    @Transactional
    public boolean markRead(UUID userId, UUID notificationId) {
        return persistencePort.markRead(notificationId, userId);
    }

    @Override
    @Transactional
    public int markAllRead(UUID userId) {
        return persistencePort.markAllRead(userId);
    }

    @Override
    public long unreadCount(UUID userId) {
        return persistencePort.countUnreadByUser(userId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private NotificationView toView(NotificationPersistencePort.NotificationRow r) {
        Object data = null;
        if (r.dataJson() != null && !r.dataJson().isBlank() && !"{}".equals(r.dataJson())) {
            try {
                data = objectMapper.readValue(r.dataJson(), new TypeReference<Object>() {});
            } catch (Exception e) {
                log.debug("Failed to parse notification data JSON for id={}", r.id());
                data = r.dataJson();
            }
        }
        return new NotificationView(r.id(), r.type(), r.title(), r.body(),
                data, r.isRead(), r.createdAt());
    }
}
