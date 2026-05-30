package com.coachfit.apikey.adapter.in;

import com.coachfit.apikey.adapter.in.dto.ApiKeyCreatedResponse;
import com.coachfit.apikey.adapter.in.dto.ApiKeyResponse;
import com.coachfit.apikey.adapter.in.dto.CreateApiKeyRequest;
import com.coachfit.apikey.application.port.in.ApiKeyUseCase;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for API key management.
 *
 * <pre>
 * GET    /api/v1/api-keys        — list all keys (no raw key)
 * POST   /api/v1/api-keys        — create key (raw key in response ONCE)
 * DELETE /api/v1/api-keys/{id}   — revoke key
 * </pre>
 *
 * <p>The raw API key is returned <strong>only once</strong> in the {@code POST} response.
 * Subsequent calls to {@code GET} will show only the prefix for identification.
 */
@RestController
@RequestMapping("/api/v1/api-keys")
public class ApiKeyController {

    private final ApiKeyUseCase apiKeyUseCase;

    public ApiKeyController(ApiKeyUseCase apiKeyUseCase) {
        this.apiKeyUseCase = apiKeyUseCase;
    }

    // ── GET /api-keys ─────────────────────────────────────────────────────────

    /**
     * Returns all API keys for the authenticated user. Raw key is never included.
     */
    @GetMapping
    public ResponseEntity<List<ApiKeyResponse>> listKeys(
            @AuthenticationPrincipal UserPrincipal principal) {

        List<ApiKeyResponse> body = apiKeyUseCase.listKeys(principal.getUserId())
                .stream().map(ApiKeyResponse::from).toList();
        return ResponseEntity.ok(body);
    }

    // ── POST /api-keys ────────────────────────────────────────────────────────

    /**
     * Creates a new API key. The {@code rawKey} field in the response is shown
     * <strong>exactly once</strong> — store it immediately.
     */
    @PostMapping
    public ResponseEntity<ApiKeyCreatedResponse> createKey(
            @Valid @RequestBody CreateApiKeyRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        ApiKeyCreatedResponse body = ApiKeyCreatedResponse.from(
                apiKeyUseCase.createKey(principal.getUserId(),
                        request.name(), request.expiresAt()));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    // ── DELETE /api-keys/{id} ─────────────────────────────────────────────────

    /**
     * Revokes an API key (sets {@code is_active = false}).
     * Returns 404 if the key does not belong to the requesting user.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revokeKey(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        apiKeyUseCase.revokeKey(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
