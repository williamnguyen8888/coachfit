package com.coachfit.shared.adapter.in.security.jwt;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Spring Security {@link UserDetails} implementation that carries CoachFit-specific
 * claims extracted from a validated JWT (or API key lookup).
 *
 * <p>Authorities follow the conventions:
 * <ul>
 *   <li>{@code ROLE_ATHLETE}, {@code ROLE_COACH}, {@code ROLE_ADMIN}</li>
 *   <li>{@code TIER_FREE}, {@code TIER_PRO}, {@code TIER_ELITE}, {@code TIER_COACH}</li>
 * </ul>
 * Feature gate checks can therefore use standard Spring Security SpEL expressions.
 */
public class UserPrincipal implements UserDetails {

    private final UUID userId;
    private final String email;
    private final String role;
    private final String tier;
    private final List<GrantedAuthority> authorities;

    public UserPrincipal(UUID userId, String email, String role, String tier) {
        this.userId = userId;
        this.email  = email;
        this.role   = role;
        this.tier   = tier;
        this.authorities = List.of(
                new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()),
                new SimpleGrantedAuthority("TIER_" + tier.toUpperCase())
        );
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public UUID getUserId() { return userId; }
    public String getEmail()  { return email; }
    public String getRole()   { return role; }
    public String getTier()   { return tier; }

    // ── UserDetails ───────────────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }

    /** Not used — stateless JWT; password field is never stored here. */
    @Override public String getPassword()  { return null; }

    @Override public String getUsername()  { return email; }

    @Override public boolean isAccountNonExpired()    { return true; }
    @Override public boolean isAccountNonLocked()     { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()              { return true; }
}
