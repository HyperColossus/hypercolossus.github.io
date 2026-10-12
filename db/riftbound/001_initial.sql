-- Apply once with psql -v ON_ERROR_STOP=1 -f db/riftbound/001_initial.sql
BEGIN;

CREATE SCHEMA riftbound;

CREATE TABLE riftbound.card_sets (
    id text PRIMARY KEY,
    name text NOT NULL CHECK (length(trim(name)) > 0)
);

-- Normal and foil share metadata. Alternate artwork retains its catalog ID.
CREATE TABLE riftbound.cards (
    id text PRIMARY KEY,
    set_id text NOT NULL REFERENCES riftbound.card_sets(id),
    name text NOT NULL CHECK (length(trim(name)) > 0),
    rarity text NOT NULL,
    image_url text,
    champion text,
    tcg_product_id text,
    synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cards_set_id_idx ON riftbound.cards(set_id);
CREATE INDEX cards_tcg_product_id_idx ON riftbound.cards(tcg_product_id) WHERE tcg_product_id IS NOT NULL;

-- A single owner's Binder: no user IDs or simulated pack results.
CREATE TABLE riftbound.binder (
    card_id text NOT NULL REFERENCES riftbound.cards(id),
    is_foil boolean NOT NULL DEFAULT false,
    quantity integer NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (card_id, is_foil)
);

CREATE TABLE riftbound.sealed_products (
    id text PRIMARY KEY,
    set_id text NOT NULL REFERENCES riftbound.card_sets(id),
    name text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('pack', 'box')),
    pack_count integer NOT NULL CHECK (pack_count > 0),
    msrp numeric(14,4) CHECK (msrp >= 0 AND msrp < 10000000000),
    currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
    tcg_product_id text UNIQUE,
    CHECK (kind <> 'pack' OR pack_count = 1)
);

-- One observation per product per UTC sync day. NULL means unavailable, not zero.
-- The sync writer should INSERT ... ON CONFLICT DO NOTHING for safe retries.
CREATE TABLE riftbound.price_history (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    card_id text REFERENCES riftbound.cards(id),
    sealed_product_id text REFERENCES riftbound.sealed_products(id),
    price_date date NOT NULL,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    normal_price numeric(14,4) CHECK (normal_price >= 0 AND normal_price < 10000000000),
    foil_price numeric(14,4) CHECK (foil_price >= 0 AND foil_price < 10000000000),
    market_price numeric(14,4) CHECK (market_price >= 0 AND market_price < 10000000000),
    currency text NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
    CHECK (
        (card_id IS NOT NULL AND sealed_product_id IS NULL
            AND market_price IS NULL AND (normal_price IS NOT NULL OR foil_price IS NOT NULL))
        OR
        (card_id IS NULL AND sealed_product_id IS NOT NULL
            AND normal_price IS NULL AND foil_price IS NULL AND market_price IS NOT NULL)
    ),
    UNIQUE (card_id, price_date),
    UNIQUE (sealed_product_id, price_date)
);

CREATE VIEW riftbound.latest_card_prices AS
SELECT DISTINCT ON (card_id)
    card_id, price_date, fetched_at, normal_price, foil_price, currency
FROM riftbound.price_history
WHERE card_id IS NOT NULL
ORDER BY card_id, price_date DESC;

CREATE VIEW riftbound.latest_sealed_prices AS
SELECT DISTINCT ON (sealed_product_id)
    sealed_product_id, price_date, fetched_at, market_price, currency
FROM riftbound.price_history
WHERE sealed_product_id IS NOT NULL
ORDER BY sealed_product_id, price_date DESC;

-- No public database access. Grant a dedicated backend role explicitly at setup.
REVOKE ALL ON SCHEMA riftbound FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA riftbound FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA riftbound FROM PUBLIC;

COMMIT;
