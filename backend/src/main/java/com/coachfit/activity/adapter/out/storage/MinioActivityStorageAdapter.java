package com.coachfit.activity.adapter.out.storage;

import com.coachfit.activity.application.port.out.ActivityStoragePort;
import com.coachfit.activity.domain.exception.FileParseException;
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
 * Stores raw activity files in MinIO, implementing {@link ActivityStoragePort}.
 *
 * <h3>Object key pattern</h3>
 * {@code activities/{userId}/{objectId}/{filename}}
 *
 * <p>A fresh UUID ({@code objectId}) is generated per upload so that:
 * <ul>
 *   <li>Re-uploads of the same filename don't clobber existing objects.</li>
 *   <li>The object path stored in the DB is stable and globally unique.</li>
 * </ul>
 */
@Component
class MinioActivityStorageAdapter implements ActivityStoragePort {

    private static final Logger log = LoggerFactory.getLogger(MinioActivityStorageAdapter.class);

    private final MinioClient minioClient;
    private final String      bucket;

    MinioActivityStorageAdapter(MinioClient minioClient,
                                @Value("${app.minio.raw-files-bucket}") String bucket) {
        this.minioClient = minioClient;
        this.bucket      = bucket;
    }

    @Override
    public String storeRawFile(UUID userId, String filename, byte[] bytes, String contentType) {
        String objectKey = "activities/" + userId + "/" + UUID.randomUUID() + "/" + sanitise(filename);

        try {
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                            .contentType(contentType)
                            .build()
            );
        } catch (Exception e) {
            log.error("MinIO upload failed for user={} file={}: {}", userId, filename, e.getMessage(), e);
            throw new FileParseException("storage", "Failed to store raw file in MinIO: " + e.getMessage(), e);
        }

        log.debug("Stored raw file: bucket={} key={}", bucket, objectKey);
        return objectKey;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    @Override
    public String generatePresignedDownloadUrl(String objectPath, int expirySeconds) {
        try {
            String url = minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(objectPath)
                            .expiry(expirySeconds, TimeUnit.SECONDS)
                            .build()
            );
            log.debug("Generated presigned URL: bucket={} key={} expirySeconds={}", bucket, objectPath, expirySeconds);
            return url;
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for object={}: {}", objectPath, e.getMessage(), e);
            throw new RuntimeException("Failed to generate download URL: " + e.getMessage(), e);
        }
    }

    /**
     * Strips path separators from the filename to prevent directory traversal in the object key.
     */
    private static String sanitise(String filename) {
        if (filename == null || filename.isBlank()) return "upload";
        // Keep only the base filename (no directory components)
        String base = filename.replaceAll("[/\\\\]", "_");
        // Limit length to avoid excessively long object keys
        return base.length() > 128 ? base.substring(base.length() - 128) : base;
    }
}
