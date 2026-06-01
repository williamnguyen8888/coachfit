package com.coachfit.calendar.application.port.out;

import java.util.UUID;

public record AutoLinkActivityCandidate(UUID id, int durationSeconds, String sport, String name) {}
