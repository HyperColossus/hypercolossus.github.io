// Gameplay catalog bundled with the Worker. The inventory sheet supplies ownership
// and current prices; this snapshot supplies card types, rules text, treatments and
// sealed products, which change only when a set releases.
export const CATALOG_FIELDS = ['card_type', 'card_supertype', 'rules_text', 'is_alt', 'is_overnumbered', 'is_signature'];

const text = (value, max) => value === null || value === undefined || value === ''
  ? null : typeof value === 'string' && value.length <= max ? value : invalid();
const flag = value => value === undefined || value === null ? false : typeof value === 'boolean' ? value : invalid();
const money = value => value === null || value === undefined ? null
  : Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : invalid();
function invalid() { throw new Error('Invalid catalog snapshot'); }

export function validateCatalog(snapshot) {
  if (snapshot?.version !== 1 || !Array.isArray(snapshot.cards) || !Array.isArray(snapshot.sealed)
    || snapshot.cards.length > 20000 || snapshot.sealed.length > 2000
    || !Number.isFinite(Date.parse(snapshot.generated_at))) invalid();
  const cards = new Map();
  for (const card of snapshot.cards) {
    if (typeof card?.id !== 'string' || !/^[a-zA-Z0-9_:-]{1,100}$/.test(card.id) || cards.has(card.id)) invalid();
    cards.set(card.id, {
      card_type: text(card.card_type, 64), card_supertype: text(card.card_supertype, 64),
      rules_text: text(card.rules_text, 20000), is_alt: flag(card.is_alt),
      is_overnumbered: flag(card.is_overnumbered), is_signature: flag(card.is_signature),
    });
  }
  const sealed = snapshot.sealed.map(item => {
    if (typeof item?.id !== 'string' || typeof item.set_id !== 'string' || typeof item.name !== 'string'
      || !['pack', 'box', 'other'].includes(item.kind)
      || (item.pack_count !== null && !(Number.isInteger(item.pack_count) && item.pack_count > 0))) invalid();
    const date = item.price_date ?? null;
    if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) invalid();
    return { id: item.id, set_id: item.set_id, name: item.name, kind: item.kind, pack_count: item.pack_count,
      msrp: money(item.msrp), market_price: money(item.market_price), price_date: date };
  });
  return { cards, sealed, source: String(snapshot.source ?? ''), generated_at: snapshot.generated_at };
}

// Missing catalog entries stay unknown (null type), exactly as before.
export function applyCatalog(sheetCards, catalog) {
  return sheetCards.map(card => {
    const details = catalog.cards.get(card.id);
    return details ? { ...card, ...details } : card;
  });
}

export function sheetSetTools(snapshot, catalog, set) {
  const cards = snapshot.cards.filter(card => card.set_id === set);
  if (!cards.length) return null;
  return {
    cards: cards.map(card => ({
      id: card.id, name: card.name, rarity: card.rarity, image_url: card.image_url,
      ...Object.fromEntries(CATALOG_FIELDS.map(field => [field, card[field]])),
      normal_price: card.normal_price, foil_price: card.foil_price, price_date: card.price_date,
    })),
    sealed: catalog.sealed.filter(item => item.set_id === set)
      .map(({ set_id: _set, ...item }) => item),
    source: 'google-sheet', refreshed_at: snapshot.refreshedAt, catalog_generated_at: catalog.generated_at,
  };
}
