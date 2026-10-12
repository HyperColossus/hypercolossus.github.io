BEGIN;

CREATE TABLE IF NOT EXISTS riftbound.sync_leases (
    sync_date date PRIMARY KEY,
    started_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS riftbound.sessions (
    id text PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL
);

COMMIT;
