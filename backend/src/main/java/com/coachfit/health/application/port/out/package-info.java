/**
 * Outbound integration ports for the health module.
 *
 * <p>Named interface exposed to the {@code sync} module for persisting
 * daily summaries and sleep data from Garmin push callbacks.
 */
@NamedInterface("health-persistence-ports")
package com.coachfit.health.application.port.out;

import org.springframework.modulith.NamedInterface;
