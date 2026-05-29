-- Gear — equipment used for activities.
-- total_distance_meters is a denormalised aggregate recalculated when activities change.
-- Backfill FK: activities.gear_id now points here.

CREATE TABLE gear (
    id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID         NOT NULL,
    name                   VARCHAR(255) NOT NULL,   -- 'Giant TCR', 'Nike Vaporfly'
    sport                  VARCHAR(50),
    type                   VARCHAR(50),             -- bike / shoes / wetsuit
    is_active              BOOLEAN      NOT NULL DEFAULT true,
    total_distance_meters  DECIMAL(12,2) NOT NULL DEFAULT 0,  -- recalculated aggregate
    created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_gear_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Now that gear exists, wire the FK from activities.
ALTER TABLE activities
    ADD CONSTRAINT fk_activities_gear_id
        FOREIGN KEY (gear_id) REFERENCES gear (id);
