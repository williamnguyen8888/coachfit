package com.coachfit.coach.adapter.in.dto;

import com.coachfit.coach.domain.model.CoachInviteLink;

import java.time.Instant;
import java.util.UUID;

/** Response DTO for invite link endpoints. */
public record InviteLinkResponse(
        UUID    id,
        String  code,
        String  url,
        boolean isReusable,
        boolean isActive,
        Integer maxUses,
        int     usedCount,
        Instant expiresAt,
        Instant createdAt
) {
    private static final String BASE_URL = "https://coachfit.app/join/";

    public static InviteLinkResponse from(CoachInviteLink link) {
        return new InviteLinkResponse(
                link.id(),
                link.code(),
                BASE_URL + link.code(),
                link.isReusable(),
                link.isActive(),
                link.maxUses(),
                link.usedCount(),
                link.expiresAt(),
                link.createdAt()
        );
    }
}
