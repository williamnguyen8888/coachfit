package com.coachfit.calendar.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for {@link CalendarEventEntity}.
 */
interface CalendarEventJpaRepository extends JpaRepository<CalendarEventEntity, UUID> {

    /**
     * Fetches non-deleted events for a user in [from, to] (inclusive),
     * ordered by date then order_index for stable calendar rendering.
     */
    List<CalendarEventEntity> findByUserIdAndDateBetweenAndDeletedAtIsNullOrderByDateAscOrderIndexAsc(
            UUID userId, LocalDate from, LocalDate to);

    List<CalendarEventEntity> findByUserIdAndDateAndDeletedAtIsNull(UUID userId, LocalDate date);
}
