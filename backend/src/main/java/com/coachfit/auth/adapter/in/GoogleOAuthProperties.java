package com.coachfit.auth.adapter.in;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds Google OAuth2 callback URL from {@code app.google.callback-url}.
 * Used by both {@link GoogleOAuthController} (for building the auth URL)
 * and {@link com.coachfit.auth.application.service.GoogleOAuthService}.
 */
@ConfigurationProperties(prefix = "app.google")
public record GoogleOAuthProperties(String callbackUrl) {}
