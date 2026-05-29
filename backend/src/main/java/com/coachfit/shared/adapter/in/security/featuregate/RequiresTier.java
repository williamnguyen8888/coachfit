package com.coachfit.shared.adapter.in.security.featuregate;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a controller method as requiring a minimum subscription tier.
 *
 * <p>Usage:
 * <pre>
 * {@literal @}RequiresTier("pro")
 * {@literal @}GetMapping("/api/v1/training-load/pmc")
 * public ResponseEntity{@literal <?>} getPMC() { ... }
 * </pre>
 *
 * <p>Enforced by {@link FeatureGateFilter} at the filter-chain level.
 * Tier hierarchy (docs/08-auth-model.md): {@code free < pro < elite < coach < admin}.
 *
 * <p>Valid values: {@code "free"}, {@code "pro"}, {@code "elite"}, {@code "coach"}, {@code "admin"}.
 */
@Documented
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresTier {

    /**
     * Minimum tier required to access the annotated endpoint.
     * Case-insensitive at enforcement time.
     */
    String value();
}
