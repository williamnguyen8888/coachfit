/**
 * Consent logging module — GDPR §5 Consent Management (docs/11-privacy-compliance.md).
 *
 * <p>Provides a thin persistence layer for recording every explicit user consent
 * and withdrawal event. Consumed by the auth module (registration) and the account
 * module (privacy endpoint).
 *
 * <p>Spring Modulith boundary: the {@code ConsentUseCase} port is the only
 * exported API surface. Other modules must not import persistence internals.
 */
@org.springframework.modulith.ApplicationModule(allowedDependencies = {"shared"})
package com.coachfit.consent;
