package com.coachfit.athlete.domain.model;

import java.time.Instant;

/**
 * Domain projection of an OAuth connection — deliberately excludes all token fields.
 *
 * <p>Token columns ({@code access_token}, {@code refresh_token}, {@code access_token_secret})
 * are never loaded into application memory via this model
 * (docs/08-auth-model.md §Security Checklist: "OAuth tokens — AES-256-GCM encrypted").
 */
public record OAuthConnection(
        String  provider,       // strava | garmin | google | …
        String  syncStatus,     // active | error | disconnected
        Instant lastSyncAt,     // nullable
        boolean pushEnabled,
        Instant createdAt
) {}
