-- Additive and retry-safe; preserves collection and market records.
BEGIN;
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT '{}';
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS energy integer CHECK (energy >= 0 AND energy <= 99);
CREATE INDEX IF NOT EXISTS cards_domains_idx ON riftbound.cards USING gin (domains);
CREATE INDEX IF NOT EXISTS cards_energy_idx ON riftbound.cards (energy);
COMMIT;
