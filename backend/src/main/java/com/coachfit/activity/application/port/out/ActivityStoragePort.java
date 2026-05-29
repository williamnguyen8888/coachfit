package com.coachfit.activity.application.port.out;

import java.util.UUID;

/**
 * Output port: raw file storage (MinIO).
 *
 * <p>The storage adapter is responsible for placing the file in the correct
 * bucket and returning a stable object path for later retrieval.
 */
public interface ActivityStoragePort {

    /**
     * Stores the raw activity file and returns the MinIO object path.
     *
     * <p>Object key pattern: {@code activities/{userId}/{uuid}/{filename}}
     *
     * @param userId      authenticated user's UUID (used as path prefix)
     * @param filename    original filename (e.g. "morning_ride.fit")
     * @param bytes       raw file content
     * @param contentType MIME type (e.g. "application/octet-stream")
     * @return the object path stored in MinIO (used as {@code raw_file_path} in the DB)
     */
    String storeRawFile(UUID userId, String filename, byte[] bytes, String contentType);
}
