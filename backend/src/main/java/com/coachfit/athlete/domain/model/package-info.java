/**
 * Domain model records for the athlete module — exposed as part of the public API
 * so that other modules depending on {@code athlete::model} can use these types.
 *
 * <p>These are plain value types (records) with no Spring infrastructure dependencies.
 */
@NamedInterface("model")
package com.coachfit.athlete.domain.model;

import org.springframework.modulith.NamedInterface;
