import { adjacentOwnedVersions, combineOwnedFinishes } from './binder.js';

export class InputError extends Error {}

export function readFilters(params) {
  for (const key of params.keys()) {
    if (!['page', 'limit', 'q', 'set', 'rarity', 'finish', 'domain', 'energy', 'owned', 'group'].includes(key) || params.getAll(key).length > 1) {
      throw new InputError('Unknown or repeated filter');
    }
  }
  const integer = (key, fallback, max) => {
    const value = params.get(key);
    if (value === null) return fallback;
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max) throw new InputError(`Invalid ${key}`);
    return Number(value);
  };
  const text = (key, max) => {
    const value = (params.get(key) ?? '').trim();
    if (value.length > max) throw new InputError(`Invalid ${key}`);
    return value;
  };
  const finish = params.get('finish') ?? '';
  if (!['', 'normal', 'foil'].includes(finish)) throw new InputError('Invalid finish');
  const domain = text('domain', 16);
  if (!['', 'Fury', 'Calm', 'Mind', 'Body', 'Chaos', 'Order', 'Colorless'].includes(domain)) throw new InputError('Invalid domain');
  const energy = text('energy', 2);
  if (energy !== '' && !/^(?:[0-9]|[1-9][0-9])$/.test(energy)) throw new InputError('Invalid energy');
  const owned = params.get('owned') ?? '';
  const group = params.get('group') ?? '';
  if (!['', 'printing'].includes(group)) throw new InputError('Invalid group');
  if (!['', 'true'].includes(owned)) throw new InputError('Invalid owned');
  return { ...(group ? { group } : {}), owned, domain, energy, page: integer('page', 1, 10000), limit: integer('limit', 24, 60),
    q: text('q', 100), set: text('set', 64), rarity: text('rarity', 64), finish };
}

export async function readCards(db, kind, filters) {
  const binder = kind === 'binder';
  const { page, limit, q, set, rarity, finish, domain, energy, owned } = filters;
  if (!binder && finish) throw new InputError('Finish applies to the Binder only');
  // strpos treats %, _, quotes, and backslashes as literal search characters.
  const where = `WHERE ($1 = '' OR strpos(lower(c.name), lower($1)) > 0)
    AND ($2 = '' OR c.set_id = $2) AND ($3 = '' OR c.rarity = $3)
    AND ($4 = '' OR $4 = ANY(c.domains))
    AND ($5 = '' OR c.energy = NULLIF($5, '')::integer)
    ${!binder && owned === 'true' ? 'AND EXISTS (SELECT 1 FROM riftbound.binder owned WHERE owned.card_id = c.id AND owned.quantity > 0)' : ''}
    ${binder ? "AND ($6 = '' OR b.is_foil = ($6 = 'foil'))" : ''}`;
  const from = `FROM riftbound.cards c JOIN riftbound.card_sets s ON s.id = c.set_id
    ${binder ? 'JOIN riftbound.binder b ON b.card_id = c.id' : ''}
    CROSS JOIN LATERAL (SELECT COALESCE(
      substring(c.image_url from '/[A-Za-z0-9]+-([0-9]+[A-Za-z]*|R[0-9]+[A-Za-z]*|T[0-9]+[A-Za-z]*|SP[0-9]+)(?:[.-])'),
      substring(upper(c.id) from '^[A-Z0-9]+-([0-9]+[A-Z]*|R[0-9]+[A-Z]*|T[0-9]+[A-Z]*|SP[0-9]+)(?:-|$)')
    ) AS collector_number) numbering`;
  const values = binder ? [q, set, rarity, domain, energy, finish] : [q, set, rarity, domain, energy];
  // Consistent total + rows even if an import commits during this request.
  await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const count = await db.query(`SELECT count(*)::int AS total ${from} ${where}`, values);
    const result = await db.query(`SELECT c.id, c.name, c.rarity, c.image_url, c.set_id, c.domains, c.energy,
      c.card_type, c.card_supertype, c.rules_text, c.is_alt, c.is_overnumbered, c.is_signature,
      s.name AS set_name, c.synced_at, p.normal_price, p.foil_price,
      to_char(p.price_date, 'YYYY-MM-DD') AS price_date,
      ${binder ? 'b.is_foil, b.quantity' : 'NULL::boolean AS is_foil, COALESCE((SELECT sum(owned.quantity)::int FROM riftbound.binder owned WHERE owned.card_id = c.id), 0) AS quantity'}
      ${from} LEFT JOIN riftbound.latest_card_prices p ON p.card_id = c.id
      ${where} ORDER BY c.set_id,
        CASE WHEN numbering.collector_number ~ '^[0-9]' THEN 0
          WHEN numbering.collector_number ~ '^R' THEN 1
          WHEN numbering.collector_number ~ '^T' THEN 2
          WHEN numbering.collector_number ~ '^SP' THEN 3 ELSE 4 END,
        substring(numbering.collector_number from '[0-9]+')::integer NULLS LAST,
        c.is_alt, c.is_signature, numbering.collector_number, c.name, c.id ${binder ? ', b.is_foil' : ''}
      ${binder ? 'LIMIT 20001' : `LIMIT $${values.length + 1} OFFSET $${values.length + 2}`}`,
    binder ? values : [...values, limit, (page - 1) * limit]);
    if (binder && result.rows.length > 20000) throw new Error('Binder exceeds supported size');
    const grouped = binder ? adjacentOwnedVersions(filters.group === 'printing' ? combineOwnedFinishes(result.rows) : result.rows) : null;
    const items = binder
      ? grouped.slice((page - 1) * limit, page * limit)
      : result.rows;
    await db.query('COMMIT');
    return { items, total: binder && filters.group === 'printing' ? grouped.length : count.rows[0].total, page, limit };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

export async function readFacets(db) {
  const sets = await db.query(`SELECT s.id, s.name, count(c.id)::int AS cards,
    count(c.id) FILTER (WHERE EXISTS (SELECT 1 FROM riftbound.binder b WHERE b.card_id=c.id))::int AS owned_cards
    FROM riftbound.card_sets s LEFT JOIN riftbound.cards c ON c.set_id=s.id GROUP BY s.id,s.name ORDER BY s.name,s.id`);
  const rarities = await db.query('SELECT DISTINCT rarity FROM riftbound.cards ORDER BY rarity');
  return { sets: sets.rows, rarities: rarities.rows.map(row => row.rarity) };
}

export async function readOwnership(db) {
  const result = await db.query(`SELECT card_id AS id, sum(quantity)::bigint::text AS quantity
    FROM riftbound.binder GROUP BY card_id ORDER BY card_id LIMIT 20001`);
  if (result.rows.length > 20000) throw new Error('Ownership export exceeds supported size');
  return { items: result.rows };
}

export async function readSetTools(db, set) {
  if (!set) throw new InputError('Choose a set');
  await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const cards = await db.query(`SELECT c.id,c.name,c.rarity,c.image_url,c.card_type,c.card_supertype,c.rules_text,c.is_alt,c.is_overnumbered,c.is_signature,
      p.normal_price,p.foil_price,to_char(p.price_date,'YYYY-MM-DD') AS price_date
      FROM riftbound.cards c LEFT JOIN riftbound.latest_card_prices p ON p.card_id=c.id
      WHERE c.set_id=$1 ORDER BY c.id LIMIT 20001`, [set]);
    if (cards.rows.length > 20000) throw new Error('Set exceeds supported size');
    const sealed = await db.query(`SELECT s.id,s.name,s.kind,s.pack_count,s.msrp,p.market_price,
      to_char(p.price_date,'YYYY-MM-DD') AS price_date
      FROM riftbound.sealed_products s LEFT JOIN riftbound.latest_sealed_prices p ON p.sealed_product_id=s.id
      WHERE s.set_id=$1 ORDER BY s.name,s.id`, [set]);
    await db.query('COMMIT');
    return { cards: cards.rows, sealed: sealed.rows };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
}

// One statement gives a consistent whole-collection snapshot. Missing finishes
// stay unpriced even when an older observation had a price for that finish.
export async function readCollectionSummary(db, date = null) {
  const result = await db.query(`WITH owned AS (
    SELECT b.card_id, b.is_foil, b.quantity, p.price_date,
      CASE WHEN b.is_foil THEN p.foil_price ELSE p.normal_price END AS price
    FROM riftbound.binder b
    LEFT JOIN LATERAL (SELECT price_date,normal_price,foil_price FROM riftbound.price_history
      WHERE card_id=b.card_id AND ($1::date IS NULL OR price_date <= $1::date)
      ORDER BY price_date DESC LIMIT 1) p ON true
  ) SELECT
    (SELECT count(*)::int FROM riftbound.cards) AS catalog_cards,
    count(DISTINCT card_id)::int AS owned_cards,
    COALESCE(sum(quantity), 0)::bigint::text AS copies,
    COALESCE(sum(quantity) FILTER (WHERE NOT is_foil), 0)::bigint::text AS normal_copies,
    COALESCE(sum(quantity) FILTER (WHERE is_foil), 0)::bigint::text AS foil_copies,
    COALESCE(sum(quantity) FILTER (WHERE price IS NOT NULL), 0)::bigint::text AS priced_copies,
    COALESCE(sum(quantity) FILTER (WHERE price IS NULL), 0)::bigint::text AS unpriced_copies,
    sum(quantity * price)::text AS value_usd,
    to_char(min(price_date) FILTER (WHERE price IS NOT NULL), 'YYYY-MM-DD') AS oldest_price_date,
    to_char(max(price_date) FILTER (WHERE price IS NOT NULL), 'YYYY-MM-DD') AS newest_price_date
    FROM owned`, [date]);
  return result.rows[0];
}

export function readValuationDate(params) {
  if ([...params.keys()].some(key => key!=='date') || params.getAll('date').length!==1) throw new InputError('Choose one valuation date');
  const date=params.get('date');
  const parsed=new Date(`${date}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date>new Date().toISOString().slice(0,10)) throw new InputError('Choose a valid past or current UTC date');
  return date;
}

export async function readHistory(db, id, filters) {
  const card = await db.query('SELECT id, name FROM riftbound.cards WHERE id = $1', [id]);
  if (!card.rows.length) return null;
  const result = await db.query(`SELECT to_char(price_date, 'YYYY-MM-DD') AS price_date,
    normal_price, foil_price, currency FROM riftbound.price_history
    WHERE card_id = $1 ORDER BY price_date DESC LIMIT $2 OFFSET $3`,
  [id, filters.limit, (filters.page - 1) * filters.limit]);
  return { card: card.rows[0], items: result.rows, page: filters.page, limit: filters.limit };
}
