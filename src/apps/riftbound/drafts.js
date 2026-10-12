export const DRAFT_KEY = 'riftbound-drafts-v1';

export function validateDrafts(value) {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid saved decks');
  const ids = new Set();
  for (const deck of value) {
    if (!deck || typeof deck.id !== 'string' || !deck.id || deck.id.length>100 || ids.has(deck.id) || typeof deck.name !== 'string' || !deck.name.trim() || deck.name.length > 80 || !Array.isArray(deck.cards) || deck.cards.length > 500) throw new Error('Invalid saved deck');
    ids.add(deck.id);
    const cards = new Set();
    for (const card of deck.cards) {
      if (!card || typeof card.id !== 'string' || !card.id || card.id.length>100 || cards.has(card.id) || typeof card.name !== 'string' || !card.name.trim() || card.name.length>300 || !Number.isInteger(card.quantity) || card.quantity < 1 || card.quantity > 99) throw new Error('Invalid saved card');
      cards.add(card.id);
    }
  }
  return value;
}

export function adjustCard(deck, card, delta) {
  const existing = deck.cards.find(item => item.id === card.id);
  const quantity = Math.min(99, (existing?.quantity ?? 0) + delta);
  if (!existing && (quantity <= 0 || deck.cards.length >= 500)) return deck;
  const cards = existing
    ? deck.cards.map(item => item.id === card.id ? { ...item, quantity } : item).filter(item => item.quantity > 0)
    : [...deck.cards, { id: card.id, name: card.name, quantity }];
  return { ...deck, cards };
}

export function deckText(deck) {
  return [deck.name, 'Riftbound draft — legality not checked', ...deck.cards.map(card => `${card.quantity} × ${card.name} [${card.id}]`)].join('\n');
}

export function deckCoverage(deck,holdings) {
  const owned=new Map(holdings.map(card => [card.id,Number(card.quantity)]));
  const cards=deck.cards.map(card => ({...card,owned:owned.get(card.id)??0,missing:Math.max(0,card.quantity-(owned.get(card.id)??0))}));
  return {cards,missing:cards.reduce((sum,card) => sum+card.missing,0),required:cards.reduce((sum,card) => sum+card.quantity,0)};
}
