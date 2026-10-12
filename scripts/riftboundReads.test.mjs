import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createWorker } from '../server/index.js';
import { readCards, readFilters, readHistory } from '../server/riftbound/queries.js';
import { importCatalog, normalizeCards, fetchCatalog } from '../server/riftbound/import.js';
import { syncRiftboundPrices } from '../server/riftbound/prices.js';
import { money, priceAge } from '../src/apps/riftbound/api.js';

const db = new PGlite();
const fixture = (id, name, rarity = 'Rare') => ({ id, name, set: { set_id: 'OGN', label: 'Origins' }, classification: { rarity }, media: { image_url: 'https://example.test/card.png' }, tcgplayer_id: null });
const filters = query => readFilters(new URLSearchParams(query));
before(async () => {
  await db.exec(await readFile(new URL('../db/riftbound/001_initial.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../db/riftbound/003_card_gameplay.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../db/riftbound/005_card_details.sql', import.meta.url), 'utf8'));
  await importCatalog(db, [fixture('a', 'Alpha'), fixture('b', "100% Real_ 'Card'", 'Common'), fixture('c', 'Alpha')]);
  await db.exec(`INSERT INTO riftbound.binder VALUES ('a', false, 2), ('a', true, 3);
    INSERT INTO riftbound.price_history (card_id, price_date, normal_price, foil_price)
    VALUES ('a','2026-09-26',1,2), ('a','2026-09-27',3,NULL);`);
});
after(async () => db.close());

test('Collector order precedes names, keeps alternates adjacent and paginates numerically', async () => {
  const entries = [['order-10','Aardvark','010'],['order-2','Zebra','002'],['order-2a','Alternate','002A'],['order-r','Rune','R01'],['order-t','Token','T01']];
  await importCatalog(db, entries.map(([id,name,n])=>({ ...fixture(id,name), media:{image_url:`https://static.dotgg.gg/riftbound/cards/OGN-${n}.webp`}, alt:n==='002A' })));
  await db.exec("INSERT INTO riftbound.binder VALUES ('order-10',false,1),('order-2',false,1)");
  try {
    const query='q=&set=OGN&limit=60';
    const catalog=await readCards(db,'catalog',filters(query));
    assert.deepEqual(catalog.items.filter(c=>c.id.startsWith('order-')).map(c=>c.id),['order-2','order-2a','order-10','order-r','order-t']);
    assert.equal((await readCards(db,'catalog',filters('limit=1&page=2'))).items[0].id,'order-2a');
    assert.deepEqual((await readCards(db,'binder',filters(''))).items.filter(c=>c.id.startsWith('order-')).map(c=>c.id),['order-2','order-10']);
  } finally {
    await db.exec("DELETE FROM riftbound.binder WHERE card_id LIKE 'order-%'; DELETE FROM riftbound.cards WHERE id LIKE 'order-%'");
  }
});

test('domain and zero-energy filters combine with pagination and preserve unknown costs', async () => {
  await importCatalog(db, [
    { ...fixture('domain-a', 'Domain Alpha'), domains: ['Fury', 'Calm'], energy: 0 },
    { ...fixture('domain-b', 'Domain Beta'), domains: ['Fury'], energy: 4 },
    { ...fixture('domain-c', 'Domain Gamma'), domains: ['Colorless'], energy: null },
  ]);
  const found = await readCards(db, 'catalog', filters('domain=Fury&energy=0'));
  assert.equal(found.total, 1);
  assert.equal(found.items[0].energy, 0);
  assert.deepEqual(found.items[0].domains, ['Fury', 'Calm']);
  const second = await readCards(db, 'catalog', filters('domain=Fury&limit=1&page=2'));
  assert.equal(second.total, 2);
  assert.equal(second.items[0].id, 'domain-b');
  assert.equal((await readCards(db, 'catalog', filters('domain=Colorless&energy=0'))).total, 0);
  await db.exec("DELETE FROM riftbound.cards WHERE id IN ('domain-a', 'domain-b', 'domain-c')");
  for (const query of ['energy=-1', 'energy=1.5', 'energy=100', 'domain=invalid']) assert.throws(() => filters(query));
  assert.throws(() => normalizeCards([{ ...fixture('bad', 'Bad'), energy: -1 }]));
});

test('database Binder brings overnumbered versions next to normal and foil before pagination',async()=>{
  const entries=[['group-base','Grouped card','006'],['group-other','Unrelated card','007'],['group-alt','Grouped card','192']];
  await importCatalog(db,entries.map(([id,name,n])=>({...fixture(id,name),media:{image_url:`https://static.dotgg.gg/riftbound/cards/VEN-${n}.webp`},alt:n==='192'})));
  await db.exec("INSERT INTO riftbound.binder VALUES ('group-base',false,2),('group-base',true,1),('group-other',false,1),('group-alt',true,1)");
  try{
    const first=await readCards(db,'binder',filters('q=card&limit=3'));
    assert.equal(first.total,4);
    assert.deepEqual(first.items.map(c=>[c.id,c.is_foil]),[['group-base',false],['group-base',true],['group-alt',true]]);
    assert.equal((await readCards(db,'binder',filters('q=card&limit=3&page=2'))).items[0].id,'group-other');
    assert.deepEqual((await readCards(db,'binder',filters('q=card&finish=foil'))).items.map(c=>c.id),['group-base','group-alt']);
    const combined=await readCards(db,'binder',filters('q=card&group=printing&limit=1'));
    assert.equal(combined.total,3);
    assert.equal(combined.items[0].quantity,3);
    assert.equal(combined.items[0].normal_quantity,2);
    assert.equal(combined.items[0].foil_quantity,1);
    assert.equal((await readCards(db,'binder',filters('q=card&group=printing&limit=1&page=2'))).items[0].id,'group-alt');
  }finally{await db.exec("DELETE FROM riftbound.binder WHERE card_id LIKE 'group-%'; DELETE FROM riftbound.cards WHERE id LIKE 'group-%'");}
});

test('Catalog searches literal punctuation, filters, and paginates deterministically', async () => {
  const found = await readCards(db, 'catalog', filters('q=100%25&set=OGN&rarity=Common'));
  assert.equal(found.total, 1); assert.equal(found.items[0].id, 'b');
  const page = await readCards(db, 'catalog', filters('q=Alpha&limit=1&page=2'));
  assert.equal(page.total, 2); assert.equal(page.items[0].id, 'c');
  const empty = await readCards(db, 'catalog', filters('q=Alpha&page=100'));
  assert.equal(empty.total, 2); assert.deepEqual(empty.items, []);
  assert.equal((await readCards(db, 'catalog', filters("q=' OR 1=1 --"))).total, 0);
});

test('Collection ownership filters before pagination and aggregates finishes', async () => {
  const owned = await readCards(db, 'catalog', filters('owned=true&limit=1'));
  assert.equal(owned.total, 1);
  assert.equal(owned.items[0].id, 'a');
  assert.equal(owned.items[0].quantity, 5);
  const all = await readCards(db, 'catalog', filters(''));
  assert.equal(all.total, 3);
  assert.equal(all.items.find(card => card.id === 'b').quantity, 0);
  assert.equal((await readCards(db, 'catalog', filters('owned=true&q=100%25'))).total, 0);
  assert.throws(() => filters('owned=false'));
});

test('Binder keeps normal and foil quantities separate and missing prices null', async () => {
  const normal = await readCards(db, 'binder', filters('finish=normal'));
  assert.equal(normal.total, 1); assert.equal(normal.items[0].quantity, 2);
  assert.equal(Number(normal.items[0].normal_price), 3);
  const foil = await readCards(db, 'binder', filters('finish=foil'));
  assert.equal(foil.items[0].quantity, 3); assert.equal(foil.items[0].foil_price, null);
  assert.equal(foil.items[0].price_date, '2026-09-27');
});

test('History preserves dates, latest ordering, empty observations, and missing cards', async () => {
  const history = await readHistory(db, 'a', filters('limit=1'));
  assert.equal(history.items[0].price_date, '2026-09-27');
  assert.equal((await readHistory(db, 'c', filters(''))).items.length, 0);
  assert.equal(await readHistory(db, 'missing', filters('')), null);
});

test('Public API rejects bad pagination and writes, and sanitizes database failures', async () => {
  const worker = createWorker({ database: (_, fn) => fn(db) });
  for (const query of ['page=0', 'page=-1', 'limit=999', 'limit=1&limit=2', 'finish=glitter', 'unknown=x']) {
    assert.equal((await worker.fetch(new Request(`https://test/api/riftbound/catalog?${query}`), {})).status, 400);
  }
  for (const method of ['POST', 'PUT', 'DELETE']) {
    assert.equal((await worker.fetch(new Request('https://test/api/riftbound/binder', { method }), {})).status, 405);
  }
  const head = await worker.fetch(new Request('https://test/api/riftbound/catalog', { method: 'HEAD' }), {});
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  const facets = await worker.fetch(new Request('https://test/api/riftbound/facets'), {});
  assert.equal((await facets.json()).sets[0].id, 'OGN');
  const failing = createWorker({ database: () => { throw new Error('private-connection-string'); } });
  const error = await failing.fetch(new Request('https://test/api/riftbound/binder'), {});
  assert.equal(error.status, 503); assert.doesNotMatch(await error.text(), /private/);
});

test('Importer updates metadata without deleting missing cards or changing ownership', async () => {
  await importCatalog(db, [fixture('a', 'Alpha updated')]);
  assert.equal((await db.query('SELECT * FROM riftbound.cards')).rows.length, 3);
  assert.equal((await db.query('SELECT sum(quantity)::int AS n FROM riftbound.binder')).rows[0].n, 5);
  assert.equal((await db.query('SELECT * FROM riftbound.price_history')).rows.length, 2);
  assert.throws(() => normalizeCards([fixture('same', 'A'), fixture('same', 'B')]));
  assert.throws(() => normalizeCards([{ ...fixture('d', 'D'), media: { image_url: 'javascript:alert(1)' } }]));
});

test('Importer allows distinct printings to share a TCGPlayer product', async () => {
  await importCatalog(db, [{ ...fixture('d', 'New card'), tcgplayer_id: '123' }, { ...fixture('e', 'Alternate card'), tcgplayer_id: '123' }]);
  assert.equal((await db.query("SELECT * FROM riftbound.cards WHERE id IN ('d','e') AND tcg_product_id = '123'")).rows.length, 2);
});

test('RiftHunt errors and malformed exports fail before import', async () => {
  await assert.rejects(fetchCatalog(async () => new Response('<html>challenge</html>', { status: 403 })), /403/);
  const malformed = { source: 'riftcodex', fetched: '2026-09-28T00:00:00Z', sets: [{ id: 'OGN', name: 'Origins' }], cards: [] };
  await assert.rejects(fetchCatalog(async () => Response.json(malformed)), /invalid shape/);
  const exportData = { ...malformed, cards: [{ id: 'live', name: 'Documented shape', set: 'OGN', setName: 'Origins', rarity: 'Rare', imgUrl: 'https://example.test/card.png', tcgId: '123' }] };
  const items = await fetchCatalog(async (_url, options) => {
    assert.match(options.headers['User-Agent'], /HyperColossus/);
    return Response.json(exportData);
  });
  assert.equal(normalizeCards(items).length, 1);
});

test('Price sync imports TCG API set pages and keeps one daily normal/foil observation', async () => {
  await importCatalog(db, [{ ...fixture('priced-card', 'Priced card'), tcgplayer_id: '987654' }]);
  const originalFetch = async (url, options) => {
    assert.equal(options.headers['X-API-Key'], 'tcg_live_test123');
    const parsed = new URL(url);
    if (parsed.pathname === '/v1/sets') return Response.json({ data: [{ id: 77, name: 'Origins', card_count: 2 }], meta: { page: 1, total: 1, has_more: false } });
    assert.equal(parsed.pathname, '/v1/sets/77/cards');
    assert.equal(parsed.searchParams.get('per_page'), '100');
    return Response.json({ data: [
      { tcgplayer_id: 987654, printing: 'Normal', market_price: 0.61 },
      { tcgplayer_id: 987654, printing: 'Foil', market_price: 1.25 },
    ], meta: { page: 1, total: 2, has_more: false } });
  };
  const first = await syncRiftboundPrices(db, 'tcg_live_test123', { fetcher: originalFetch, now: new Date('2026-09-28T23:00:00Z') });
  assert.deepEqual(first, { date: '2026-09-28', matchedSets: 1, products: 2, pricedCards: 1, inserted: 1, requests: 2 });
  const observed = (await db.query("SELECT normal_price, foil_price FROM riftbound.price_history WHERE card_id = 'priced-card'")).rows[0];
  assert.equal(Number(observed.normal_price), 0.61);
  assert.equal(Number(observed.foil_price), 1.25);
  const retry = await syncRiftboundPrices(db, 'tcg_live_test123', {
    fetcher: async url => {
      const parsed = new URL(url);
      if (parsed.pathname === '/v1/sets') return Response.json({ data: [{ id: 77, name: 'Origins', card_count: 2 }], meta: { page: 1, total: 1, has_more: false } });
      return Response.json({ data: [{ tcgplayer_id: 987654, printing: 'Normal', market_price: 0.99 }], meta: { page: 1, total: 1, has_more: false } });
    }, now: new Date('2026-09-28T23:30:00Z'),
  });
  assert.equal(retry.inserted, 0);
  assert.equal(Number((await db.query("SELECT normal_price FROM riftbound.price_history WHERE card_id = 'priced-card'")).rows[0].normal_price), 0.61);
});

test('Price display distinguishes missing, zero, and stale observations', () => {
  assert.equal(money(null), 'Unavailable'); assert.equal(money('0.0000'), '$0.00');
  assert.match(priceAge('2026-09-20', Date.parse('2026-09-27')), /Stale/);
  assert.equal(priceAge(null), 'Prices not available');
});

test('Price sync checks the reported daily allowance before fetching card pages', async () => {
  await importCatalog(db, [{ ...fixture('budget-card', 'Budget card'), tcgplayer_id: '222222' }]);
  let requests = 0;
  await assert.rejects(syncRiftboundPrices(db, 'tcg_live_test123', {
    fetcher: async () => {
      requests++;
      return Response.json({ data: [{ id: 78, name: 'Origins', card_count: 1 }],
        meta: { page: 1, total: 1, has_more: false }, rate_limit: { daily_remaining: 0 } });
    },
  }), /allowance is too low/);
  assert.equal(requests, 1);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM riftbound.price_history WHERE card_id = 'budget-card'")).rows[0].n, 0);
});
