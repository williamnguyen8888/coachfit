/**
 * Named interface: exposes the outbound API-key port and the hash utility
 * needed by {@code ApiKeyAuthenticationFilter} in the {@code shared} module.
 */
@NamedInterface("apikey-auth-ports")
package com.coachfit.apikey.application.port.out;

import org.springframework.modulith.NamedInterface;
