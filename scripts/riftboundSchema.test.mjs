import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Execute the actual migration in an ephemeral embedded PostgreSQL engine.
// This validates SQL semantics, not remote PostgreSQL/Hyperdrive connectivity.
const db = new PGlite();
before(async () => {
  await db.exec(await readFile(new URL('../db/riftbound/001_initial.sql', import.meta.url), 'utf8'));
  await db.exec(`
    INSERT INTO riftbound.card_sets VALUES ('test', 'Test set');
    INSERT INTO riftbound.cards (id, set_id, name, rarity) VALUES ('card', 'test', 'Test card', 'Rare');
    INSERT INTO riftbound.sealed_products (id, set_id, name, kind, pack_count)
      VALUES ('box', 'test', 'Test box', 'box', 24);
  `);
});
after(async () => { await db.close(); });

test('Binder stores both finishes and rejects duplicate, invalid, or orphan holdings', async () => {
  await db.exec("INSERT INTO riftbound.binder VALUES ('card', false, 2), ('card', true, 1)");
  const result = await db.query('SELECT SUM(quantity)::int AS quantity FROM riftbound.binder');
  assert.equal(result.rows[0].quantity, 3);
  await assert.rejects(db.exec("INSERT INTO riftbound.binder VALUES ('card', false, 1)"), { code: '23505' });
  await assert.rejects(db.exec("UPDATE riftbound.binder SET quantity = 0"), { code: '23514' });
  await assert.rejects(db.exec("UPDATE riftbound.binder SET quantity = -1"), { code: '23514' });
  await assert.rejects(db.exec("INSERT INTO riftbound.binder VALUES ('missing', false, 1)"), { code: '23503' });
});

test('history is daily, retry-safe, and preserves missing variant prices', async () => {
  await db.exec(`
    INSERT INTO riftbound.price_history (card_id, price_date, normal_price, foil_price)
      VALUES ('card', '2026-09-26', 2, 4), ('card', '2026-09-27', 3, NULL);
    INSERT INTO riftbound.price_history (card_id, price_date, normal_price)
      VALUES ('card', '2026-09-27', 999) ON CONFLICT DO NOTHING;
    INSERT INTO riftbound.price_history (sealed_product_id, price_date, market_price)
      VALUES ('box', '2026-09-26', 100), ('box', '2026-09-27', 120);
  `);
  const latest = (await db.query('SELECT * FROM riftbound.latest_card_prices')).rows[0];
  assert.equal(Number(latest.normal_price), 3);
  assert.equal(latest.foil_price, null);
  assert.equal(Number((await db.query('SELECT * FROM riftbound.latest_sealed_prices')).rows[0].market_price), 120);
  assert.equal((await db.query('SELECT * FROM riftbound.price_history')).rows.length, 4);
  await assert.rejects(db.exec(`INSERT INTO riftbound.price_history (card_id, price_date, normal_price)
    VALUES ('card', '2026-09-27', 3)`), { code: '23505' });
});

test('history rejects mixed targets, inappropriate prices, missing prices and negative prices', async () => {
  for (const values of [
    "'card', 'box', 1, NULL, NULL",
    "NULL, NULL, 1, NULL, NULL",
    "'card', NULL, NULL, NULL, NULL",
    "'card', NULL, 1, NULL, 2",
    "NULL, 'box', 1, NULL, 2",
    "'card', NULL, -1, NULL, NULL",
    "'card', NULL, 'NaN', NULL, NULL",
  ]) {
    await assert.rejects(db.exec(`INSERT INTO riftbound.price_history
      (card_id, sealed_product_id, normal_price, foil_price, market_price, price_date)
      VALUES (${values}, '2026-09-28')`), { code: '23514' });
  }
});

test('sealed packs require one pack and nonnegative MSRP', async () => {
  await assert.rejects(db.exec(`INSERT INTO riftbound.sealed_products
    (id, set_id, name, kind, pack_count) VALUES ('bad', 'test', 'Bad', 'pack', 24)`), { code: '23514' });
  await assert.rejects(db.exec("UPDATE riftbound.sealed_products SET msrp = -1"), { code: '23514' });
});
