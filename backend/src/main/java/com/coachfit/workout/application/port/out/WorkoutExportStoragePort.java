package com.coachfit.workout.application.port.out;

import java.util.UUID;

/**
 * Output port: storage operations for generated workout .FIT exports.
 *
 * <p>Files are stored in the MinIO {@code workout-exports} bucket.
 * Pre-signed URLs are returned to the caller with a 24-hour expiry.
 */
public interface WorkoutExportStoragePort {

    /**
     * Stores a generated .FIT file and returns the object key.
     *
     * <p>Object key pattern: {@code workouts/{userId}/{workoutId}.fit}
     *
     * @param userId    owner of the workout
     * @param workoutId workout ID (used to derive the object key)
     * @param fitBytes  binary content of the encoded .FIT file
     * @return MinIO object key of the stored file
     */
    String store(UUID userId, UUID workoutId, byte[] fitBytes);

    /**
     * Generates a pre-signed GET URL for an already-stored export.
     *
     * @param objectKey     MinIO object key returned by {@link #store}
     * @param expirySeconds URL validity window (e.g. 86400 for 24 hours)
     * @return pre-signed URL
     */
    String generateDownloadUrl(String objectKey, int expirySeconds);
}
