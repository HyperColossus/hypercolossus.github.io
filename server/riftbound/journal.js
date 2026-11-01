// Zack's decks and event history, read from optional "Decks" and "Events" tabs of the
// inventory sheet. Read-only; visitors only view them.
import { cardName } from './catalog.js';

export const DECKS_TAB = 'Decks';
export const EVENTS_TAB = 'Events';
export const DECK_SECTIONS = ['Legend', 'Champion', 'Main', 'Battlefield', 'Rune', 'Sideboard'];
const cellValue = cell => cell?.effectiveValue?.numberValue ?? cell?.effectiveValue?.stringValue
  ?? cell?.userEnteredValue?.numberValue ?? cell?.userEnteredValue?.stringValue ?? null;
const blank = value => value === null || value === undefined || value === '';
const str = (value, max) => blank(value) ? '' : String(value).trim().slice(0, max);
const serialDate = n => new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10);

// Header row anywhere in the first five rows; columns found by name.
function table(grid, required) {
  const rows = grid?.rowData ?? [];
  const header = rows.slice(0, 5).findIndex(r => required.every(h => (r.values ?? []).some(c => cellValue(c) === h)));
  if (header < 0) return null;
  const labels = rows[header].values.map(cellValue);
  return rows.slice(header + 1).map(r => r.values ?? [])
    .filter(cells => cells.some(c => !blank(cellValue(c))))
    .map(cells => label => { const i = labels.indexOf(label); return i < 0 ? null : cellValue(cells[i]); });
}

export function parseDecks(grid, cards) {
  const rows = table(grid, ['Deck', 'Card', 'Quantity']);
  if (!rows) return [];
  const byId = new Map(cards.map(card => [card.id, card]));
  const byName = new Map();
  // Prefer the base printing (numeric collector number) when a name has several.
  for (const card of cards) {
    const key = cardName(card.name);
    const current = byName.get(key);
    // Prefer the plain-named base printing over promos and alternate treatments.
    const rank = c => (/\(/.test(c.name) ? 2 : 0) + (/^\d+$/.test(c.collector_number ?? '') ? 0 : 1);
    if (!current || rank(card) < rank(current)) byName.set(key, card);
  }
  const decks = new Map();
  for (const get of rows.slice(0, 2000)) {
    const deckName = str(get('Deck'), 80), label = str(get('Card'), 300);
    if (!deckName || !label) continue;
    const quantity = get('Quantity');
    const count = typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0 && quantity <= 99 ? quantity : 1;
    const section = DECK_SECTIONS.find(s => s.toLowerCase() === str(get('Section'), 20).toLowerCase()) ?? 'Main';
    const card = byId.get(label) ?? byName.get(cardName(label));
    if (!decks.has(deckName)) decks.set(deckName, { name: deckName, cards: [] });
    const deck = decks.get(deckName);
    const id = card?.id ?? null;
    const existing = deck.cards.find(item => item.section === section && (id ? item.id === id : item.name === label));
    if (existing) { existing.quantity = Math.min(99, existing.quantity + count); continue; }
    deck.cards.push({ id, name: card?.name ?? label, section, quantity: count, image_url: card?.image_url ?? null,
      card_type: card?.card_type ?? null, domains: card?.domains ?? [], owned: card ? card.quantity : 0, known: Boolean(card) });
  }
  return [...decks.values()].slice(0, 100).map(deck => {
    const total = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
    const missing = deck.cards.reduce((sum, card) => sum + Math.max(0, card.quantity - card.owned), 0);
    const domains = [...new Set(deck.cards.flatMap(card => card.domains))];
    const cover = deck.cards.find(card => card.section === 'Legend' && card.image_url) ?? deck.cards.find(card => card.image_url);
    return { ...deck, total, missing, domains, cover: cover?.image_url ?? null };
  });
}

export function parseEvents(grid) {
  const rows = table(grid, ['Date', 'Event']);
  if (!rows) return [];
  const events = [];
  for (const get of rows.slice(0, 1000)) {
    const name = str(get('Event'), 120), raw = get('Date');
    if (!name) continue;
    const date = typeof raw === 'number' && raw > 1 && raw < 100000 ? serialDate(Math.floor(raw))
      : typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? raw.trim() : null;
    events.push({ date, name, location: str(get('Location'), 200), format: str(get('Format'), 60),
      deck: str(get('Deck'), 80), result: str(get('Result'), 80), notes: str(get('Notes'), 1000) });
  }
  return events.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
