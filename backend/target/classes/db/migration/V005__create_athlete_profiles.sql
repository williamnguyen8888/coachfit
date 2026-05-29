CREATE TABLE athlete_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    weight_kg DECIMAL(5, 2),
    height_cm DECIMAL(5, 1),
    sports TEXT[] NOT NULL,
    experience_level VARCHAR(20),
    primary_sport VARCHAR(50),
    primary_health_source VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_athlete_profiles_user_id UNIQUE (user_id),
    CONSTRAINT fk_athlete_profiles_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TRIGGER trg_athlete_profiles_set_updated_at
BEFORE UPDATE ON athlete_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
