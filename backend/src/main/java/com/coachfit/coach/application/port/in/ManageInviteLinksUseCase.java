package com.coachfit.coach.application.port.in;

import com.coachfit.coach.domain.model.CoachInviteLink;

import java.util.List;
import java.util.UUID;

/**
 * Input port: manage reusable/one-time invite links.
 *
 * <p>Endpoints (docs/05-api-design.md §Coach — Invite Links):
 * <ul>
 *   <li>{@code GET    /api/v1/coach/invite-links}      — list all links</li>
 *   <li>{@code POST   /api/v1/coach/invite-links}      — create a new link</li>
 *   <li>{@code DELETE /api/v1/coach/invite-links/{id}} — deactivate a link</li>
 * </ul>
 */
public interface ManageInviteLinksUseCase {

    /**
     * Creates a new invite link for the given coach.
     *
     * @param coachId authenticated coach
     * @param cmd     link configuration
     * @return the newly created link (with its generated code)
     */
    CoachInviteLink createLink(UUID coachId, CreateLinkCommand cmd);

    /**
     * Returns all invite links belonging to the coach (including inactive ones).
     *
     * @param coachId authenticated coach
     */
    List<CoachInviteLink> listLinks(UUID coachId);

    /**
     * Deactivates a link so it can no longer be used to join.
     * Sets {@code is_active = false}.
     *
     * @param coachId authenticated coach (must own the link)
     * @param linkId  ID of the link to deactivate
     * @throws com.coachfit.coach.domain.exception.CoachRelationshipNotFoundException if not found or not owned
     */
    void deactivateLink(UUID coachId, UUID linkId);

    record CreateLinkCommand(
            boolean isReusable,
            Integer maxUses,         // nullable — null = unlimited
            Integer expiresInDays    // nullable — null = never expires
    ) {}
}
