package com.coachfit.auth.adapter.in.dto;

/**
 * JSON response body for successful auth operations.
 *
 * <p>Matches docs/05-api-design.md:
 * <pre>{ "token": "eyJ...", "user": { "id": "...", "email": "...", "role": "athlete", "tier": "free" } }</pre>
 *
 * <p>The refresh token is NOT included here — it is sent via httpOnly cookie.
 */
public record AuthResponse(String token, UserDto user) {}
