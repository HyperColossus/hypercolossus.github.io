import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { readCollectionSummary } from '../server/riftbound/queries.js';
import { createWorker } from '../server/index.js';

const db = new PGlite();
before(async () => {
  await db.exec(await readFile(new URL('../db/riftbound/001_initial.sql', import.meta.url), 'utf8'));
  await db.exec(`INSERT INTO riftbound.card_sets VALUES ('OGN','Origins');
    INSERT INTO riftbound.cards (id,set_id,name,rarity) VALUES
    ('a','OGN','Alpha','Rare'), ('b','OGN','Beta','Rare'), ('c','OGN','Gamma','Common');`);
});
after(() => db.close());

test('empty collection has no invented valuation or price date', async () => {
  const summary = await readCollectionSummary(db);
  assert.deepEqual(summary, {
    catalog_cards: 3, owned_cards: 0, copies: '0', normal_copies: '0', foil_copies: '0',
    priced_copies: '0', unpriced_copies: '0', value_usd: null,
    oldest_price_date: null, newest_price_date: null,
  });
});

test('overview values finishes separately, includes zero prices, and never fills latest missing prices from history', async () => {
  await db.exec(`INSERT INTO riftbound.binder VALUES
    ('a',false,2), ('a',true,3), ('b',true,4), ('c',false,5);
    INSERT INTO riftbound.price_history (card_id,price_date,normal_price,foil_price) VALUES
    ('a','2026-09-01',100,200), ('a','2026-10-01',1.25,NULL),
    ('b','2026-10-02',NULL,0);`);
  const summary = await readCollectionSummary(db);
  assert.deepEqual(summary, {
    catalog_cards: 3, owned_cards: 3, copies: '14', normal_copies: '7', foil_copies: '7',
    priced_copies: '6', unpriced_copies: '8', value_usd: '2.5000',
    oldest_price_date: '2026-10-01', newest_price_date: '2026-10-02',
  });
  await db.exec("DELETE FROM riftbound.binder WHERE card_id IN ('a','b')");
  const unpriced = await readCollectionSummary(db);
  assert.equal(unpriced.value_usd, null);
  assert.equal(unpriced.unpriced_copies, '5');
  assert.equal(unpriced.oldest_price_date, null);
});

test('summary API is read-only, unfiltered, HEAD compatible, and sanitizes failures', async () => {
  const worker = createWorker({ database: (_, fn) => fn(db) });
  const request = (suffix = '', method = 'GET') => new Request(`https://test/api/riftbound/summary${suffix}`, { method });
  const result = await worker.fetch(request(), {});
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal((await result.json()).copies, '5');
  assert.equal((await worker.fetch(request('?set=OGN'), {})).status, 400);
  assert.equal((await worker.fetch(request('', 'POST'), {})).status, 405);
  const head = await worker.fetch(request('', 'HEAD'), {});
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const failing = createWorker({ database: () => { throw new Error('private connection'); } });
  const error = await failing.fetch(request(), {});
  assert.equal(error.status, 503);
  assert.doesNotMatch(await error.text(), /private/);
});
