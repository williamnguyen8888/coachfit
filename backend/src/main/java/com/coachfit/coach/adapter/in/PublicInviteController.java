package com.coachfit.coach.adapter.in;

import com.coachfit.coach.application.port.in.AcceptInviteLinkUseCase;
import com.coachfit.coach.application.port.in.AcceptInviteUseCase;
import com.coachfit.coach.domain.exception.AthleteAlreadyConnectedException;
import com.coachfit.coach.domain.exception.AthleteCapacityExceededException;
import com.coachfit.coach.domain.exception.InviteTokenExpiredException;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.shared.adapter.in.web.ApiError;
import com.coachfit.shared.adapter.in.web.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Public invite acceptance endpoints — both email-token and link-code flows.
 *
 * <pre>
 * GET /api/v1/coach/invites/{token}/accept   — accept email invite (requires auth)
 * GET /join/{code}                           — accept invite link  (requires auth)
 * </pre>
 *
 * <p>Both endpoints require the athlete to be authenticated (Spring Security enforces this
 * since all endpoints except the explicitly permitted public ones need auth). The
 * {@code /join/**} pattern is listed in {@code SecurityConfig} as {@code permitAll()} only
 * for GET — in practice the athlete must be logged in to actually accept; if not, the
 * frontend redirects to login and redirects back with the code.
 *
 * <p>Note: {@code /join} routes are mapped here for the backend. The frontend handles the
 * login-redirect + redirect-back flow.
 */
@RestController
public class PublicInviteController {

    private final AcceptInviteUseCase     acceptInviteUseCase;
    private final AcceptInviteLinkUseCase acceptLinkUseCase;

    public PublicInviteController(AcceptInviteUseCase acceptInviteUseCase,
                                  AcceptInviteLinkUseCase acceptLinkUseCase) {
        this.acceptInviteUseCase = acceptInviteUseCase;
        this.acceptLinkUseCase   = acceptLinkUseCase;
    }

    // ── Accept email invite ───────────────────────────────────────────────────

    /**
     * Accepts an email-based coach invite.
     * The athlete must be authenticated before accessing this endpoint.
     *
     * @param token the JWT invite token from the email link URL path segment
     */
    @GetMapping("/api/v1/coach/invites/{token}/accept")
    public ResponseEntity<Map<String, String>> acceptEmailInvite(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal principal) {

        acceptInviteUseCase.accept(principal.getUserId(), token);
        return ResponseEntity.ok(Map.of("status", "accepted", "message", "You have joined the coach's roster."));
    }

    // ── Accept invite link ────────────────────────────────────────────────────

    /**
     * Accepts a shareable invite link.
     * The athlete must be authenticated; the frontend handles login-redirect for unauthenticated users.
     *
     * @param code the 12-char alphanumeric code from the URL
     */
    @GetMapping("/join/{code}")
    public ResponseEntity<Map<String, String>> acceptInviteLink(
            @PathVariable String code,
            @AuthenticationPrincipal UserPrincipal principal) {

        acceptLinkUseCase.acceptLink(principal.getUserId(), code);
        return ResponseEntity.ok(Map.of("status", "accepted", "message", "You have joined the coach's roster."));
    }

    // ── Exception handlers ────────────────────────────────────────────────────

    @ExceptionHandler(InviteTokenExpiredException.class)
    public ResponseEntity<ApiErrorResponse> handleExpired(InviteTokenExpiredException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ApiErrorResponse(new ApiError("INVITE_EXPIRED", ex.getMessage())));
    }

    @ExceptionHandler(AthleteAlreadyConnectedException.class)
    public ResponseEntity<ApiErrorResponse> handleAlreadyConnected(AthleteAlreadyConnectedException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ApiErrorResponse(new ApiError("ALREADY_CONNECTED", ex.getMessage())));
    }

    @ExceptionHandler(AthleteCapacityExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleCapacity(AthleteCapacityExceededException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ApiErrorResponse(new ApiError("ROSTER_FULL", ex.getMessage())));
    }
}
