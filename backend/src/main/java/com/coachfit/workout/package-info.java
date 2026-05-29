@ApplicationModule(
        id = "workout",
        displayName = "Workout",
        allowedDependencies = { "shared", "athlete::api", "athlete::model" }
)
package com.coachfit.workout;

import org.springframework.modulith.ApplicationModule;
