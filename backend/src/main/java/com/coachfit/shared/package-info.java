@ApplicationModule(
        id = "shared",
        displayName = "Shared",
        type = ApplicationModule.Type.OPEN,
        allowedDependencies = {
                "auth :: auth-domain",
                "auth :: auth-persistence-ports",
                "apikey :: apikey-auth-ports"
        }
)
package com.coachfit.shared;

import org.springframework.modulith.ApplicationModule;
