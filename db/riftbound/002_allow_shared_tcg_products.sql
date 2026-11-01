-- Some distinct Riftbound printings map to one TCGplayer product and image.
BEGIN;
ALTER TABLE riftbound.cards DROP CONSTRAINT IF EXISTS cards_tcg_product_id_key;
CREATE INDEX IF NOT EXISTS cards_tcg_product_id_idx
    ON riftbound.cards(tcg_product_id) WHERE tcg_product_id IS NOT NULL;
COMMIT;
