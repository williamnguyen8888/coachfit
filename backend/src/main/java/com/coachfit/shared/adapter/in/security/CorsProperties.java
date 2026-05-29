package com.coachfit.shared.adapter.in.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds {@code app.url} from application.yml for CORS allowed-origin configuration.
 */
@ConfigurationProperties(prefix = "app")
public record CorsProperties(String url) {}
