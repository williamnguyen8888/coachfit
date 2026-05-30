package com.coachfit.account.application.service;

import com.coachfit.account.application.port.in.AccountUseCase;
import com.coachfit.account.application.port.out.ExportJobPersistencePort;
import com.coachfit.auth.application.port.out.OAuthConnectionPersistencePort;
import com.coachfit.auth.application.port.out.RefreshTokenPersistencePort;
import com.coachfit.auth.application.port.out.UserPersistencePort;
import com.coachfit.consent.application.port.in.ConsentUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Application service implementing {@link AccountUseCase}.
 *
 * <h3>Export rate limiting</h3>
 * Redis key: {@code export_request:{userId}:{YYYY-MM-DD}} — 1 per day per user.
 * Aligned with docs/11-privacy-compliance.md §3.1 "Rate limit: 1 request / 24 hours".
 *
 * <h3>Account deletion flow (docs/11-privacy-compliance.md §8)</h3>
 * <ol>
 *   <li>Soft-delete user (sets deleted_at)</li>
 *   <li>Revoke all refresh tokens</li>
 *   <li>Soft-revoke all OAuth connections (sync_status = revoked)</li>
 * </ol>
 * Hard delete and actual provider-side token revocation are deferred to a scheduled job.
 */
@Service
public class AccountService implements AccountUseCase {

    private static final Logger log = LoggerFactory.getLogger(AccountService.class);

    private static final String EXPORT_RATE_KEY_PREFIX = "export_request:";
    private static final long   DELETION_GRACE_DAYS    = 30L;
    private static final long   EXPORT_TTL_DAYS        = 7L;

    private final UserPersistencePort            userPersistence;
    private final RefreshTokenPersistencePort    refreshTokenPersistence;
    private final OAuthConnectionPersistencePort oauthPersistence;
    private final ExportJobPersistencePort       exportJobPersistence;
    private final ConsentUseCase                 consentUseCase;
    private final StringRedisTemplate            redisTemplate;

    public AccountService(UserPersistencePort userPersistence,
                          RefreshTokenPersistencePort refreshTokenPersistence,
                          OAuthConnectionPersistencePort oauthPersistence,
                          ExportJobPersistencePort exportJobPersistence,
                          ConsentUseCase consentUseCase,
                          StringRedisTemplate redisTemplate) {
        this.userPersistence        = userPersistence;
        this.refreshTokenPersistence = refreshTokenPersistence;
        this.oauthPersistence       = oauthPersistence;
        this.exportJobPersistence   = exportJobPersistence;
        this.consentUseCase         = consentUseCase;
        this.redisTemplate          = redisTemplate;
    }

    // ── Export ────────────────────────────────────────────────────────────────

    @Override
    public ExportJobResult requestExport(UUID userId) {
        // Rate limit: 1 per 24h (docs/11-privacy-compliance.md §3.1)
        String today      = LocalDate.now(ZoneOffset.UTC).toString();
        String rateLimitKey = EXPORT_RATE_KEY_PREFIX + userId + ":" + today;

        Boolean alreadyRequested = redisTemplate.hasKey(rateLimitKey);
        if (Boolean.TRUE.equals(alreadyRequested)) {
            throw new ExportRateLimitException();
        }

        UUID jobId = exportJobPersistence.createJob(userId);
        Instant createdAt = Instant.now();
        Instant expiresAt = createdAt.plus(EXPORT_TTL_DAYS, ChronoUnit.DAYS);

        // Mark rate limit for today — TTL until end of UTC day
        long secondsUntilMidnight = Duration.between(
                Instant.now(),
                LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant()
        ).getSeconds();
        redisTemplate.opsForValue().set(rateLimitKey, "1",
                Duration.ofSeconds(Math.max(secondsUntilMidnight, 1)));

        log.info("Export job {} created for user {} (status=PENDING)", jobId, userId);
        return new ExportJobResult(jobId, "PENDING", createdAt, expiresAt);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public Instant deleteAccount(UUID userId) {
        // 1. Soft-delete (docs/11-privacy-compliance.md §8 Step 1)
        userPersistence.softDelete(userId);

        // 2. Revoke all refresh tokens (Step 2)
        refreshTokenPersistence.revokeAllForUser(userId);

        // 3. Soft-revoke OAuth connections — stops sync immediately (Step 3)
        oauthPersistence.softRevokeAllForUser(userId);

        // Note: Stripe subscription cancellation and email confirmation are deferred
        // to the worker (no email service in this ticket).
        log.info("Account soft-deleted for user {} — hard delete scheduled in {} days",
                userId, DELETION_GRACE_DAYS);

        return Instant.now().plus(DELETION_GRACE_DAYS, ChronoUnit.DAYS);
    }

    // ── Cancel deletion ───────────────────────────────────────────────────────

    @Override
    @Transactional
    public boolean cancelDeletion(UUID userId) {
        boolean cancelled = userPersistence.cancelDeletion(userId);
        if (cancelled) {
            log.info("Account deletion cancelled for user {}", userId);
        }
        return cancelled;
    }

    // ── Processing restriction ────────────────────────────────────────────────

    @Override
    @Transactional
    public boolean setProcessingRestriction(UUID userId, boolean restricted) {
        userPersistence.setProcessingRestricted(userId, restricted);
        log.info("Processing restriction set to {} for user {}", restricted, userId);
        return restricted;
    }

    // ── Privacy status ────────────────────────────────────────────────────────

    @Override
    public PrivacyStatus getPrivacyStatus(UUID userId) {
        boolean restricted = userPersistence.isProcessingRestricted(userId);
        Instant deletedAt  = userPersistence.getDeletedAt(userId).orElse(null);

        List<ConsentEntry> consents = consentUseCase.getConsentLog(userId)
                .stream()
                .map(c -> new ConsentEntry(c.type(), c.granted(), c.grantedAt(),
                        c.ipAddress(), c.version()))
                .toList();

        return new PrivacyStatus(restricted, deletedAt, consents);
    }
}
