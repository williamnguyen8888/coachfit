package com.coachfit.athlete.domain.exception;

/**
 * Thrown when an athlete tries to disconnect a provider they are not connected to,
 * or when an unknown provider name is specified.
 */
public class ProviderNotFoundException extends RuntimeException {

    public ProviderNotFoundException(String provider) {
        super("No active connection found for provider: " + provider);
    }
}
