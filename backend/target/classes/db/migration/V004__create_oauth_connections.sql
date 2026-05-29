CREATE TABLE oauth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    access_token_secret TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT[],
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'active',
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_oauth_connections_user_provider UNIQUE (user_id, provider),
    CONSTRAINT fk_oauth_connections_user_id
        FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX idx_oauth_connections_provider_provider_user_id
    ON oauth_connections (provider, provider_user_id);

CREATE TRIGGER trg_oauth_connections_set_updated_at
BEFORE UPDATE ON oauth_connections
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
