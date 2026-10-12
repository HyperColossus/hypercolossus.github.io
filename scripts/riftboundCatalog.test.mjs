import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, applyCatalog, sheetSetTools } from '../server/riftbound/catalog.js';
import { createWorker } from '../server/index.js';
import snapshotFile from '../server/riftbound/catalog-snapshot.json' with { type: 'json' };

const catalog = {
  version: 1, generated_at: '2026-10-12T00:00:00Z', source: 'test',
  cards: [
    { id: 'VEN-001', card_type: 'Unit', rules_text: 'Hit things.' },
    { id: 'VEN-002', card_type: 'Battlefield' },
    { id: 'VEN-003', card_type: 'Unit', card_supertype: 'Token' },
  ],
  sealed: [
    { id: 'ven-pack', set_id: 'VEN', name: 'Vendetta Booster', kind: 'pack', pack_count: 1, msrp: 4.99, market_price: 5.5, price_date: '2026-10-10' },
    { id: 'ogn-box', set_id: 'OGN', name: 'Origins Box', kind: 'box', pack_count: 24, msrp: 119.76, market_price: null, price_date: null },
  ],
};
const card = (id, extra = {}) => ({ id, name: id, rarity: 'Common', image_url: null, set_id: id.split('-')[0],
  normal_price: 0.25, foil_price: 1, price_date: '2026-10-11', card_type: null, card_supertype: null, rules_text: null,
  is_alt: false, is_overnumbered: false, is_signature: false, ...extra });
const sheet = { refreshedAt: '2026-10-12T01:00:00Z', cards: [card('VEN-001'), card('VEN-002'), card('VEN-003'), card('VEN-999'), card('OGN-001')] };

test('bundled catalog snapshot is valid', () => {
  const checked = validateCatalog(snapshotFile);
  assert.ok(checked.cards.size > 1000);
});

test('catalog validation rejects malformed snapshots', () => {
  assert.throws(() => validateCatalog({ ...catalog, version: 2 }));
  assert.throws(() => validateCatalog({ ...catalog, cards: [catalog.cards[0], catalog.cards[0]] }));
  assert.throws(() => validateCatalog({ ...catalog, cards: [{ id: 'x', is_alt: 'yes' }] }));
  assert.throws(() => validateCatalog({ ...catalog, sealed: [{ ...catalog.sealed[0], kind: 'crate' }] }));
});

test('sheet cards gain gameplay details; unknown cards stay unknown', () => {
  const merged = applyCatalog(sheet.cards, validateCatalog(catalog));
  assert.equal(merged[0].card_type, 'Unit');
  assert.equal(merged[0].rules_text, 'Hit things.');
  assert.equal(merged[0].normal_price, 0.25); // prices still come from the sheet
  assert.equal(merged[3].card_type, null);
});

test('set tools use sheet prices plus bundled sealed products for one set', () => {
  const checked = validateCatalog(catalog);
  const tools = sheetSetTools({ ...sheet, cards: applyCatalog(sheet.cards, checked) }, checked, 'VEN');
  assert.deepEqual(tools.cards.map(c => c.id), ['VEN-001', 'VEN-002', 'VEN-003', 'VEN-999']);
  assert.equal(tools.cards[2].card_supertype, 'Token');
  assert.deepEqual(tools.sealed.map(s => s.id), ['ven-pack']);
  assert.equal(tools.sealed[0].set_id, undefined);
  assert.equal(sheetSetTools(sheet, checked, 'NOPE'), null);
});

test('Worker serves set tools from sheet and catalog without database access', async () => {
  const env = { RIFTBOUND_SHEET_ENABLED: 'true' };
  const worker = createWorker({ database: () => assert.fail('database accessed'), sheetReader: async () => sheet, catalog });
  const response = await worker.fetch(new Request('https://site.test/api/riftbound/set-tools?set=VEN'), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.cards[1].card_type, 'Battlefield');
  assert.equal(body.sealed.length, 1);
  const details = await (await worker.fetch(new Request('https://site.test/api/riftbound/catalog?q=VEN-001'), env)).json();
  assert.equal(details.items[0].rules_text, 'Hit things.');
  const missing = await worker.fetch(new Request('https://site.test/api/riftbound/set-tools'), env);
  assert.equal(missing.status, 400);
  const broken = createWorker({ sheetReader: async () => sheet, catalog: { version: 9 } });
  const failed = await broken.fetch(new Request('https://site.test/api/riftbound/set-tools?set=VEN'), env);
  assert.equal(failed.status, 503);
});

test('catalog growth reports only sets with more typed cards than the snapshot', async () => {
  const { catalogGrowth } = await import('../server/riftbound/catalog.js');
  const cards = [{ setId: 'RAD' }, { setId: 'RAD' }, { setId: 'OGN' }];
  assert.deepEqual(catalogGrowth({ OGN: 1, RAD: 0 }, cards), { RAD: { before: 0, after: 2 } });
  assert.deepEqual(catalogGrowth({ OGN: 5, RAD: 2 }, cards), {});
});

test('sheet rows with other IDs match by TCGPlayer product, then by name; name matches stay out of boosters', () => {
  const checked = validateCatalog({ ...catalog, cards: [
    { id: 'rh-1', name: 'Amateur Demolitionist', set: 'RAD', tcg: '722276', card_type: 'Unit', is_signature: true },
    { id: 'rh-2', name: "Kai'Sa - Rebel", set: 'RAD', card_type: 'Legend', rules_text: 'Rebel.' },
  ] });
  const [byTcg, byName, showcase, none] = applyCatalog([
    card('dotgg:RAD-001', { name: 'Amateur Demolitionist', tcg_product_id: '722276', set_id: 'RAD', collector_number: '1' }),
    card('dotgg:RAD-200', { name: "Kai'Sa - Rebel", set_id: 'RAD', collector_number: '200', rarity: 'Rare' }),
    card('dotgg:RAD-SP4', { name: "Kai'Sa - Rebel (Showcase)", set_id: 'RAD', collector_number: 'SP4', rarity: 'Showcase' }),
    card('dotgg:RAD-999', { name: 'Unknown', set_id: 'RAD' }),
  ], checked);
  assert.equal(byTcg.card_type, 'Unit'); assert.equal(byTcg.is_signature, true);
  assert.equal(byName.card_type, 'Legend'); assert.equal(byName.rules_text, 'Rebel.'); assert.equal(byName.is_alt, false);
  assert.equal(showcase.card_type, 'Legend'); assert.equal(showcase.is_alt, true);
  assert.equal(none.card_type, null);
});
