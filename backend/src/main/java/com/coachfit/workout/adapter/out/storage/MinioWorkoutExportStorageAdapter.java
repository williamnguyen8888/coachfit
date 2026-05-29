package com.coachfit.workout.adapter.out.storage;

import com.coachfit.workout.application.port.out.WorkoutExportStoragePort;
import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Stores generated .FIT workout exports in MinIO, implementing {@link WorkoutExportStoragePort}.
 *
 * <h3>Object key pattern</h3>
 * {@code workouts/{userId}/{workoutId}.fit}
 *
 * <p>Re-exports of the same workout overwrite the previous file in MinIO (same key).
 * This is intentional — the export is a derived artifact and the newest version is always
 * the authoritative one.
 *
 * <p>The {@link MinioClient} bean is provided by the activity module's {@code MinioConfig}.
 */
@Component
class MinioWorkoutExportStorageAdapter implements WorkoutExportStoragePort {

    private static final Logger log = LoggerFactory.getLogger(MinioWorkoutExportStorageAdapter.class);

    private static final String CONTENT_TYPE = "application/vnd.ant.fit";

    private final MinioClient minioClient;
    private final String      bucket;

    MinioWorkoutExportStorageAdapter(MinioClient minioClient,
                                     @Value("${app.minio.workout-exports-bucket}") String bucket) {
        this.minioClient = minioClient;
        this.bucket      = bucket;
    }

    // ── WorkoutExportStoragePort ──────────────────────────────────────────────

    @Override
    public String store(UUID userId, UUID workoutId, byte[] fitBytes) {
        String objectKey = "workouts/" + userId + "/" + workoutId + ".fit";
        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(fitBytes), fitBytes.length, -1)
                            .contentType(CONTENT_TYPE)
                            .build()
            );
        } catch (Exception e) {
            log.error("MinIO upload failed: bucket={} key={} error={}", bucket, objectKey, e.getMessage(), e);
            throw new RuntimeException("Failed to store FIT export in MinIO: " + e.getMessage(), e);
        }

        log.debug("FIT export stored: bucket={} key={} bytes={}", bucket, objectKey, fitBytes.length);
        return objectKey;
    }

    @Override
    public String generateDownloadUrl(String objectKey, int expirySeconds) {
        try {
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(objectKey)
                            .expiry(expirySeconds, TimeUnit.SECONDS)
                            .build()
            );
            log.debug("Generated FIT export URL: key={} expirySeconds={}", objectKey, expirySeconds);
            return url;
        } catch (Exception e) {
            log.error("Failed to generate presigned URL: key={} error={}", objectKey, e.getMessage(), e);
            throw new RuntimeException("Failed to generate FIT export download URL: " + e.getMessage(), e);
        }
    }
}
