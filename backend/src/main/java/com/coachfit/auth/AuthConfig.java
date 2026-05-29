package com.coachfit.auth;

import com.coachfit.auth.adapter.in.GarminOAuthProperties;
import com.coachfit.auth.adapter.in.GoogleOAuthProperties;
import com.coachfit.auth.adapter.in.StravaOAuthProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/** Registers {@link ConfigurationProperties} beans for the auth module. */
@Configuration
@EnableConfigurationProperties({GoogleOAuthProperties.class, StravaOAuthProperties.class, GarminOAuthProperties.class})
public class AuthConfig {}
