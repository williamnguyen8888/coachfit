package com.coachfit.calendar.adapter.in.dto;

import java.util.List;
import java.util.UUID;

/**
 * Request body for POST /api/v1/calendar/reorder.
 *
 * <p>The client sends an ordered list of event IDs. The service assigns
 * {@code order_index} values (0, 1, 2, ...) matching the list position.
 * All events should belong to the same date and user.
 */
public record ReorderRequest(List<UUID> eventIds) {}
