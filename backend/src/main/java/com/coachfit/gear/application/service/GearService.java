package com.coachfit.gear.application.service;

import com.coachfit.gear.application.port.in.GearUseCase;
import com.coachfit.gear.application.port.out.GearPersistencePort;
import com.coachfit.gear.application.port.out.GearPersistencePort.GearSummary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Application service implementing {@link GearUseCase}.
 *
 * <p>Ownership is enforced for every mutating operation: the gear's
 * {@code userId} must match the requesting user, otherwise 404 is returned
 * (not 403 — we don't confirm the item exists to other users).
 */
@Service
public class GearService implements GearUseCase {

    private final GearPersistencePort persistence;

    public GearService(GearPersistencePort persistence) {
        this.persistence = persistence;
    }

    // ── List ─────────────────────────────────────────────────────────────────

    @Override
    public List<GearItem> listGear(UUID userId) {
        return persistence.findActiveByUserId(userId).stream()
                .map(this::toItem)
                .toList();
    }

    // ── Create ───────────────────────────────────────────────────────────────

    @Override
    public GearItem createGear(UUID userId, String name, String sport, String type) {
        UUID id = persistence.save(userId, name, sport, type);
        return persistence.findById(id)
                .map(this::toItem)
                .orElseThrow();
    }

    // ── Update ───────────────────────────────────────────────────────────────

    @Override
    public GearItem updateGear(UUID userId, UUID gearId, String name, String sport, String type) {
        GearSummary existing = findOwnedOrThrow(userId, gearId);
        persistence.update(gearId, name, sport, existing.type() != null ? type : null);
        return persistence.findById(gearId)
                .map(this::toItem)
                .orElseThrow();
    }

    // ── Retire (soft-delete) ─────────────────────────────────────────────────

    @Override
    public void retireGear(UUID userId, UUID gearId) {
        findOwnedOrThrow(userId, gearId);
        persistence.retire(gearId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private GearSummary findOwnedOrThrow(UUID userId, UUID gearId) {
        return persistence.findById(gearId)
                .filter(g -> g.userId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Gear not found."));
    }

    private GearItem toItem(GearSummary s) {
        return new GearItem(s.id(), s.name(), s.sport(), s.type(),
                s.isActive(), s.totalDistanceMeters(), s.createdAt());
    }
}
