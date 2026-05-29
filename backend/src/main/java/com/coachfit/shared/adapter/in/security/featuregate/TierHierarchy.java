package com.coachfit.shared.adapter.in.security.featuregate;

/**
 * Defines the CoachFit subscription tier hierarchy and satisfaction checks.
 *
 * <p>Hierarchy (ascending): {@code FREE < PRO < ELITE < COACH < ADMIN}
 * (from docs/08-auth-model.md — "Tier hierarchy: free < pro < elite < coach < admin")
 *
 * <p>Coach tier includes ALL Elite features; Admin has unrestricted access.
 */
public enum TierHierarchy {

    FREE(0),
    PRO(1),
    ELITE(2),
    COACH(3),
    ADMIN(4);

    private final int level;

    TierHierarchy(int level) {
        this.level = level;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Returns {@code true} if {@code userTier} meets or exceeds {@code requiredTier}.
     *
     * @param userTier     tier string from JWT claim (case-insensitive)
     * @param requiredTier tier string from {@link RequiresTier#value()} (case-insensitive)
     * @return {@code true} if the user has sufficient tier; {@code false} if not, or if either
     *         value is unrecognised
     */
    public static boolean satisfies(String userTier, String requiredTier) {
        try {
            TierHierarchy user     = TierHierarchy.valueOf(userTier.toUpperCase());
            TierHierarchy required = TierHierarchy.valueOf(requiredTier.toUpperCase());
            return user.level >= required.level;
        } catch (IllegalArgumentException ex) {
            // Unknown tier string — deny by default.
            return false;
        }
    }

    public int getLevel() { return level; }
}
