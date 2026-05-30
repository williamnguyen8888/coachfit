package com.coachfit.account.adapter.in;

import com.coachfit.account.adapter.in.dto.*;
import com.coachfit.account.application.port.in.AccountUseCase;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;

/**
 * GDPR account management endpoints.
 *
 * <pre>
 * GET    /api/v1/account/export          — Request full data export (async, 202)
 * DELETE /api/v1/account                 — Schedule deletion (30-day grace, 200)
 * POST   /api/v1/account/cancel-deletion — Cancel pending deletion (200)
 * PUT    /api/v1/account/restrict        — Toggle processing restriction (200)
 * GET    /api/v1/account/privacy         — Privacy settings + consent log (200)
 * </pre>
 *
 * <p>All endpoints require authentication (JWT or API key).
 * References: docs/11-privacy-compliance.md §3, §8, §9.
 */
@RestController
@RequestMapping("/api/v1/account")
@Tag(name = "Account & Privacy", description = "GDPR user rights: data export, account deletion, processing restriction")
@SecurityRequirement(name = "bearerAuth")
public class AccountController {

    private final AccountUseCase accountUseCase;

    public AccountController(AccountUseCase accountUseCase) {
        this.accountUseCase = accountUseCase;
    }

    // ── GET /account/export ───────────────────────────────────────────────────

    /**
     * Requests a full data export (GDPR Art. 15 / Art. 20 — Right to Access / Portability).
     *
     * <p>Rate-limited to 1 request per 24 hours. Returns 202 Accepted immediately;
     * the export ZIP is generated asynchronously and delivered via in-app notification.
     * Pre-signed URL expires after 7 days.
     */
    @GetMapping("/export")
    @Operation(
            summary     = "Request data export",
            description = "Enqueues an async full data export (GDPR Art. 15/20). " +
                          "Rate-limited: 1 request per 24 hours. Returns 202 immediately; " +
                          "you will be notified when the export ZIP is ready."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "202", description = "Export job created"),
            @ApiResponse(responseCode = "429", description = "Rate limit: already requested today")
    })
    public ResponseEntity<ExportJobResponse> requestExport(
            @AuthenticationPrincipal UserPrincipal principal) {

        try {
            AccountUseCase.ExportJobResult result = accountUseCase.requestExport(principal.getUserId());
            ExportJobResponse body = new ExportJobResponse(
                    result.jobId(),
                    result.status(),
                    result.createdAt(),
                    result.expiresAt(),
                    "Your data export has been queued. You will receive a notification when it is ready."
            );
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(body);
        } catch (AccountUseCase.ExportRateLimitException e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        }
    }

    // ── DELETE /account ───────────────────────────────────────────────────────

    /**
     * Schedules account deletion with a 30-day grace period (GDPR Art. 17).
     *
     * <p>Immediately:
     * <ul>
     *   <li>Sets {@code users.deleted_at = now()}</li>
     *   <li>Revokes all refresh tokens (forces logout)</li>
     *   <li>Soft-revokes all OAuth connections (stops sync)</li>
     * </ul>
     * After 30 days: all data hard-deleted by scheduled job.
     */
    @DeleteMapping
    @Operation(
            summary     = "Delete account",
            description = "Schedules account deletion (GDPR Art. 17). " +
                          "Immediate soft-delete + token revocation. " +
                          "Hard delete of all data occurs 30 days after this request. " +
                          "Cancel within 30 days via POST /account/cancel-deletion."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Account scheduled for deletion"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated")
    })
    public ResponseEntity<AccountDeletionResponse> deleteAccount(
            @AuthenticationPrincipal UserPrincipal principal) {

        Instant deletionDate = accountUseCase.deleteAccount(principal.getUserId());
        AccountDeletionResponse body = new AccountDeletionResponse(
                "Account scheduled for deletion. You can cancel within 30 days.",
                deletionDate
        );
        return ResponseEntity.ok(body);
    }

    // ── POST /account/cancel-deletion ─────────────────────────────────────────

    /**
     * Cancels a pending account deletion within the 30-day grace period.
     *
     * <p>Note: OAuth connections revoked during deletion must be re-connected manually.
     */
    @PostMapping("/cancel-deletion")
    @Operation(
            summary     = "Cancel account deletion",
            description = "Cancels a pending deletion within the 30-day grace period. " +
                          "Note: previously revoked OAuth provider connections must be re-connected."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Deletion cancelled"),
            @ApiResponse(responseCode = "404", description = "No pending deletion found")
    })
    public ResponseEntity<CancelDeletionResponse> cancelDeletion(
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean cancelled = accountUseCase.cancelDeletion(principal.getUserId());
        if (!cancelled) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No pending account deletion found.");
        }
        return ResponseEntity.ok(new CancelDeletionResponse(
                "Account deletion cancelled. Your account has been restored.", true));
    }

    // ── PUT /account/restrict ─────────────────────────────────────────────────

    /**
     * Toggles data processing restriction (GDPR Art. 18 — Right to Restrict Processing).
     *
     * <p>When restricted:
     * <ul>
     *   <li>All sync jobs are paused for this user</li>
     *   <li>Webhook data from providers is not processed</li>
     *   <li>Existing data is retained but not updated</li>
     * </ul>
     */
    @PutMapping("/restrict")
    @Operation(
            summary     = "Set processing restriction",
            description = "Enables or disables GDPR Art. 18 processing restriction. " +
                          "When restricted=true, all sync jobs and webhook processing are paused. " +
                          "Existing data is retained but not updated. Can be toggled at any time."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Restriction state updated"),
            @ApiResponse(responseCode = "400", description = "Invalid request body")
    })
    public ResponseEntity<java.util.Map<String, Object>> setRestriction(
            @Valid @RequestBody AccountRestrictionRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean current = accountUseCase.setProcessingRestriction(
                principal.getUserId(), request.restricted());

        return ResponseEntity.ok(java.util.Map.of(
                "processingRestricted", current,
                "message", current
                        ? "Data processing is now restricted. Sync jobs are paused."
                        : "Data processing restriction removed. Sync jobs will resume."));
    }

    // ── GET /account/privacy ──────────────────────────────────────────────────

    /**
     * Returns current privacy settings and the full consent log.
     */
    @GetMapping("/privacy")
    @Operation(
            summary     = "Get privacy settings",
            description = "Returns current privacy state: processing restriction status, " +
                          "pending deletion date (if applicable), and the full consent log."
    )
    @ApiResponse(responseCode = "200", description = "Privacy status returned")
    public ResponseEntity<AccountPrivacyResponse> getPrivacy(
            @AuthenticationPrincipal UserPrincipal principal) {

        AccountUseCase.PrivacyStatus status = accountUseCase.getPrivacyStatus(principal.getUserId());

        List<AccountPrivacyResponse.Consent> consents = status.consents().stream()
                .map(c -> new AccountPrivacyResponse.Consent(
                        c.type(), c.granted(), c.grantedAt(), c.ipAddress(), c.version()))
                .toList();

        AccountPrivacyResponse body = new AccountPrivacyResponse(
                status.processingRestricted(),
                status.deletedAt(),
                consents
        );
        return ResponseEntity.ok(body);
    }
}
