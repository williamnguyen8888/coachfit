package com.coachfit.athlete.application.service;

import com.coachfit.athlete.application.port.in.*;
import com.coachfit.athlete.application.port.out.AthleteProfilePersistencePort;
import com.coachfit.athlete.application.port.out.ConnectionsPersistencePort;
import com.coachfit.athlete.application.port.out.SportZonePersistencePort;
import com.coachfit.athlete.application.port.out.UserSummaryPersistencePort;
import com.coachfit.athlete.domain.exception.ProviderNotFoundException;
import com.coachfit.athlete.domain.model.AthleteProfile;
import com.coachfit.athlete.domain.model.OAuthConnection;
import com.coachfit.athlete.domain.model.SportZone;
import com.coachfit.athlete.domain.model.SportZone.ZoneBand;
import com.coachfit.athlete.domain.model.UserSummary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Core athlete service — implements all six athlete domain use cases.
 *
 * <ul>
 *   <li>GET /athlete  → {@link GetAthleteProfileUseCase}</li>
 *   <li>PUT /athlete  → {@link UpdateAthleteProfileUseCase}</li>
 *   <li>GET /athlete/zones → {@link GetSportZonesUseCase}</li>
 *   <li>PUT /athlete/zones/{sport} → {@link UpsertSportZoneUseCase}</li>
 *   <li>GET /athlete/connections → {@link GetConnectionsUseCase}</li>
 *   <li>DELETE /athlete/connections/{provider} → {@link DisconnectProviderUseCase}</li>
 * </ul>
 *
 * <p>All dependencies are within the {@code athlete} or {@code shared} module
 * — no cross-module imports from {@code auth} to maintain modulith boundaries.
 */
@Service
public class AthleteService
        implements GetAthleteProfileUseCase,
                   UpdateAthleteProfileUseCase,
                   GetSportZonesUseCase,
                   UpsertSportZoneUseCase,
                   GetConnectionsUseCase,
                   DisconnectProviderUseCase {

    /** Supported sports — keeps validation in sync with schema docs. */
    private static final Set<String> SUPPORTED_SPORTS =
            Set.of("cycling", "running", "swimming");

    /** Supported zone types per sport. */
    private static final Set<String> SUPPORTED_ZONE_TYPES =
            Set.of("power", "heart_rate", "pace");

    private final UserSummaryPersistencePort    userPort;
    private final AthleteProfilePersistencePort profilePort;
    private final SportZonePersistencePort      zonePort;
    private final ConnectionsPersistencePort    connectionsPort;

    public AthleteService(UserSummaryPersistencePort userPort,
                          AthleteProfilePersistencePort profilePort,
                          SportZonePersistencePort zonePort,
                          ConnectionsPersistencePort connectionsPort) {
        this.userPort        = userPort;
        this.profilePort     = profilePort;
        this.zonePort        = zonePort;
        this.connectionsPort = connectionsPort;
    }

    // ── GET /athlete ──────────────────────────────────────────────────────────

    @Override
    public GetAthleteProfileUseCase.Result getProfile(UUID userId) {
        UserSummary user = userPort.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found"));

        AthleteProfile profile = profilePort.findByUserId(userId).orElse(null);
        return new GetAthleteProfileUseCase.Result(user, profile);
    }

    // ── PUT /athlete ──────────────────────────────────────────────────────────

    @Override
    @Transactional
    public UpdateAthleteProfileUseCase.Result update(UpdateAthleteProfileUseCase.UpdateCommand cmd) {
        UserSummary user = userPort.findById(cmd.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "User not found"));

        // Validate sports list if provided
        if (cmd.sports() != null) {
            for (String sport : cmd.sports()) {
                if (!SUPPORTED_SPORTS.contains(sport)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Unsupported sport: " + sport + ". Allowed: " + SUPPORTED_SPORTS);
                }
            }
        }

        // Validate gender if provided
        if (cmd.gender() != null && !Set.of("male", "female", "other").contains(cmd.gender())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid gender. Allowed: male, female, other");
        }

        // Validate experienceLevel if provided
        if (cmd.experienceLevel() != null
                && !Set.of("beginner", "intermediate", "advanced", "expert")
                        .contains(cmd.experienceLevel())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid experience level. Allowed: beginner, intermediate, advanced, expert");
        }

        // Update users table (fullName, settings) if provided
        if (cmd.fullName() != null || cmd.settings() != null) {
            userPort.updateUserFields(cmd.userId(), cmd.fullName(), cmd.settings());
            // Reload to pick up name change
            user = userPort.findById(cmd.userId()).orElse(user);
        }

        // Load existing profile or create a blank one
        AthleteProfile existing = profilePort.findByUserId(cmd.userId()).orElse(null);

        AthleteProfile updated = buildUpdatedProfile(existing, cmd);
        AthleteProfile saved = profilePort.upsert(updated);

        return new UpdateAthleteProfileUseCase.Result(user, saved);
    }

    // ── GET /athlete/zones ────────────────────────────────────────────────────

    @Override
    public List<SportZone> getZones(UUID userId) {
        return zonePort.findLatestByUserId(userId);
    }

    // ── PUT /athlete/zones/{sport} ────────────────────────────────────────────

    @Override
    @Transactional
    public SportZone upsert(UpsertSportZoneUseCase.UpsertCommand cmd) {
        if (!SUPPORTED_SPORTS.contains(cmd.sport())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported sport: " + cmd.sport() + ". Allowed: " + SUPPORTED_SPORTS);
        }

        if (!SUPPORTED_ZONE_TYPES.contains(cmd.zoneType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unsupported zone type: " + cmd.zoneType() + ". Allowed: " + SUPPORTED_ZONE_TYPES);
        }

        // Validate zone bands: max must be > min
        for (UpsertSportZoneUseCase.ZoneBandInput band : cmd.zones()) {
            if (band.max() <= band.min()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Zone " + band.zone() + ": max (" + band.max()
                                + ") must be greater than min (" + band.min() + ")");
            }
        }

        List<ZoneBand> domainBands = cmd.zones().stream()
                .map(b -> new ZoneBand(b.zone(), b.name(), b.min(), b.max()))
                .toList();

        SportZone zone = new SportZone(
                null,                // id assigned by DB
                cmd.userId(),
                cmd.sport(),
                cmd.zoneType(),
                cmd.ftp(),
                cmd.lthr(),
                cmd.maxHr(),
                domainBands,
                cmd.effectiveDate() != null ? cmd.effectiveDate() : LocalDate.now(),
                null
        );

        return zonePort.upsert(zone);
    }

    // ── GET /athlete/connections ──────────────────────────────────────────────

    @Override
    public List<OAuthConnection> getConnections(UUID userId) {
        return connectionsPort.findActiveByUserId(userId);
    }

    // ── DELETE /athlete/connections/{provider} ────────────────────────────────

    @Override
    @Transactional
    public void disconnect(UUID userId, String provider) {
        if (!connectionsPort.existsActive(userId, provider)) {
            throw new ProviderNotFoundException(provider);
        }
        connectionsPort.softDisconnect(userId, provider);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private AthleteProfile buildUpdatedProfile(AthleteProfile existing,
                                                UpdateAthleteProfileUseCase.UpdateCommand cmd) {
        // If no existing profile, create from scratch
        if (existing == null) {
            return new AthleteProfile(
                    null,
                    cmd.userId(),
                    cmd.dateOfBirth(),
                    cmd.gender(),
                    cmd.weightKg(),
                    cmd.heightCm(),
                    cmd.sports() != null ? cmd.sports() : List.of(),
                    cmd.experienceLevel(),
                    cmd.primarySport(),
                    cmd.primaryHealthSource(),
                    null,
                    null
            );
        }
        // Merge: only overwrite non-null incoming fields
        return new AthleteProfile(
                existing.id(),
                existing.userId(),
                cmd.dateOfBirth()           != null ? cmd.dateOfBirth()           : existing.dateOfBirth(),
                cmd.gender()                != null ? cmd.gender()                : existing.gender(),
                cmd.weightKg()              != null ? cmd.weightKg()              : existing.weightKg(),
                cmd.heightCm()              != null ? cmd.heightCm()              : existing.heightCm(),
                cmd.sports()                != null ? cmd.sports()                : existing.sports(),
                cmd.experienceLevel()       != null ? cmd.experienceLevel()       : existing.experienceLevel(),
                cmd.primarySport()          != null ? cmd.primarySport()          : existing.primarySport(),
                cmd.primaryHealthSource()   != null ? cmd.primaryHealthSource()   : existing.primaryHealthSource(),
                existing.createdAt(),
                existing.updatedAt()
        );
    }
}
