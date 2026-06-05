package com.coachfit.coach.domain.model;

import java.util.HashMap;
import java.util.Map;

/**
 * Value object wrapping the JSONB {@code permissions} column of {@code coach_athletes}.
 *
 * <p>Represents a set of boolean flags controlling what a coach may read/write for a given
 * athlete. All flags default to {@code true} on new invites (docs/08-auth-model.md
 * §Permissions JSONB Structure). Athletes may restrict individual flags via
 * {@code PUT /athlete/coach/permissions}.
 *
 * <p>Immutable — produce modified copies via {@link #withPermission(String, boolean)}.
 */
public final class CoachPermissions {

    // ── Canonical permission keys ─────────────────────────────────────────────

    public static final String READ_ACTIVITIES        = "readActivities";
    public static final String READ_ACTIVITY_STREAMS  = "readActivityStreams";
    public static final String READ_WELLNESS          = "readWellness";
    public static final String READ_HEALTH_DATA       = "readHealthData";
    public static final String READ_TRAINING_LOAD     = "readTrainingLoad";
    public static final String WRITE_CALENDAR         = "writeCalendar";
    public static final String WRITE_WORKOUTS         = "writeWorkouts";
    public static final String WRITE_COMMENTS         = "writeComments";
    public static final String VIEW_PROFILE           = "viewProfile";
    public static final String VIEW_ZONES             = "viewZones";

    /** All known permission keys — used for validation and defaulting. */
    public static final java.util.Set<String> ALL_KEYS = java.util.Set.of(
            READ_ACTIVITIES, READ_ACTIVITY_STREAMS, READ_WELLNESS,
            READ_HEALTH_DATA, READ_TRAINING_LOAD, WRITE_CALENDAR,
            WRITE_WORKOUTS, WRITE_COMMENTS, VIEW_PROFILE, VIEW_ZONES
    );

    private final Map<String, Boolean> values;

    private CoachPermissions(Map<String, Boolean> values) {
        this.values = Map.copyOf(values);
    }

    // ── Factory methods ───────────────────────────────────────────────────────

    /** Creates an all-true permissions object (default for new coach-athlete relationships). */
    public static CoachPermissions allGranted() {
        Map<String, Boolean> m = new HashMap<>();
        ALL_KEYS.forEach(k -> m.put(k, Boolean.TRUE));
        return new CoachPermissions(m);
    }

    /**
     * Constructs from an existing map (loaded from JSONB).
     * Unknown keys are ignored; missing keys default to {@code true}.
     */
    public static CoachPermissions from(Map<String, Boolean> raw) {
        Map<String, Boolean> m = new HashMap<>();
        ALL_KEYS.forEach(k -> m.put(k, raw.getOrDefault(k, Boolean.TRUE)));
        return new CoachPermissions(m);
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public boolean has(String permission) {
        return Boolean.TRUE.equals(values.get(permission));
    }

    public boolean canReadActivities()       { return has(READ_ACTIVITIES); }
    public boolean canReadActivityStreams()  { return has(READ_ACTIVITY_STREAMS); }
    public boolean canReadWellness()         { return has(READ_WELLNESS); }
    public boolean canReadHealthData()       { return has(READ_HEALTH_DATA); }
    public boolean canReadTrainingLoad()     { return has(READ_TRAINING_LOAD); }
    public boolean canWriteCalendar()        { return has(WRITE_CALENDAR); }
    public boolean canWriteWorkouts()        { return has(WRITE_WORKOUTS); }
    public boolean canWriteComments()        { return has(WRITE_COMMENTS); }
    public boolean canViewProfile()          { return has(VIEW_PROFILE); }
    public boolean canViewZones()            { return has(VIEW_ZONES); }

    /** Returns the underlying map — used by persistence adapters for JSONB serialization. */
    public Map<String, Boolean> toMap() {
        return values; // already immutable
    }

    /** Returns a copy with a single permission changed. */
    public CoachPermissions withPermission(String key, boolean value) {
        if (!ALL_KEYS.contains(key)) {
            throw new IllegalArgumentException("Unknown permission key: " + key);
        }
        Map<String, Boolean> m = new HashMap<>(values);
        m.put(key, value);
        return new CoachPermissions(m);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof CoachPermissions other)) return false;
        return values.equals(other.values);
    }

    @Override
    public int hashCode() {
        return values.hashCode();
    }

    @Override
    public String toString() {
        return "CoachPermissions" + values;
    }
}
