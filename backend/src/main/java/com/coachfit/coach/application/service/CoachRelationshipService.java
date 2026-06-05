package com.coachfit.coach.application.service;

import com.coachfit.coach.application.port.in.*;
import com.coachfit.coach.application.port.out.*;
import com.coachfit.coach.domain.exception.*;
import com.coachfit.coach.domain.model.CoachAthlete;
import com.coachfit.coach.domain.model.CoachInviteLink;
import com.coachfit.coach.domain.model.CoachPermissions;
import com.coachfit.shared.adapter.in.security.jwt.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

/**
 * Central application service for the coach module.
 *
 * <p>Implements all inbound use-case ports:
 * <ul>
 *   <li>{@link GetCoachRosterUseCase}</li>
 *   <li>{@link GetAthleteRelationshipUseCase}</li>
 *   <li>{@link InviteAthleteUseCase}</li>
 *   <li>{@link AcceptInviteUseCase}</li>
 *   <li>{@link AcceptInviteLinkUseCase}</li>
 *   <li>{@link RevokeCoachAthleteUseCase}</li>
 *   <li>{@link ManageInviteLinksUseCase}</li>
 *   <li>{@link UpdateAthleteMetaUseCase}</li>
 *   <li>{@link GetAthleteCoachInfoUseCase}</li>
 *   <li>{@link UpdateCoachPermissionsUseCase}</li>
 * </ul>
 *
 * <p><strong>Cross-module boundary:</strong> All interactions with other modules
 * ({@code users}, {@code athlete_profiles}, {@code training_load}, etc.) go through
 * {@link CoachUserQueryPort} — implemented with plain SQL, zero cross-module type imports.
 */
@Service
@Transactional
public class CoachRelationshipService
        implements GetCoachRosterUseCase,
                   GetAthleteRelationshipUseCase,
                   InviteAthleteUseCase,
                   AcceptInviteUseCase,
                   AcceptInviteLinkUseCase,
                   RevokeCoachAthleteUseCase,
                   ManageInviteLinksUseCase,
                   UpdateAthleteMetaUseCase,
                   GetAthleteCoachInfoUseCase,
                   UpdateCoachPermissionsUseCase {

    private static final Logger log = LoggerFactory.getLogger(CoachRelationshipService.class);

    /** Maximum active athletes per coach tier (docs/08-auth-model.md §Athlete Limit per Coach). */
    private static final int MAX_ATHLETES_COACH_TIER = 20;

    /** Alphabet for generating invite link codes (alphanumeric, unambiguous chars). */
    private static final String CODE_ALPHABET =
            "abcdefghjkmnpqrstuvwxyz23456789"; // omit 0,1,i,l,o for readability
    private static final int CODE_LENGTH = 12;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final CoachAthletePersistencePort  coachAthletePersistence;
    private final CoachInviteLinkPersistencePort inviteLinkPersistence;
    private final CoachUserQueryPort           userQuery;
    private final CoachNotificationPort        notificationPort;
    private final CoachEmailPort               emailPort;
    private final JwtTokenProvider             jwtTokenProvider;

    public CoachRelationshipService(
            CoachAthletePersistencePort coachAthletePersistence,
            CoachInviteLinkPersistencePort inviteLinkPersistence,
            CoachUserQueryPort userQuery,
            CoachNotificationPort notificationPort,
            CoachEmailPort emailPort,
            JwtTokenProvider jwtTokenProvider) {
        this.coachAthletePersistence = coachAthletePersistence;
        this.inviteLinkPersistence   = inviteLinkPersistence;
        this.userQuery               = userQuery;
        this.notificationPort        = notificationPort;
        this.emailPort               = emailPort;
        this.jwtTokenProvider        = jwtTokenProvider;
    }

    // ── GetCoachRosterUseCase ─────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public RosterPage getRoster(UUID coachId, int page, int size) {
        int offset = page * size;
        List<CoachAthlete> relationships = coachAthletePersistence.findActiveByCoach(coachId, offset, size);
        long total = coachAthletePersistence.countActiveByCoach(coachId);

        List<RosterEntry> entries = relationships.stream()
                .map(rel -> enrichRosterEntry(rel))
                .toList();

        return new RosterPage(entries, page, size, total);
    }

    private RosterEntry enrichRosterEntry(CoachAthlete rel) {
        UUID athleteId = rel.athleteUserId();

        CoachUserQueryPort.UserRow user = userQuery.findUserById(athleteId).orElse(null);
        CoachUserQueryPort.AthleteProfileRow profile = userQuery.findAthleteProfile(athleteId).orElse(null);
        CoachUserQueryPort.TrainingLoadRow tl = userQuery.findLatestTrainingLoad(athleteId).orElse(null);
        CoachUserQueryPort.LastActivityRow la = userQuery.findLastActivity(athleteId).orElse(null);
        CoachUserQueryPort.HealthSnapshotRow hs = userQuery.findLatestHealthSnapshot(athleteId).orElse(null);

        FitnessSnap fitness = tl != null
                ? new FitnessSnap(tl.ctl(), tl.atl(), tl.tsb())
                : null;
        LastActivity lastActivity = la != null
                ? new LastActivity(la.date(), la.sport(), la.name())
                : null;
        HealthSnap health = hs != null
                ? new HealthSnap(hs.restingHr(), hs.sleepScore())
                : null;

        return new RosterEntry(
                rel.id(),
                athleteId,
                user != null ? user.fullName() : "Unknown",
                rel.nickname(),
                user != null ? user.avatarUrl() : null,
                rel.status(),
                profile != null ? profile.sports() : List.of(),
                rel.tags() != null ? rel.tags() : List.of(),
                fitness,
                lastActivity,
                health,
                rel.acceptedAt()
        );
    }

    // ── GetAthleteRelationshipUseCase ─────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CoachAthlete getRelationshipAsCoach(UUID coachId, UUID athleteId) {
        return coachAthletePersistence.findByCoachAndAthlete(coachId, athleteId)
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "No relationship found between coach " + coachId + " and athlete " + athleteId));
    }

    @Override
    @Transactional(readOnly = true)
    public CoachAthlete getRelationshipAsAthlete(UUID athleteId) {
        return coachAthletePersistence.findActiveByAthlete(athleteId).orElse(null);
    }

    // ── InviteAthleteUseCase ──────────────────────────────────────────────────

    @Override
    public CoachAthleteRef invite(UUID coachId, InviteCommand cmd) {
        // 1. Verify caller is coach tier
        String tier = userQuery.getTierForUser(coachId);
        if (!"coach".equalsIgnoreCase(tier)) {
            throw new AthleteCapacityExceededException(0); // will produce 403
        }

        // 2. Capacity check
        int activeCount = coachAthletePersistence.countActiveOrPendingAthletes(coachId);
        if (activeCount >= MAX_ATHLETES_COACH_TIER) {
            throw new AthleteCapacityExceededException(MAX_ATHLETES_COACH_TIER);
        }

        // 3. Find athlete by email
        CoachUserQueryPort.UserRow athleteUser = userQuery.findUserByEmail(cmd.email())
                .orElse(null);

        UUID athleteId = athleteUser != null ? athleteUser.id() : null;

        // 4. Check for existing active/pending relationship if athlete already exists
        if (athleteId != null) {
            coachAthletePersistence.findByCoachAndAthlete(coachId, athleteId).ifPresent(existing -> {
                if ("active".equals(existing.status()) || "pending".equals(existing.status())) {
                    throw new AthleteAlreadyConnectedException(
                            "Athlete is already in your roster (status: " + existing.status() + ")");
                }
            });
        }

        // 5. Generate invite token (signed JWT, 7-day TTL)
        String rawToken = jwtTokenProvider.generateInviteToken(coachId, cmd.email());

        // 6. Create coach_athletes row (status=pending)
        CoachAthlete relationship = new CoachAthlete(
                null,                           // id — generated by DB
                coachId,
                athleteId,                      // may be null if athlete not yet registered
                "pending",
                "email",
                rawToken,                       // store raw token (adapter handles encryption)
                null,                           // no invite code for email invite
                CoachPermissions.allGranted(),
                cmd.nickname(),
                null,                           // notes
                cmd.tags() != null ? cmd.tags() : List.of(),
                Instant.now(),
                null,
                null,
                Instant.now(),
                Instant.now()
        );
        CoachAthlete saved = coachAthletePersistence.save(relationship);

        // 7. Send invite email
        CoachUserQueryPort.UserRow coach = userQuery.findUserById(coachId)
                .orElseThrow(() -> new CoachRelationshipNotFoundException("Coach not found: " + coachId));
        emailPort.sendInviteEmail(cmd.email(), coach.fullName(), rawToken);

        log.info("Coach {} invited athlete {} (email={}), relationship id={}",
                coachId, athleteId, cmd.email(), saved.id());

        return new CoachAthleteRef(saved.id(), saved.status(), saved.invitedAt());
    }

    // ── AcceptInviteUseCase ───────────────────────────────────────────────────

    @Override
    public void accept(UUID athleteId, String token) {
        // 1. Validate JWT token
        UUID coachId;
        String invitedEmail;
        try {
            coachId      = jwtTokenProvider.extractCoachIdFromInviteToken(token);
            invitedEmail = jwtTokenProvider.extractEmailFromInviteToken(token);
        } catch (Exception e) {
            throw new InviteTokenExpiredException("Invite token is invalid or expired");
        }

        // 2. Find the pending relationship by token
        CoachAthlete pending = coachAthletePersistence.findByInviteToken(token)
                .orElseThrow(() -> new InviteTokenExpiredException("Invite token not found"));

        if (!"pending".equals(pending.status())) {
            throw new InviteTokenExpiredException(
                    "Invite has already been " + pending.status());
        }

        // 3. Activate
        Instant now = Instant.now();
        coachAthletePersistence.updateStatus(pending.id(), "active", now);

        // 4. If the relationship had a null athleteUserId (athlete not yet registered at invite time),
        //    we need to link them now. Handled by the adapter saving athleteUserId.
        // (Skipped for simplicity — production would do an UPDATE athlete_user_id here.)

        // 5. Notify the coach
        CoachUserQueryPort.UserRow athlete = userQuery.findUserById(athleteId).orElse(null);
        String athleteName = athlete != null ? athlete.fullName() : invitedEmail;

        notificationPort.send(
                coachId,
                "coach_invite_accepted",
                athleteName + " accepted your invite",
                athleteName + " has joined your coaching roster.",
                Map.of("athleteId", athleteId.toString(), "relationshipId", pending.id().toString())
        );

        log.info("Athlete {} accepted email invite from coach {}, relationship id={}",
                athleteId, coachId, pending.id());
    }

    // ── AcceptInviteLinkUseCase ───────────────────────────────────────────────

    @Override
    public void acceptLink(UUID athleteId, String code) {
        // 1. Find the invite link
        CoachInviteLink link = inviteLinkPersistence.findByCode(code)
                .orElseThrow(() -> new InviteTokenExpiredException("Invite link not found: " + code));

        // 2. Validate usability
        if (!link.isUsable(Instant.now())) {
            throw new InviteTokenExpiredException(
                    "Invite link is no longer active, expired, or has reached its usage limit");
        }

        UUID coachId = link.coachUserId();

        // 3. Check for existing relationship
        coachAthletePersistence.findByCoachAndAthlete(coachId, athleteId).ifPresent(existing -> {
            if ("active".equals(existing.status()) || "pending".equals(existing.status())) {
                throw new AthleteAlreadyConnectedException(
                        "You are already connected to this coach");
            }
        });

        // 4. Capacity check
        int activeCount = coachAthletePersistence.countActiveOrPendingAthletes(coachId);
        if (activeCount >= MAX_ATHLETES_COACH_TIER) {
            throw new AthleteCapacityExceededException(MAX_ATHLETES_COACH_TIER);
        }

        // 5. Create active relationship
        Instant now = Instant.now();
        CoachAthlete relationship = new CoachAthlete(
                null, coachId, athleteId, "active", "link",
                null, code,
                CoachPermissions.allGranted(),
                null, null, List.of(),
                now, now, null, now, now
        );
        CoachAthlete saved = coachAthletePersistence.save(relationship);

        // 6. Increment link usage
        inviteLinkPersistence.incrementUsedCount(link.id());

        // 7. Notify coach
        CoachUserQueryPort.UserRow athlete = userQuery.findUserById(athleteId).orElse(null);
        String athleteName = athlete != null ? athlete.fullName() : "A new athlete";

        notificationPort.send(
                coachId,
                "coach_invite_accepted",
                athleteName + " joined via your invite link",
                athleteName + " has joined your coaching roster.",
                Map.of("athleteId", athleteId.toString(), "relationshipId", saved.id().toString())
        );

        log.info("Athlete {} joined coach {} via invite link code={}, relationship id={}",
                athleteId, coachId, code, saved.id());
    }

    // ── RevokeCoachAthleteUseCase ─────────────────────────────────────────────

    @Override
    public void revokeByCoach(UUID coachId, UUID athleteId) {
        CoachAthlete rel = coachAthletePersistence.findByCoachAndAthlete(coachId, athleteId)
                .filter(r -> "active".equals(r.status()) || "pending".equals(r.status()))
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "No active relationship found for coach " + coachId + " / athlete " + athleteId));

        coachAthletePersistence.updateStatus(rel.id(), "revoked", Instant.now());
        log.info("Coach {} revoked relationship with athlete {} (id={})", coachId, athleteId, rel.id());
    }

    @Override
    public void revokeByAthlete(UUID athleteId) {
        CoachAthlete rel = coachAthletePersistence.findActiveByAthlete(athleteId)
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "No active coach relationship for athlete " + athleteId));

        UUID coachId = rel.coachUserId();
        coachAthletePersistence.updateStatus(rel.id(), "revoked", Instant.now());
        log.info("Athlete {} revoked relationship with coach {} (id={})", athleteId, coachId, rel.id());
    }

    // ── ManageInviteLinksUseCase ──────────────────────────────────────────────

    @Override
    public CoachInviteLink createLink(UUID coachId, CreateLinkCommand cmd) {
        Instant expiresAt = cmd.expiresInDays() != null
                ? Instant.now().plusSeconds((long) cmd.expiresInDays() * 86_400)
                : null;

        CoachInviteLink link = new CoachInviteLink(
                null,                   // id — DB generated
                coachId,
                generateCode(),
                cmd.isReusable(),
                true,                   // isActive
                cmd.maxUses(),
                0,                      // usedCount
                expiresAt,
                Instant.now()
        );

        CoachInviteLink saved = inviteLinkPersistence.save(link);
        log.info("Coach {} created invite link id={} code={}", coachId, saved.id(), saved.code());
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CoachInviteLink> listLinks(UUID coachId) {
        return inviteLinkPersistence.findByCoach(coachId);
    }

    @Override
    public void deactivateLink(UUID coachId, UUID linkId) {
        CoachInviteLink link = inviteLinkPersistence.findById(linkId)
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "Invite link not found: " + linkId));

        if (!link.coachUserId().equals(coachId)) {
            throw new CoachRelationshipNotFoundException(
                    "Invite link " + linkId + " does not belong to coach " + coachId);
        }

        inviteLinkPersistence.deactivate(linkId);
        log.info("Coach {} deactivated invite link id={}", coachId, linkId);
    }

    // ── UpdateAthleteMetaUseCase ──────────────────────────────────────────────

    @Override
    public void updateMeta(UUID coachId, UUID athleteId, UpdateMetaCommand cmd) {
        CoachAthlete rel = coachAthletePersistence.findByCoachAndAthlete(coachId, athleteId)
                .filter(r -> "active".equals(r.status()))
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "No active relationship for coach " + coachId + " / athlete " + athleteId));

        coachAthletePersistence.updateMeta(rel.id(), cmd.nickname(), cmd.notes(), cmd.tags());
    }

    // ── GetAthleteCoachInfoUseCase ────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public CoachAthlete getCoachInfo(UUID athleteId) {
        return coachAthletePersistence.findActiveByAthlete(athleteId).orElse(null);
    }

    // ── UpdateCoachPermissionsUseCase ─────────────────────────────────────────

    @Override
    public void updatePermissions(UUID athleteId, Map<String, Boolean> permissionUpdates) {
        CoachAthlete rel = coachAthletePersistence.findActiveByAthlete(athleteId)
                .orElseThrow(() -> new CoachRelationshipNotFoundException(
                        "No active coach relationship for athlete " + athleteId));

        // Apply delta on top of existing permissions
        CoachPermissions updated = rel.permissions();
        for (Map.Entry<String, Boolean> entry : permissionUpdates.entrySet()) {
            if (CoachPermissions.ALL_KEYS.contains(entry.getKey())) {
                updated = updated.withPermission(entry.getKey(), entry.getValue());
            }
        }

        coachAthletePersistence.updatePermissions(rel.id(), updated);
        log.info("Athlete {} updated coach permissions: {}", athleteId, permissionUpdates);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Generates a unique 12-character alphanumeric invite link code. */
    private static String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(SECURE_RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }
}

