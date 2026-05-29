package com.coachfit.activity.adapter.out.storage;

import io.minio.MinioClient;
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

    @Bean
    MinioClient minioClient(
            @Value("${app.minio.endpoint}") String endpoint,
            @Value("${app.minio.access-key}") String accessKey,
            @Value("${app.minio.secret-key}") String secretKey) {

        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }
}
