import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchDotggCatalog, reconcileDotggCards } from '../server/riftbound/dotgg.js';

const card = { id: 'OGN-001', name: 'Example', set_name: 'Origins', rarity: 'Common', image: 'https://static.dotgg.gg/riftbound/cards/OGN-001.webp', cost: '0', color: ['Fury'], marketIds: '123' };
const fetcher = rows => async url => Response.json(url.includes('getsets') ? [{ id: 'OGN', name: 'Origins' }] : rows);
test('DotGG maps live-format fields, zero and unknown costs, and signature IDs', async () => {
  const data = await fetchDotggCatalog(fetcher([card, { ...card, id: 'SGN - 001/003 - P', cost: null }]));
  assert.equal(data.cards[0].energy, 0);
  assert.equal(data.cards[1].energy, null);
  assert.equal(data.cards[1].id, 'dotgg:SGN-001:003-P');
  assert.deepEqual(data.cards[0].domains, ['Fury']);
});
test('DotGG rejects provider failures and malformed catalogs', async () => {
  await assert.rejects(fetchDotggCatalog(async () => new Response('private upstream error', { status: 503 })), /request failed/);
  for (const rows of [[], [card, card], [{ ...card, cost: '-1' }], [{ ...card, image: 'http://example.com' }]]) await assert.rejects(fetchDotggCatalog(fetcher(rows)));
});
test('DotGG reconciliation preserves existing IDs and skips ambiguous printings', async () => {
  const { cards } = await fetchDotggCatalog(fetcher([card]));
  const existing = [{ id: 'existing', name: 'Example', set_id: 'OGN', set_name: 'Origins', tcg_product_id: '123' }];
  assert.equal(reconcileDotggCards(cards, existing).cards[0].id, 'existing');
  assert.equal(reconcileDotggCards(cards, [...existing, { ...existing[0], id: 'alternate' }]).skipped, 1);
  assert.equal(reconcileDotggCards([{ ...cards[0], tcgId: null }], existing).skipped, 1);
});
