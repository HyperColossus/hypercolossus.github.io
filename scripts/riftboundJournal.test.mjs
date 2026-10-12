import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDecks, parseEvents } from '../server/riftbound/journal.js';
import { createWorker } from '../server/index.js';

const cells = values => ({ values: values.map(v => v == null ? {} : { userEnteredValue: typeof v === 'number' ? { numberValue: v } : { stringValue: v } }) });
const grid = rows => ({ rowData: rows.map(cells) });
const cards = [
  { id: 'OGN-001', name: 'Jinx - Rebel', collector_number: '1', quantity: 2, image_url: 'https://x/1.jpg', card_type: 'Legend', domains: ['Fury'] },
  { id: 'OGN-299', name: 'Jinx - Rebel (Showcase)', collector_number: 'SP1', quantity: 1, image_url: 'https://x/2.jpg', card_type: 'Legend', domains: ['Fury'] },
  { id: 'OGN-010', name: 'Get Excited!', collector_number: '10', quantity: 1, image_url: null, card_type: 'Spell', domains: ['Fury', 'Chaos'] },
];

test('decks resolve names or IDs, merge duplicates, group sections and count missing copies', () => {
  const decks = parseDecks(grid([
    ['My decks'],
    ['Deck', 'Card', 'Quantity', 'Section'],
    ['Jinx Aggro', 'jinx rebel', 1, 'legend'],
    ['Jinx Aggro', 'Get Excited!', 2, null],
    ['Jinx Aggro', 'OGN-010', 1, 'Main'],
    ['Jinx Aggro', 'Mystery Card', 3, 'Sideboard'],
    ['Other', 'OGN-299', 'x', null],
    [null, 'ignored', 1, null],
  ]), cards);
  assert.equal(decks.length, 2);
  const [jinx, other] = decks;
  assert.equal(jinx.cards[0].id, 'OGN-001');          // name matches the base printing
  assert.equal(jinx.cards[0].section, 'Legend');
  assert.equal(jinx.cards[1].quantity, 3);             // name + ID rows merged
  assert.equal(jinx.cards[2].known, false);
  assert.equal(jinx.total, 7);
  assert.equal(jinx.missing, 2 + 3);                    // 3 Get Excited! vs 1 owned; 3 unknown
  assert.deepEqual(jinx.domains, ['Fury', 'Chaos']);
  assert.equal(jinx.cover, 'https://x/1.jpg');
  assert.equal(other.cards[0].quantity, 1);             // invalid quantity counts as one
  assert.deepEqual(parseDecks(null, cards), []);
  assert.deepEqual(parseDecks(grid([['No', 'headers']]), cards), []);
});

test('events parse sheet dates, sort newest first and keep optional fields', () => {
  const events = parseEvents(grid([
    ['Date', 'Event', 'Location', 'Format', 'Deck', 'Result', 'Notes'],
    [46300, 'Store Skirmish', 'Local shop', 'Constructed', 'Jinx Aggro', '3-1', 'Fun'],
    ['2026-11-15', 'Regional', null, null, null, 'Top 8', null],
    [null, 'Undated night', null, null, null, null, null],
    [46301, null, 'no name', null, null, null, null],
  ]));
  assert.deepEqual(events.map(e => e.name), ['Regional', 'Store Skirmish', 'Undated night']);
  assert.equal(events[1].date, '2026-10-05');
  assert.equal(events[1].result, '3-1');
  assert.equal(events[2].date, null);
  assert.deepEqual(parseEvents(undefined), []);
});

test('Worker serves decks and events from the sheet snapshot, read-only', async () => {
  const snapshot = { refreshedAt: '2026-10-12T00:00:00Z', cards: cards.map(c => ({ ...c, set_id: 'OGN' })),
    journal: { Decks: grid([['Deck', 'Card', 'Quantity'], ['Jinx Aggro', 'Jinx - Rebel', 1]]), Events: null } };
  const worker = createWorker({ database: () => assert.fail('database accessed'), sheetReader: async () => snapshot });
  const env = { RIFTBOUND_SHEET_ENABLED: 'true' };
  const decks = await (await worker.fetch(new Request('https://site.test/api/riftbound/decks'), env)).json();
  assert.equal(decks.decks[0].cards[0].id, 'OGN-001');
  const events = await (await worker.fetch(new Request('https://site.test/api/riftbound/events'), env)).json();
  assert.deepEqual(events.events, []);
  assert.equal((await worker.fetch(new Request('https://site.test/api/riftbound/decks', { method: 'POST' }), env)).status, 405);
  assert.equal((await worker.fetch(new Request('https://site.test/api/riftbound/events?x=1'), env)).status, 400);
});
