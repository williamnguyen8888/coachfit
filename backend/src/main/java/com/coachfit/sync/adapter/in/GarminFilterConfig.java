package com.coachfit.sync.adapter.in;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GarminFilterConfig {

    @Bean
    public FilterRegistrationBean<GarminWebhookSignatureFilter> garminWebhookSignatureFilterRegistration(
            GarminSignatureVerifier verifier) {
        FilterRegistrationBean<GarminWebhookSignatureFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new GarminWebhookSignatureFilter(verifier));
        registrationBean.addUrlPatterns("/api/v1/webhooks/garmin/*");
        return registrationBean;
    }
}
