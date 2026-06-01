/**
 * Sync module: ingests push data from external providers (Garmin, Strava) and
 * normalises it into CoachFit internal domain models.
 *
 * <p>Allowed cross-module dependencies:
 * <ul>
 *   <li>{@code shared}                              — shared utilities
 *   <li>{@code activity::activity-persistence-ports}— persist activities, streams, laps
 *   <li>{@code health::health-persistence-ports}    — persist daily summaries and sleep data
 *   <li>{@code wellness::wellness-persistence-ports}— autofill wellness logs
 *   <li>{@code auth::auth-config}                   — OAuth provider properties (Strava)
 *   <li>{@code auth::auth-persistence-ports}        — load OAuth tokens (Strava)
 *   <li>{@code auth::auth-adapters}                 — AES token encryption util (Strava)
 * </ul>
 */
@ApplicationModule(
        id = "sync",
        displayName = "Sync",
        allowedDependencies = {
                "shared",
                "workout",
                "workout::api",
                "activity::activity-persistence-ports",
                "health::health-persistence-ports",
                "wellness::wellness-persistence-ports",
                "auth::auth-config",
                "auth::auth-persistence-ports",
                "auth::auth-adapters"
        }
)
package com.coachfit.sync;

import org.springframework.modulith.ApplicationModule;
