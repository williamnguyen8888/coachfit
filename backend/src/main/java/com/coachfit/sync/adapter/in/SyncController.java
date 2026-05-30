package com.coachfit.sync.adapter.in;

import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.coachfit.sync.application.port.in.SyncSupportUseCase;
import com.coachfit.sync.application.port.in.SyncSupportUseCase.SyncLogPage;
import com.coachfit.sync.application.port.in.SyncSupportUseCase.SyncStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for the sync support surface.
 *
 * <pre>
 * GET  /api/v1/sync/status                — per-provider connection and sync state
 * POST /api/v1/sync/trigger/{provider}    — enqueue a manual sync (202 Accepted)
 * GET  /api/v1/sync/logs?page=0&size=20   — paginated sync log
 * </pre>
 *
 * <p>Trigger is accepted optimistically (202) — the actual sync runs asynchronously
 * via the Redis Stream consumer. Monitor progress via {@code GET /sync/logs}.
 */
@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

    private final SyncSupportUseCase syncUseCase;

    public SyncController(SyncSupportUseCase syncUseCase) {
        this.syncUseCase = syncUseCase;
    }

    // ── GET /sync/status ─────────────────────────────────────────────────────

    /**
     * Returns the current sync connection status for all connected providers.
     */
    @GetMapping("/status")
    public ResponseEntity<SyncStatus> getStatus(
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(syncUseCase.getStatus(principal.getUserId()));
    }

    // ── POST /sync/trigger/{provider} ────────────────────────────────────────

    /**
     * Enqueues a manual sync for the specified provider.
     * Responds 202 Accepted — processing is asynchronous.
     *
     * @param provider provider name: {@code strava} or {@code garmin}
     */
    @PostMapping("/trigger/{provider}")
    public ResponseEntity<Void> triggerSync(
            @PathVariable String provider,
            @AuthenticationPrincipal UserPrincipal principal) {

        syncUseCase.triggerSync(principal.getUserId(), provider);
        return ResponseEntity.accepted().build();
    }

    // ── GET /sync/logs ────────────────────────────────────────────────────────

    /**
     * Returns paginated sync logs for the authenticated user, newest first.
     *
     * @param page 0-indexed page number (default 0)
     * @param size page size (default 20, max 100)
     */
    @GetMapping("/logs")
    public ResponseEntity<SyncLogPage> getLogs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(syncUseCase.getLogs(principal.getUserId(), page, size));
    }
}
