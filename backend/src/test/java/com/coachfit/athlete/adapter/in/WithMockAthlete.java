package com.coachfit.athlete.adapter.in;

import com.coachfit.shared.adapter.in.security.jwt.UserPrincipal;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContext;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.util.UUID;

/**
 * Custom test annotation that populates the Spring Security context with a
 * {@link UserPrincipal} so {@code @AuthenticationPrincipal} resolves in
 * {@code @WebMvcTest} slice tests without a real security filter chain.
 */
@Retention(RetentionPolicy.RUNTIME)
@WithSecurityContext(factory = WithMockAthlete.Factory.class)
@interface WithMockAthlete {

    String userId() default "00000000-0000-0000-0000-000000000001";
    String email()  default "athlete@test.io";
    String role()   default "athlete";
    String tier()   default "free";

    class Factory implements WithSecurityContextFactory<WithMockAthlete> {
        @Override
        public SecurityContext createSecurityContext(WithMockAthlete annotation) {
            UserPrincipal principal = new UserPrincipal(
                    UUID.fromString(annotation.userId()),
                    annotation.email(),
                    annotation.role(),
                    annotation.tier()
            );
            var token = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities());
            SecurityContext ctx = SecurityContextHolder.createEmptyContext();
            ctx.setAuthentication(token);
            return ctx;
        }
    }
}
