package com.coachfit.coach.security;

import com.coachfit.coach.application.port.out.CoachAthletePersistencePort;
import com.coachfit.coach.domain.model.CoachAthlete;
import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Spring Security expression component for coach access control.
 *
 * <p>Registered as {@code "coachAccess"} bean so it can be referenced in SpEL
 * method security expressions:
 * <pre>
 * {@literal @}PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readActivities')")
 * {@literal @}GetMapping("/api/v1/coach/athletes/{athleteId}/activities")
 * public ResponseEntity<?> getAthleteActivities(@PathVariable UUID athleteId) { ... }
 * </pre>
 *
 * <p><strong>Access check flow</strong> (docs/08-auth-model.md §Coach Access Control):
 * <ol>
 *   <li>Extract coach userId from {@link UserPrincipal}</li>
 *   <li>Query {@code coach_athletes} WHERE coach_user_id=? AND athlete_user_id=? AND status='active'</li>
 *   <li>Check {@code permissions} JSONB contains the required flag = {@code true}</li>
 *   <li>If no match or flag is {@code false} → return {@code false} → Spring Security → 403</li>
 * </ol>
 *
 * <p><strong>Module boundary:</strong> This component lives inside the {@code coach} module
 * and is wired to {@link CoachAthletePersistencePort} — it does NOT import Spring Security
 * internals beyond reading the {@link UserPrincipal} which is a shared-module type.
 */
@Component("coachAccess")
public class CoachAccessFacade {

    private final CoachAthletePersistencePort coachAthletePersistence;

    public CoachAccessFacade(CoachAthletePersistencePort coachAthletePersistence) {
        this.coachAthletePersistence = coachAthletePersistence;
    }

    // ── Primary access-check predicate ────────────────────────────────────────

    /**
     * Returns {@code true} if the authenticated coach has the named permission
     * for the given athlete.
     *
     * <p>Usage in SpEL:
     * <pre>
     * @PreAuthorize("@coachAccess.hasAccess(principal, #athleteId, 'readActivities')")
     * </pre>
     *
     * @param principal  the authenticated coach's principal from SecurityContext
     * @param athleteId  the target athlete's user ID
     * @param permission the permission key (one of {@link com.coachfit.coach.domain.model.CoachPermissions#ALL_KEYS})
     * @return {@code true} iff relationship is active and the permission flag is true
     */
    public boolean hasAccess(UserPrincipal principal, UUID athleteId, String permission) {
        if (principal == null || athleteId == null || permission == null) {
            return false;
        }

        UUID coachId = principal.getUserId();
        if (!isCoachRole(principal)) {
            return false;
        }

        return coachAthletePersistence
                .findByCoachAndAthlete(coachId, athleteId)
                .filter(CoachAthlete::isActive)
                .map(rel -> rel.permissions().has(permission))
                .orElse(false);
    }

    /**
     * Convenience overload that takes the coach UUID directly.
     * Useful in non-SpEL contexts (e.g. service-to-service calls within the module).
     *
     * @param coachId    coach's user ID
     * @param athleteId  target athlete's user ID
     * @param permission permission key
     */
    public boolean hasAccess(UUID coachId, UUID athleteId, String permission) {
        if (coachId == null || athleteId == null || permission == null) {
            return false;
        }

        return coachAthletePersistence
                .findByCoachAndAthlete(coachId, athleteId)
                .filter(CoachAthlete::isActive)
                .map(rel -> rel.permissions().has(permission))
                .orElse(false);
    }

    // ── Role check helpers ────────────────────────────────────────────────────

    /**
     * Returns {@code true} if the principal carries the {@code coach} role.
     * Can be used standalone in SpEL:
     * <pre>
     * @PreAuthorize("@coachAccess.isCoachRole(principal)")
     * </pre>
     */
    public boolean isCoachRole(UserPrincipal principal) {
        return principal != null && "coach".equalsIgnoreCase(principal.getRole());
    }

    /**
     * Returns {@code true} if the authenticated user IS the target athlete.
     * Used in combination checks, e.g. a coach viewing their own activity.
     */
    public boolean isSelf(UserPrincipal principal, UUID userId) {
        return principal != null && userId != null && userId.equals(principal.getUserId());
    }
}
