/**
 * Outbound integration ports for the auth module.
 *
 * <p>Named interface exposing auth ports (e.g. {@code OAuthConnectionPersistencePort})
 * to the {@code sync} module for loading OAuth tokens.
 */
@NamedInterface("auth-persistence-ports")
package com.coachfit.auth.application.port.out;

import org.springframework.modulith.NamedInterface;
