BEGIN;
ALTER TABLE riftbound.sync_leases ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;
ALTER TABLE riftbound.sync_leases ADD COLUMN IF NOT EXISTS requests integer NOT NULL DEFAULT 0;
COMMIT;
