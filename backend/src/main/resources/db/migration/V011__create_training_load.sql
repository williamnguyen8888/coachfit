-- Training load — daily CTL/ATL/TSB aggregates per sport + 'all' rollup.
-- Used for PMC (Performance Management Chart).

CREATE TABLE training_load (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL,
    date        DATE        NOT NULL,
    sport       VARCHAR(50) NOT NULL,   -- 'all' | 'cycling' | 'running' | 'swimming'
    daily_tss   DECIMAL(8,2),           -- total TSS for this sport on this day
    ctl         DECIMAL(8,2),           -- Chronic Training Load (fitness, 42-day EMA)
    atl         DECIMAL(8,2),           -- Acute Training Load (fatigue, 7-day EMA)
    tsb         DECIMAL(8,2),           -- Training Stress Balance (form = CTL - ATL)

    CONSTRAINT fk_training_load_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_training_load_user_sport_date
        UNIQUE (user_id, sport, date)
);

CREATE INDEX idx_training_load_user_sport_date
    ON training_load (user_id, sport, date DESC);
