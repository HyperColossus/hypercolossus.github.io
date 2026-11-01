import { normalizeCards } from './import.js';

// Public, read-only contract: https://dotgg.gg/api/
export async function fetchDotggCatalog(fetcher = fetch) {
  const read = async endpoint => {
    const response = await fetcher(`https://api.dotgg.gg/cgfw/${endpoint}?game=riftbound&mode=plain`, {
      headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('DotGG catalog request failed');
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length || rows.length > 20000) throw new Error('Invalid DotGG catalog response');
    return rows;
  };
  const cards = await read('getcards');
  const sets = await read('getsets');
  const labels = new Map(sets.map(set => [set.id, set.name]));
  const items = cards.map(card => {
    if (typeof card.id !== 'string' || !/^[A-Z0-9]+\s*-\s*[A-Za-z0-9/ -]+$/.test(card.id)) throw new Error('Invalid DotGG card ID');
    const set = card.id.split('-')[0].trim();
    const cost = card.cost == null || card.cost === '' ? null : String(card.cost);
    if (cost !== null && !/^(?:[0-9]|[1-9][0-9])$/.test(cost)) throw new Error('Invalid DotGG energy');
    if (card.marketIds && !/^\d+$/.test(String(card.marketIds))) throw new Error('Ambiguous DotGG market ID');
    return {
      id: `dotgg:${card.id.replace(/\s/g, '').replaceAll('/', ':')}`, name: card.name,
      set, setName: labels.get(set) ?? card.set_name, rarity: card.rarity,
      imgUrl: card.image, tcgId: card.marketIds || null,
      domains: card.color ?? [], energy: cost === null ? null : Number(cost),
    };
  });
  normalizeCards(items);
  return { cards: items, source: 'DotGG', fetched: new Date().toISOString() };
}

export function reconcileDotggCards(cards, existing) {
  const setNames = new Map(existing.map(card => [card.set_id, card.set_name]));
  const byProduct = new Map();
  for (const card of existing) {
    if (!card.tcg_product_id) continue;
    const key = String(card.tcg_product_id);
    byProduct.set(key, [...(byProduct.get(key) ?? []), card]);
  }
  const claimed = new Set();
  const items = [];
  let skipped = 0;
  for (const card of cards) {
    const direct = existing.find(row => row.id === card.id);
    const matches = card.tcgId ? byProduct.get(String(card.tcgId)) ?? [] : [];
    // Never guess which printing owns a holding. Also avoid duplicate imports
    // when a provider has no product ID but a matching name already exists.
    if (!direct && (matches.length > 1 || (!matches.length && existing.some(row => row.name === card.name)))) { skipped++; continue; }
    const match = direct ?? matches[0];
    const id = match?.id ?? card.id;
    if (claimed.has(id)) { skipped++; continue; }
    claimed.add(id);
    const set = match?.set_id ?? card.set;
    items.push({ ...card, id, set, setName: setNames.get(set) ?? card.setName });
  }
  return { cards: items, skipped };
}
