package com.coachfit.auth;

import com.coachfit.auth.adapter.in.GoogleOAuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** Registers {@link ConfigurationProperties} beans for the auth module. */
@Configuration
@EnableConfigurationProperties(GoogleOAuthProperties.class)
public class AuthConfig {}
