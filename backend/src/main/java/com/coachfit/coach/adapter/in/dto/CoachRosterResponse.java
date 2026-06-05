package com.coachfit.coach.adapter.in.dto;

import com.coachfit.coach.application.port.in.GetCoachRosterUseCase.FitnessSnap;
import com.coachfit.coach.application.port.in.GetCoachRosterUseCase.HealthSnap;
import com.coachfit.coach.application.port.in.GetCoachRosterUseCase.LastActivity;
import com.coachfit.coach.application.port.in.GetCoachRosterUseCase.RosterEntry;
import com.coachfit.coach.application.port.in.GetCoachRosterUseCase.RosterPage;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Response DTOs for {@code GET /api/v1/coach/athletes} (roster list).
 * Mirrors the JSON contract in docs/05-api-design.md §Coach — Roster Management.
 */
public final class CoachRosterResponse {

    private CoachRosterResponse() {}

    public record PageResponse(
            List<AthleteEntry> content,
            int page,
            int size,
            long totalElements
    ) {
        public static PageResponse from(RosterPage page) {
            List<AthleteEntry> entries = page.content().stream()
                    .map(AthleteEntry::from)
                    .toList();
            return new PageResponse(entries, page.page(), page.size(), page.totalElements());
        }
    }

    public record AthleteEntry(
            UUID         id,
            UUID         athleteId,
            String       name,
            String       nickname,
            String       avatarUrl,
            String       status,
            List<String> sports,
            List<String> tags,
            FitnessDto   fitness,
            LastActivityDto lastActivity,
            HealthDto    healthSnapshot,
            Instant      acceptedAt
    ) {
        public static AthleteEntry from(RosterEntry e) {
            return new AthleteEntry(
                    e.relationshipId(),
                    e.athleteId(),
                    e.name(),
                    e.nickname(),
                    e.avatarUrl(),
                    e.status(),
                    e.sports(),
                    e.tags(),
                    e.fitness()      != null ? FitnessDto.from(e.fitness())           : null,
                    e.lastActivity() != null ? LastActivityDto.from(e.lastActivity()) : null,
                    e.healthSnapshot() != null ? HealthDto.from(e.healthSnapshot())   : null,
                    e.acceptedAt()
            );
        }
    }

    public record FitnessDto(Double ctl, Double atl, Double tsb) {
        static FitnessDto from(FitnessSnap s) {
            return new FitnessDto(s.ctl(), s.atl(), s.tsb());
        }
    }

    public record LastActivityDto(String date, String sport, String name) {
        static LastActivityDto from(LastActivity la) {
            return new LastActivityDto(la.date(), la.sport(), la.name());
        }
    }

    public record HealthDto(Integer restingHr, Integer sleepScore) {
        static HealthDto from(HealthSnap hs) {
            return new HealthDto(hs.restingHr(), hs.sleepScore());
        }
    }
}
