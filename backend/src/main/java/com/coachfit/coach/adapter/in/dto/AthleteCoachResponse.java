package com.coachfit.coach.adapter.in.dto;

import com.coachfit.coach.domain.model.CoachAthlete;
import com.coachfit.coach.domain.model.CoachPermissions;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Response DTO for athlete-side coach info ({@code GET /athlete/coach}). */
public record AthleteCoachResponse(
        UUID              relationshipId,
        UUID              coachId,
        String            coachName,
        String            status,
        Map<String,Boolean> permissions,
        Instant           acceptedAt
) {
    public static AthleteCoachResponse from(CoachAthlete rel, String coachName) {
        return new AthleteCoachResponse(
                rel.id(),
                rel.coachUserId(),
                coachName,
                rel.status(),
                rel.permissions().toMap(),
                rel.acceptedAt()
        );
    }
}
