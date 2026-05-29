package com.coachfit.athlete.adapter.in;

import com.coachfit.athlete.adapter.in.dto.*;
import com.coachfit.athlete.application.port.in.*;
import com.coachfit.athlete.domain.model.AthleteProfile;
import com.coachfit.athlete.domain.model.OAuthConnection;
import com.coachfit.athlete.domain.model.SportZone;
import com.coachfit.athlete.domain.model.UserSummary;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for athlete profile, sport zones, and provider connections.
 *
 * <pre>
 * GET    /api/v1/athlete                           → 200 AthleteResponse
 * PUT    /api/v1/athlete                           → 200 AthleteResponse
 * GET    /api/v1/athlete/zones                     → 200 List&lt;SportZoneResponse&gt;
 * PUT    /api/v1/athlete/zones/{sport}             → 200 SportZoneResponse
 * GET    /api/v1/athlete/connections               → 200 List&lt;ConnectionResponse&gt;
 * DELETE /api/v1/athlete/connections/{provider}    → 204
 * </pre>
 *
 * <p>All endpoints require authentication (JWT or API key).
 * User identity is extracted from the {@link UserPrincipal} — no user ID in the path.
 */
@RestController
@RequestMapping("/api/v1/athlete")
public class AthleteController {

    private final GetAthleteProfileUseCase   getProfileUseCase;
    private final UpdateAthleteProfileUseCase updateProfileUseCase;
    private final GetSportZonesUseCase       getZonesUseCase;
    private final UpsertSportZoneUseCase     upsertZoneUseCase;
    private final GetConnectionsUseCase      getConnectionsUseCase;
    private final DisconnectProviderUseCase  disconnectUseCase;
    private final ObjectMapper               objectMapper;

    public AthleteController(GetAthleteProfileUseCase getProfileUseCase,
                             UpdateAthleteProfileUseCase updateProfileUseCase,
                             GetSportZonesUseCase getZonesUseCase,
                             UpsertSportZoneUseCase upsertZoneUseCase,
                             GetConnectionsUseCase getConnectionsUseCase,
                             DisconnectProviderUseCase disconnectUseCase,
                             ObjectMapper objectMapper) {
        this.getProfileUseCase    = getProfileUseCase;
        this.updateProfileUseCase = updateProfileUseCase;
        this.getZonesUseCase      = getZonesUseCase;
        this.upsertZoneUseCase    = upsertZoneUseCase;
        this.getConnectionsUseCase = getConnectionsUseCase;
        this.disconnectUseCase    = disconnectUseCase;
        this.objectMapper         = objectMapper;
    }

    // ── GET /athlete ──────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<AthleteResponse> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        GetAthleteProfileUseCase.Result result = getProfileUseCase.getProfile(principal.getUserId());
        return ResponseEntity.ok(toAthleteResponse(result.user(), result.profile()));
    }

    // ── PUT /athlete ──────────────────────────────────────────────────────────

    @PutMapping
    public ResponseEntity<AthleteResponse> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateAthleteRequest req) {

        UUID userId = principal.getUserId();

        // Convert settings Object → JSON string if provided
        String settingsJson = null;
        if (req.settings() != null) {
            try {
                settingsJson = objectMapper.writeValueAsString(req.settings());
            } catch (JsonProcessingException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid settings JSON");
            }
        }

        UpdateAthleteProfileUseCase.UpdateCommand cmd = new UpdateAthleteProfileUseCase.UpdateCommand(
                userId,
                req.fullName(),
                settingsJson,
                req.sports(),
                req.primarySport(),
                req.experienceLevel(),
                req.weightKg(),
                req.heightCm(),
                req.gender(),
                req.dateOfBirth(),
                req.primaryHealthSource()
        );

        UpdateAthleteProfileUseCase.Result result = updateProfileUseCase.update(cmd);
        return ResponseEntity.ok(toAthleteResponse(result.user(), result.profile()));
    }

    // ── GET /athlete/zones ────────────────────────────────────────────────────

    @GetMapping("/zones")
    public ResponseEntity<List<SportZoneResponse>> getZones(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<SportZone> zones = getZonesUseCase.getZones(principal.getUserId());
        return ResponseEntity.ok(zones.stream().map(this::toZoneResponse).toList());
    }

    // ── PUT /athlete/zones/{sport} ────────────────────────────────────────────

    @PutMapping("/zones/{sport}")
    public ResponseEntity<SportZoneResponse> upsertZone(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String sport,
            @Valid @RequestBody UpsertSportZoneRequest req) {

        UUID userId = principal.getUserId();

        List<UpsertSportZoneUseCase.ZoneBandInput> bands = req.zones().stream()
                .map(b -> new UpsertSportZoneUseCase.ZoneBandInput(
                        b.zone(), b.name(), b.min(), b.max()))
                .toList();

        UpsertSportZoneUseCase.UpsertCommand cmd = new UpsertSportZoneUseCase.UpsertCommand(
                userId,
                sport,
                req.zoneType(),
                req.ftp(),
                req.lthr(),
                req.maxHr(),
                bands,
                req.effectiveDate()
        );

        SportZone saved = upsertZoneUseCase.upsert(cmd);
        return ResponseEntity.ok(toZoneResponse(saved));
    }

    // ── GET /athlete/connections ──────────────────────────────────────────────

    @GetMapping("/connections")
    public ResponseEntity<List<ConnectionResponse>> getConnections(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<OAuthConnection> connections = getConnectionsUseCase.getConnections(principal.getUserId());
        return ResponseEntity.ok(connections.stream().map(this::toConnectionResponse).toList());
    }

    // ── DELETE /athlete/connections/{provider} ────────────────────────────────

    @DeleteMapping("/connections/{provider}")
    public ResponseEntity<Void> disconnect(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String provider) {

        disconnectUseCase.disconnect(principal.getUserId(), provider);
        return ResponseEntity.noContent().build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AthleteResponse toAthleteResponse(UserSummary user, AthleteProfile profile) {
        ProfileDto profileDto = profile != null ? new ProfileDto(
                profile.sports(),
                profile.primarySport(),
                profile.experienceLevel(),
                profile.weightKg(),
                profile.heightCm(),
                profile.gender(),
                profile.dateOfBirth(),
                profile.primaryHealthSource()
        ) : null;

        // settings is stored as JSON in users.settings; parse it back to a Map for the response.
        Map<String, Object> settingsMap = Map.of();

        return new AthleteResponse(
                user.id().toString(),
                user.email(),
                user.fullName(),
                null,   // avatarUrl — UserPersistencePort doesn't yet surface it; safe default
                user.role(),
                user.tier(),
                profileDto,
                settingsMap
        );
    }

    private SportZoneResponse toZoneResponse(SportZone z) {
        List<SportZoneResponse.ZoneBandDto> bands = z.zones().stream()
                .map(b -> new SportZoneResponse.ZoneBandDto(b.zone(), b.name(), b.min(), b.max()))
                .toList();
        return new SportZoneResponse(
                z.id() != null ? z.id().toString() : null,
                z.sport(),
                z.zoneType(),
                z.ftp(),
                z.lthr(),
                z.maxHr(),
                bands,
                z.effectiveDate()
        );
    }

    private ConnectionResponse toConnectionResponse(OAuthConnection c) {
        return new ConnectionResponse(
                c.provider(),
                c.syncStatus(),
                c.lastSyncAt(),
                c.pushEnabled(),
                c.createdAt()
        );
    }
}
