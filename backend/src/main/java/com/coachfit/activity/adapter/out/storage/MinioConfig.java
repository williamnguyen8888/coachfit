package com.coachfit.activity.adapter.out.storage;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires the shared {@link MinioClient} bean from {@code app.minio.*} configuration.
 *
 * <p>Placed in the activity module to keep MinIO concerns local; the bean is
 * available application-wide if other modules also need it.
 */
@Configuration
class MinioConfig {

    private static final Logger log = LoggerFactory.getLogger(MinioConfig.class);

    @Bean
    MinioClient minioClient(
            @Value("${app.minio.endpoint}") String endpoint,
            @Value("${app.minio.access-key}") String accessKey,
            @Value("${app.minio.secret-key}") String secretKey,
            @Value("${app.minio.raw-files-bucket}") String rawFilesBucket,
            @Value("${app.minio.workout-exports-bucket}") String workoutExportsBucket,
            @Value("${app.minio.backups-bucket}") String backupsBucket) {

        MinioClient client = MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();

        // Automatically initialize/create buckets on startup if they do not exist
        initializeBucket(client, rawFilesBucket);
        initializeBucket(client, workoutExportsBucket);
        initializeBucket(client, backupsBucket);

        return client;
    }

    private void initializeBucket(MinioClient client, String bucketName) {
        if (bucketName == null || bucketName.isBlank()) {
            return;
        }
        try {
            boolean exists = client.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(bucketName)
                            .build()
            );
            if (!exists) {
                client.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(bucketName)
                                .build()
                );
                log.info("Successfully created MinIO bucket: {}", bucketName);
            } else {
                log.debug("MinIO bucket already exists: {}", bucketName);
            }
        } catch (Exception e) {
            log.error("Failed to check or create MinIO bucket '{}': {}", bucketName, e.getMessage(), e);
        }
    }
}
