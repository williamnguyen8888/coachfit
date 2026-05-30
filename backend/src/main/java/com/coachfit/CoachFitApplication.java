package com.coachfit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoachFitApplication {

    public static void main(String[] args) {
        SpringApplication.run(CoachFitApplication.class, args);
    }
}
