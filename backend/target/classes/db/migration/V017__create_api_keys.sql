-- API keys — personal access tokens for API consumers.
-- Raw token is never stored; only the SHA-256 hex hash + display prefix.

CREATE TABLE api_keys (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL,
    key_hash     VARCHAR(255) NOT NULL,   -- SHA-256(rawKey) hex
    key_prefix   VARCHAR(10)  NOT NULL,   -- first 8 chars for display: "cf_live_x"
    name         VARCHAR(100),            -- user-given label
    last_used_at TIMESTAMPTZ,
    expires_at   TIMESTAMPTZ,             -- nullable = never expires
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT fk_api_keys_user_id
        FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_api_keys_key_hash
        UNIQUE (key_hash)
);

CREATE INDEX idx_api_keys_user_id
    ON api_keys (user_id);
