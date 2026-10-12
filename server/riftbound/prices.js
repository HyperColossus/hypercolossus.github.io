const TCG_API = 'https://api.tcgapi.dev/v1';
const RIFTBOUND_GAME = 'riftbound-league-of-legends-trading-card-game';
const PAGE_SIZE = 100;
const MAX_SYNC_REQUESTS = 80;

function safeNumber(value, label) {
  if (!Number.isSafeInteger(Number(value)) || Number(value) < 0) throw new Error(`TCG API returned an invalid ${label}.`);
  return Number(value);
}

function normalizeSetName(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function localSetNames(name) {
  return String(name).split(':').map(normalizeSetName).filter(Boolean);
}

async function requestJson(url, apiKey, fetcher, requestState) {
  requestState.signal?.throwIfAborted();
  await requestState.beforeRequest?.();
  let response;
  try {
    response = await fetcher(url, {
      headers: { Accept: 'application/json', 'X-API-Key': apiKey },
      signal: requestState.signal ? AbortSignal.any([requestState.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error('TCG API request failed before a response was received.');
  }
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`TCG API returned HTTP ${response.status} or a non-JSON response.`);
  }
  try { return await response.json(); }
  catch { throw new Error('TCG API returned invalid JSON.'); }
}

function validatePage(body, page, label) {
  if (!Array.isArray(body.data) || !body.meta || body.meta.page !== page
    || !Number.isSafeInteger(body.meta.total) || body.meta.total < 0
    || typeof body.meta.has_more !== 'boolean') {
    throw new Error(`TCG API returned an invalid ${label} page.`);
  }
  return body;
}

async function getAllSets(apiKey, fetcher, requestState) {
  const sets = [];
  let page = 1;
  let total = null;
  while (true) {
    if (++requestState.count > requestState.budget) throw new Error('Price sync would exceed its safe daily request budget.');
    const url = `${TCG_API}/sets?game=${RIFTBOUND_GAME}&per_page=${PAGE_SIZE}&page=${page}`;
    const body = validatePage(await requestJson(url, apiKey, fetcher, requestState), page, 'set');
    if (Number.isSafeInteger(body.rate_limit?.daily_remaining) && body.rate_limit.daily_remaining >= 0) {
      requestState.dailyRemaining = body.rate_limit.daily_remaining;
    }
    total ??= body.meta.total;
    if (body.meta.total !== total) throw new Error('TCG API set count changed during sync.');
    sets.push(...body.data);
    if (!body.meta.has_more) break;
    if (!body.data.length || page > 1000) throw new Error('TCG API set pagination did not advance.');
    page++;
  }
  if (sets.length !== total) throw new Error('TCG API returned an incomplete set list.');
  return sets;
}

async function getSetCards(setId, apiKey, fetcher, requestState) {
  const cards = [];
  let page = 1;
  let total = null;
  while (true) {
    if (++requestState.count > requestState.budget) throw new Error('Price sync would exceed its safe daily request budget.');
    const url = `${TCG_API}/sets/${encodeURIComponent(setId)}/cards?per_page=${PAGE_SIZE}&page=${page}`;
    const body = validatePage(await requestJson(url, apiKey, fetcher, requestState), page, 'card');
    total ??= body.meta.total;
    if (body.meta.total !== total) throw new Error(`TCG API card count changed during set ${setId}.`);
    cards.push(...body.data);
    if (!body.meta.has_more) break;
    if (!body.data.length || page > 1000) throw new Error(`TCG API pagination did not advance for set ${setId}.`);
    page++;
  }
  if (cards.length !== total) throw new Error(`TCG API returned an incomplete card list for set ${setId}.`);
  return cards;
}

function pricePrinting(record) {
  const printing = String(record.printing ?? '').trim().toLowerCase();
  if (printing === 'normal') return 'normal';
  if (printing.includes('foil') || printing === 'holo') return 'foil';
  throw new Error('TCG API returned an unsupported Riftbound printing.');
}

function utcDate(now) {
  const date = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid price observation date.');
  return date.toISOString().slice(0, 10);
}

/** Fetches set pages (rather than one request per product) and appends today's price snapshot. */
export async function syncRiftboundPrices(db, apiKey, { fetcher = fetch, now = new Date(), beforeRequest, requestBudget = MAX_SYNC_REQUESTS, signal } = {}) {
  if (typeof apiKey !== 'string' || !/^tcg_live_[a-zA-Z0-9]+$/.test(apiKey)) {
    throw new Error('Missing or invalid TCG_API_KEY.');
  }
  const localResult = await db.query(`SELECT c.id, c.set_id, s.name AS set_name, c.tcg_product_id
    FROM riftbound.cards c JOIN riftbound.card_sets s ON s.id = c.set_id
    WHERE c.tcg_product_id IS NOT NULL`);
  if (!localResult.rows.length) throw new Error('Import the RiftHunt catalog before syncing prices.');

  const localSets = new Set(localResult.rows.flatMap(row => localSetNames(row.set_name)));
  if (!Number.isInteger(requestBudget) || requestBudget < 1 || requestBudget > MAX_SYNC_REQUESTS) throw new Error('Invalid request budget');
  const requestState = { count: 0, budget: requestBudget, beforeRequest, signal };
  const allSets = await getAllSets(apiKey, fetcher, requestState);
  const matchedSets = allSets.filter(set => localSets.has(normalizeSetName(set.name)));
  if (!matchedSets.length) throw new Error('No TCG API sets matched the imported RiftHunt catalog.');

  // Avoid starting a sync whose known page count already exceeds the service's free-tier budget.
  const estimatedRequests = requestState.count + matchedSets.reduce((count, set) => {
    const cardCount = safeNumber(set.card_count, 'set card count');
    return count + Math.max(1, Math.ceil(cardCount / PAGE_SIZE));
  }, 0);
  if (estimatedRequests > requestBudget) throw new Error('Price sync would exceed its safe daily request budget.');
  if (requestState.dailyRemaining !== undefined
    && estimatedRequests - requestState.count > requestState.dailyRemaining) {
    throw new Error('TCG API daily request allowance is too low for a complete price sync.');
  }
  const products = new Map();
  for (const row of localResult.rows) {
    const productId = String(row.tcg_product_id);
    if (!/^\d+$/.test(productId)) throw new Error('Catalog contains an invalid TCGPlayer product ID.');
    const cards = products.get(productId) ?? [];
    cards.push(row.id);
    products.set(productId, cards);
  }

  const pricesByCard = new Map();
  for (const set of matchedSets) {
    const records = await getSetCards(set.id, apiKey, fetcher, requestState);
    for (const record of records) {
      const productId = String(record.tcgplayer_id ?? '');
      const mappedCards = products.get(productId);
      if (!mappedCards) continue;
      if (record.market_price === null || record.market_price === undefined) continue;
      const amount = Number(record.market_price);
      if (!Number.isFinite(amount) || amount < 0 || amount >= 10000000000) {
        throw new Error('TCG API returned an invalid market price.');
      }
      const finish = pricePrinting(record);
      for (const cardId of mappedCards) {
        const cardPrices = pricesByCard.get(cardId) ?? { normal: null, foil: null };
        if (cardPrices[finish] !== null && cardPrices[finish] !== amount) {
          throw new Error('TCG API returned conflicting prices for a RiftHunt printing.');
        }
        cardPrices[finish] = amount;
        pricesByCard.set(cardId, cardPrices);
      }
    }
  }

  const date = utcDate(now);
  const rows = [...pricesByCard].filter(([, prices]) => prices.normal !== null || prices.foil !== null);
  if (!rows.length) throw new Error('TCG API returned no prices matching the imported RiftHunt catalog.');

  await db.query('BEGIN');
  try {
    await db.query('SELECT pg_advisory_xact_lock(821410)');
    let inserted = 0;
    for (let offset = 0; offset < rows.length; offset += 100) {
      const batch = rows.slice(offset, offset + 100);
      const values = [];
      const placeholders = batch.map(([cardId, prices], index) => {
        const base = index * 4;
        values.push(cardId, date, prices.normal, prices.foil);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      });
      const result = await db.query(`INSERT INTO riftbound.price_history
        (card_id, price_date, normal_price, foil_price) VALUES ${placeholders.join(',')}
        ON CONFLICT (card_id, price_date) DO NOTHING`, values);
      inserted += result.rowCount;
    }
    await db.query('COMMIT');
    return { date, matchedSets: matchedSets.length, products: products.size, pricedCards: rows.length, inserted, requests: requestState.count };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
