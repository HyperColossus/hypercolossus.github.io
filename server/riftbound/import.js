// Provider contract: https://rifthunt.com/api/
function required(value, field, max = 300) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`Invalid card ${field}`);
  return value.trim();
}

export function normalizeCards(items) {
  if (!Array.isArray(items) || !items.length || items.length > 20000) throw new Error('Invalid Catalog size');
  const ids = new Set();
  const sets = new Map();
  return items.map(item => {
    const id = required(item.id, 'id', 100);
    if (!/^[a-zA-Z0-9_:-]+$/.test(id) || ids.has(id)) throw new Error('Invalid or duplicate card ID');
    ids.add(id);
    const riftHunt = typeof item.set === 'string';
    const setId = required(riftHunt ? item.set : item.set?.set_id, 'set ID', 64).toUpperCase();
    const setName = required(riftHunt ? item.setName : item.set?.label, 'set label');
    if (sets.has(setId) && sets.get(setId) !== setName) throw new Error('Inconsistent set label');
    sets.set(setId, setName);
    const image = required(riftHunt ? item.imgUrl : item.media?.image_url, 'image', 2048);
    const imageUrl = new URL(image);
    if (imageUrl.protocol !== 'https:' || imageUrl.username || imageUrl.password) throw new Error('Invalid image URL');
    const productValue = riftHunt ? item.tcgId : item.tcgplayer_id;
    const product = productValue == null || productValue === '' ? null : required(String(productValue), 'TCGPlayer ID', 100);
    const domains = item.domains ?? [];
    if (!Array.isArray(domains) || domains.some(domain => !['Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order', 'Colorless'].includes(domain))) throw new Error('Invalid card domains');
    const energy = item.energy ?? null;
    if (energy !== null && (!Number.isInteger(energy) || energy < 0 || energy > 99)) throw new Error('Invalid card energy');
    const cardType = item.type == null ? null : required(item.type, 'type', 64);
    const cardSupertype = item.supertype == null ? null : required(item.supertype, 'supertype', 64);
    const rulesText = item.text == null || item.text === '' ? null : required(item.text, 'rules text', 20000);
    for (const flag of ['alt', 'over', 'sig']) if (item[flag] != null && typeof item[flag] !== 'boolean') throw new Error('Invalid card treatment');
    return { cardType, cardSupertype, rulesText, alt: item.alt ?? false, over: item.over ?? false, sig: item.sig ?? false,
      domains: [...new Set(domains)], energy, id, name: required(item.name, 'name'), setId, setName,
      rarity: required(riftHunt ? item.rarity : item.classification?.rarity, 'rarity', 64), image, product };
  });
}

export async function fetchRiftHuntCatalog(fetcher = fetch) {
  const response = await fetcher('https://api.rifthunt.com/bulk/cards', {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'HyperColossus-RiftboundCompanion/0.1 (portfolio catalog import)',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`RiftHunt returned HTTP ${response.status} or a non-JSON response.`);
  }
  const data = await response.json();
  if (!Array.isArray(data.cards) || !data.cards.length || data.cards.length > 20000
    || !Array.isArray(data.sets)) throw new Error('RiftHunt bulk export has an invalid shape.');

  const setNames = new Map(data.sets.map(set => [String(set.id).toUpperCase(), set.name]));
  // Bulk card entries carry set codes but omit display labels; enrich only from the same export.
  const cards = data.cards.map(card => ({ ...card, setName: setNames.get(String(card.set).toUpperCase()) }));
  const normalized = normalizeCards(cards);
  if (!['riftcodex', 'riftcodex.com'].includes(data.source)
    || data.fetched && !Number.isFinite(Date.parse(data.fetched))) {
    throw new Error('RiftHunt export source or timestamp is invalid.');
  }
  return { cards, normalized, fetched: data.fetched ?? null, source: data.source };
}

export async function fetchCatalog(fetcher = fetch) {
  return (await fetchRiftHuntCatalog(fetcher)).cards;
}

export async function importCatalog(db, items) {
  const cards = normalizeCards(items); // Validate everything before the first write.
  await db.query('BEGIN');
  try {
    // Serialize imports; never delete missing cards or alter Binder ownership/prices.
    await db.query("SELECT pg_advisory_xact_lock(821409)");
    for (const [id, name] of new Map(cards.map(card => [card.setId, card.setName]))) {
      await db.query(`INSERT INTO riftbound.card_sets (id, name) VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, [id, name]);
    }
    for (const card of cards) {
      await db.query(`INSERT INTO riftbound.cards (id, set_id, name, rarity, image_url, tcg_product_id, domains, energy, card_type, rules_text, is_alt, is_overnumbered, is_signature, card_supertype)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO UPDATE SET
        set_id = EXCLUDED.set_id, name = EXCLUDED.name, rarity = EXCLUDED.rarity,
        image_url = EXCLUDED.image_url, tcg_product_id = EXCLUDED.tcg_product_id, domains = EXCLUDED.domains, energy = EXCLUDED.energy,
        card_type = COALESCE(EXCLUDED.card_type, riftbound.cards.card_type), rules_text = COALESCE(EXCLUDED.rules_text, riftbound.cards.rules_text),
        card_supertype = COALESCE(EXCLUDED.card_supertype, riftbound.cards.card_supertype),
        is_alt = riftbound.cards.is_alt OR EXCLUDED.is_alt, is_overnumbered = riftbound.cards.is_overnumbered OR EXCLUDED.is_overnumbered,
        is_signature = riftbound.cards.is_signature OR EXCLUDED.is_signature, synced_at = now()`,
      [card.id, card.setId, card.name, card.rarity, card.image, card.product, card.domains, card.energy, card.cardType, card.rulesText, card.alt, card.over, card.sig, card.cardSupertype]);
    }
    await db.query('COMMIT');
    return cards.length;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
