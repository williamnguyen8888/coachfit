package com.coachfit.auth.adapter.in;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds Strava OAuth2 config from {@code app.providers.strava.*}.
 *
 * <ul>
 *   <li>{@code clientId}     — STRAVA_CLIENT_ID env var</li>
 *   <li>{@code clientSecret} — STRAVA_CLIENT_SECRET env var</li>
 *   <li>{@code redirectUri}  — built from API_URL in application.yml</li>
 * </ul>
 */
@ConfigurationProperties(prefix = "app.providers.strava")
public record StravaOAuthProperties(
        String clientId,
        String clientSecret,
        String redirectUri,
        String webhookVerifyToken
) {}
