/**
 * Named interface exposing the consent port-in types to other modules.
 * Required by Spring Modulith for the account module to inject {@link ConsentUseCase}.
 */
@NamedInterface("consent-api")
package com.coachfit.consent.application.port.in;

import org.springframework.modulith.NamedInterface;
