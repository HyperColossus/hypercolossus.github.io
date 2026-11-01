BEGIN;
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS card_type text;
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS card_supertype text;
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS rules_text text;
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS is_alt boolean NOT NULL DEFAULT false;
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS is_overnumbered boolean NOT NULL DEFAULT false;
ALTER TABLE riftbound.cards ADD COLUMN IF NOT EXISTS is_signature boolean NOT NULL DEFAULT false;
COMMIT;
