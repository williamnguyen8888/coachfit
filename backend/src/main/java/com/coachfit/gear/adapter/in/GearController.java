package com.coachfit.gear.adapter.in;

import com.coachfit.gear.adapter.in.dto.GearRequest;
import com.coachfit.gear.adapter.in.dto.GearResponse;
import com.coachfit.gear.application.port.in.GearUseCase;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for gear management.
 *
 * <pre>
 * GET    /api/v1/gear           — list active gear for the authenticated user
 * POST   /api/v1/gear           — create a new gear item
 * PUT    /api/v1/gear/{id}      — update name/sport/type
 * DELETE /api/v1/gear/{id}      — retire (soft-delete: is_active = false)
 * </pre>
 *
 * <p>Ownership is enforced in {@link GearUseCase}: any attempt to modify gear
 * belonging to another user returns 404.
 */
@RestController
@RequestMapping("/api/v1/gear")
public class GearController {

    private final GearUseCase gearUseCase;

    public GearController(GearUseCase gearUseCase) {
        this.gearUseCase = gearUseCase;
    }

    // ── GET /gear ─────────────────────────────────────────────────────────────

    /**
     * Lists all active gear for the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<GearResponse>> listGear(
            @AuthenticationPrincipal UserPrincipal principal) {

        List<GearResponse> body = GearResponse.fromList(
                gearUseCase.listGear(principal.getUserId()));
        return ResponseEntity.ok(body);
    }

    // ── POST /gear ────────────────────────────────────────────────────────────

    /**
     * Creates a new gear item for the authenticated user.
     */
    @PostMapping
    public ResponseEntity<GearResponse> createGear(
            @Valid @RequestBody GearRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        GearResponse body = GearResponse.from(
                gearUseCase.createGear(principal.getUserId(),
                        request.name(), request.sport(), request.type()));
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    // ── PUT /gear/{id} ────────────────────────────────────────────────────────

    /**
     * Updates a gear item's name, sport, or type.
     * Returns 404 if the gear does not belong to the requesting user.
     */
    @PutMapping("/{id}")
    public ResponseEntity<GearResponse> updateGear(
            @PathVariable UUID id,
            @Valid @RequestBody GearRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        GearResponse body = GearResponse.from(
                gearUseCase.updateGear(principal.getUserId(), id,
                        request.name(), request.sport(), request.type()));
        return ResponseEntity.ok(body);
    }

    // ── DELETE /gear/{id} ─────────────────────────────────────────────────────

    /**
     * Retires (soft-deletes) a gear item ({@code is_active = false}).
     * Returns 204 No Content on success, 404 if not found / not owned.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> retireGear(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        gearUseCase.retireGear(principal.getUserId(), id);
        return ResponseEntity.noContent().build();
    }
}
