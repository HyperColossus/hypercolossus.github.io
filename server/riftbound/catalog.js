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
      name: text(card.name, 300), set: text(card.set, 64), tcg: text(card.tcg, 100),
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
  // Secondary indexes let sheet rows with other providers' IDs (e.g. dotgg:RAD-001)
  // find their card: first by TCGPlayer product, then by card name.
  const byTcg = new Map(), byName = new Map();
  for (const [id, card] of cards) {
    if (card.tcg && !byTcg.has(card.tcg)) byTcg.set(card.tcg, id);
    const key = cardName(card.name);
    if (key && card.card_type) (byName.get(key) ?? byName.set(key, []).get(key)).push(card);
  }
  return { cards, byTcg, byName, sealed, source: String(snapshot.source ?? ''), generated_at: snapshot.generated_at };
}

export const cardName = name => (name ?? '').replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const pick = details => Object.fromEntries(CATALOG_FIELDS.map(field => [field, details[field]]));

// Missing catalog entries stay unknown (null type), exactly as before.
export function applyCatalog(sheetCards, catalog) {
  return sheetCards.map(card => {
    const exact = catalog.cards.get(card.id) ?? catalog.cards.get(catalog.byTcg?.get(card.tcg_product_id));
    if (exact) return { ...card, ...pick(exact) };
    // Same-name printings share type and rules; prefer one from the same set.
    const named = catalog.byName?.get(cardName(card.name));
    if (!named?.length) return card;
    const source = named.find(other => other.set === card.set_id) ?? named[0];
    // A name match cannot know this printing's treatment, so showcase and
    // non-numeric collector numbers stay out of the booster model.
    const special = /showcase/i.test(card.rarity ?? '') || !/^\d+$/.test(card.collector_number ?? '');
    return { ...card, card_type: source.card_type, card_supertype: source.card_supertype, rules_text: source.rules_text,
      is_alt: special, is_overnumbered: false, is_signature: false };
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

// Per-set card counts that grew between the bundled snapshot and a provider export.
export function catalogGrowth(previousSets = {}, cards) {
  const counts = {};
  for (const card of cards) if (card.setId) counts[card.setId] = (counts[card.setId] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts)
    .filter(([set, count]) => count > (previousSets[set] ?? 0))
    .map(([set, count]) => [set, { before: previousSets[set] ?? 0, after: count }]));
}
