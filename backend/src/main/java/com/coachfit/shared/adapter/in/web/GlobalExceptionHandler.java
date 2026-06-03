package com.coachfit.shared.adapter.in.web;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.stream.Collectors;

/**
 * Central exception-to-response mapper for all CoachFit REST controllers.
 *
 * <p>All errors are serialised as the standard envelope (docs/05-api-design.md):
 * <pre>
 * { "error": { "code": "...", "message": "..." } }
 * </pre>
 *
 * <p>Sensitive data (tokens, passwords, raw API keys) must <em>never</em> appear in
 * error messages or log statements (docs/08-auth-model.md §Security Checklist).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private final org.springframework.context.MessageSource messageSource;

    public GlobalExceptionHandler(org.springframework.context.MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    // ── Validation (400) ──────────────────────────────────────────────────────

    /**
     * Handles {@code @Valid} / {@code @Validated} failures on request bodies.
     * Aggregates all field errors into one readable message.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));

        log.debug("Validation failed on {}: {}", request.getRequestURI(), message);
        return buildResponse(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", message);
    }

    // ── Access denied (403) ───────────────────────────────────────────────────

    /**
     * Handles Spring Security {@code @PreAuthorize} / method-security access denials.
     * Note: 401 (unauthenticated) is handled by the {@code AuthenticationEntryPoint}
     * configured in {@link SecurityConfig}, not here.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {

        log.debug("Access denied on {}", request.getRequestURI());
        String translatedMessage = messageSource.getMessage("error.forbidden", null,
                "You do not have permission to access this resource.",
                org.springframework.context.i18n.LocaleContextHolder.getLocale());
        return buildResponse(HttpStatus.FORBIDDEN, "FORBIDDEN", translatedMessage);
    }

    // ── Not found (404) ───────────────────────────────────────────────────────

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(
            NoResourceFoundException ex, HttpServletRequest request) {

        String translatedMessage = messageSource.getMessage("error.notfound", null,
                "The requested resource was not found.",
                org.springframework.context.i18n.LocaleContextHolder.getLocale());
        return buildResponse(HttpStatus.NOT_FOUND, "NOT_FOUND", translatedMessage);
    }

    // ── ResponseStatusException (flexible status) ─────────────────────────────

    /**
     * Controllers can throw {@link ResponseStatusException} to signal any HTTP status
     * with a structured reason. The reason string is forwarded as-is to the client.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
            ResponseStatusException ex, HttpServletRequest request) {

        log.debug("ResponseStatusException on {}: {} {}", request.getRequestURI(),
                ex.getStatusCode(), ex.getReason());
        String code = deriveCode(ex);
        String reason = ex.getReason();
        String message = reason != null ? reason : ex.getMessage();

        if (reason != null) {
            // Try to translate by normalizing reason to error properties key, e.g. "User not found" -> "error.user.not.found"
            String key = "error." + reason.toLowerCase().replaceAll("[^a-z0-9]", ".");
            message = messageSource.getMessage(key, null, reason,
                    org.springframework.context.i18n.LocaleContextHolder.getLocale());
        }

        return buildResponse(HttpStatus.valueOf(ex.getStatusCode().value()), code, message);
    }

    // ── Catch-all (500) ───────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(
            Exception ex, HttpServletRequest request) {

        // Log full stack trace server-side, but never expose internals to the client.
        log.error("Unhandled exception on {} {}: {}", request.getMethod(),
                request.getRequestURI(), ex.getMessage(), ex);
        String translatedMessage = messageSource.getMessage("error.internal", null,
                "An unexpected error occurred. Please try again later.",
                org.springframework.context.i18n.LocaleContextHolder.getLocale());
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", translatedMessage);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ResponseEntity<ApiErrorResponse> buildResponse(HttpStatus status,
                                                           String code,
                                                           String message) {
        return ResponseEntity.status(status)
                .body(new ApiErrorResponse(new ApiError(code, message)));
    }

    private String deriveCode(ResponseStatusException ex) {
        return switch (ex.getStatusCode().value()) {
            case 400 -> "BAD_REQUEST";
            case 401 -> "UNAUTHORIZED";
            case 403 -> "FORBIDDEN";
            case 404 -> "NOT_FOUND";
            case 409 -> "CONFLICT";
            case 429 -> "RATE_LIMIT_EXCEEDED";
            default  -> "ERROR";
        };
    }
}
