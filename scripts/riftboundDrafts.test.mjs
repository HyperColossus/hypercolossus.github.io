import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adjustCard, validateDrafts, deckText } from '../src/apps/riftbound/drafts.js';
import { validateEvents } from '../src/apps/riftbound/events.js';

test('deck quantities merge by printing, remove at zero, and never mutate the original', () => {
  const empty = { id: 'draft', name: 'My draft', cards: [] };
  const card = { id: 'alpha', name: 'Alpha' };
  const once = adjustCard(empty, card, 1);
  const twice = adjustCard(once, card, 1);
  assert.equal(twice.cards.length, 1);
  assert.equal(twice.cards[0].quantity, 2);
  assert.deepEqual(empty.cards, []);
  assert.deepEqual(adjustCard(once, card, -1).cards, []);
  assert.match(deckText(twice), /2 × Alpha \[alpha\]/);
  assert.deepEqual(validateDrafts(JSON.parse(JSON.stringify([twice]))), [twice]);
});

test('invalid saved drafts are rejected instead of silently overwriting storage', () => {
  assert.throws(() => validateDrafts({}));
  assert.throws(() => validateDrafts([{ id: 'a', name: 'A', cards: [{ id: 'x', name: 'X', quantity: -1 }] }]));
  const deck = { id: 'a', name: 'A', cards: [] };
  assert.throws(() => validateDrafts([deck, deck]));
});

test('event records round-trip and reject malformed dates and duplicate IDs', () => {
  const event = { id: 'a', name: 'Game night', location: 'Local store', date: '2026-10-01T18:30' };
  assert.deepEqual(validateEvents([event]), [event]);
  assert.throws(() => validateEvents([{ ...event, date: 'not-a-date' }]));
  assert.throws(() => validateEvents([event, event]));
});
