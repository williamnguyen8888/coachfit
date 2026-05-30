package com.coachfit.shared.adapter.in.web;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.security.SecuritySchemes;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

/**
 * Springdoc OpenAPI 3 configuration for CoachFit backend.
 *
 * <p>Exposes:
 * <ul>
 *   <li>{@code GET /v3/api-docs}          — machine-readable OpenAPI JSON</li>
 *   <li>{@code GET /swagger-ui/index.html} — interactive Swagger UI</li>
 * </ul>
 *
 * <p>Both paths are permitted without auth in {@code SecurityConfig}.
 *
 * <h3>Security schemes</h3>
 * <ul>
 *   <li>{@code bearerAuth} — JWT in {@code Authorization: Bearer <token>} header</li>
 *   <li>{@code apiKeyAuth} — API key in {@code Authorization: Bearer cf_live_<key>} header</li>
 * </ul>
 *
 * <p>References: docs/05-api-design.md §Conventions, docs/08-auth-model.md §API Key Authentication.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title       = "CoachFit API",
                version     = "v1",
                description = "CoachFit fitness coaching platform REST API. " +
                              "Authenticate with a JWT (POST /api/v1/auth/login) or an API key " +
                              "(POST /api/v1/api-keys). " +
                              "See docs/05-api-design.md for full conventions.",
                contact     = @Contact(name = "CoachFit Engineering")
        ),
        servers = {
                @Server(url = "/", description = "Current host")
        }
)
@SecuritySchemes({
        @SecurityScheme(
                name        = "bearerAuth",
                type        = SecuritySchemeType.HTTP,
                scheme      = "bearer",
                bearerFormat = "JWT",
                description = "JWT access token obtained from POST /api/v1/auth/login or /auth/register. " +
                              "Expires in 1 hour. Use POST /api/v1/auth/refresh to renew."
        ),
        @SecurityScheme(
                name        = "apiKeyAuth",
                type        = SecuritySchemeType.APIKEY,
                in          = SecuritySchemeIn.HEADER,
                paramName   = "Authorization",
                description = "API key prefixed with 'Bearer ': Authorization: Bearer cf_live_<key>. " +
                              "Create keys at POST /api/v1/api-keys."
        )
})
public class OpenApiConfig {
    // No beans required — all configuration is via annotations processed by Springdoc.
}
