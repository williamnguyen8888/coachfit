package com.coachfit.athlete.adapter.out.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

interface SportZoneJpaRepository extends JpaRepository<SportZoneEntity, UUID> {

    /**
     * Returns the most recent zone row per {@code (sport, zone_type)} for the user.
     * Uses a window function to rank by effectiveDate desc and selects rank = 1.
     */
    @Query(value = """
            SELECT * FROM (
                SELECT *, ROW_NUMBER() OVER (
                    PARTITION BY user_id, sport, zone_type
                    ORDER BY effective_date DESC
                ) AS rn
                FROM sport_zones
                WHERE user_id = :userId
            ) ranked
            WHERE rn = 1
            ORDER BY sport, zone_type
            """, nativeQuery = true)
    List<SportZoneEntity> findLatestByUserId(@Param("userId") UUID userId);
}
