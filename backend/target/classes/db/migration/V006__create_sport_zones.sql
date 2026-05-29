CREATE TABLE sport_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    sport VARCHAR(50) NOT NULL,
    zone_type VARCHAR(20) NOT NULL,
    ftp INTEGER,
    lthr INTEGER,
    max_hr INTEGER,
    zones JSONB NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sport_zones_user_sport_type_effective_date
        UNIQUE (user_id, sport, zone_type, effective_date),
    CONSTRAINT fk_sport_zones_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
);
