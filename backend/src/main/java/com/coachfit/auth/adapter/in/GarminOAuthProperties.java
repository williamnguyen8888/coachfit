package com.coachfit.auth.adapter.in;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds Garmin Health API OAuth 1.0a config from {@code app.providers.garmin.*}.
 *
 * <ul>
 *   <li>{@code consumerKey}    — GARMIN_CONSUMER_KEY env var (issued by Garmin Health API partnership)</li>
 *   <li>{@code consumerSecret} — GARMIN_CONSUMER_SECRET env var</li>
 *   <li>{@code redirectUri}    — callback URL registered with Garmin; built from API_URL in application.yml</li>
 * </ul>
 *
 * <p>See docs/08-auth-model.md §Garmin OAuth (Phase 1) and docs/06-sync-engine-spec.md §Garmin OAuth 1.0a Flow.
 */
@ConfigurationProperties(prefix = "app.providers.garmin")
public record GarminOAuthProperties(
        String consumerKey,
        String consumerSecret,
        String redirectUri
) {}
