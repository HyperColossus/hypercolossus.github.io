// Writes server/riftbound/catalog-snapshot.json, the gameplay catalog bundled with the
// site Worker. Run after importing a new set, then rebuild and deploy.
//   node scripts/riftbound-catalog-snapshot.mjs                 (local Docker database)
//   node scripts/riftbound-catalog-snapshot.mjs --from-export <file>   (saved RiftHunt export)
import { readFile, writeFile, stat } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { normalizeCards } from '../server/riftbound/import.js';
import { validateCatalog } from '../server/riftbound/catalog.js';

const OUTPUT = new URL('../server/riftbound/catalog-snapshot.json', import.meta.url);

async function fromDatabase() {
  const { default: pg } = await import('pg');
  const settings = parseEnv(await readFile(new URL('../.env.riftbound.local', import.meta.url), 'utf8'));
  const password = settings.RIFTBOUND_RUNTIME_PASSWORD ?? settings.RIFTBOUND_POSTGRES_PASSWORD;
  const user = settings.RIFTBOUND_RUNTIME_PASSWORD ? 'riftbound_runtime' : 'riftbound_owner';
  const db = new pg.Client({ host: '127.0.0.1', port: 55432, database: 'riftbound_dev', user, password, connectionTimeoutMillis: 5000 });
  await db.connect();
  try {
    await db.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const cards = await db.query(`SELECT id,card_type,card_supertype,rules_text,is_alt,is_overnumbered,is_signature
      FROM riftbound.cards ORDER BY id`);
    const sealed = await db.query(`SELECT s.id,s.set_id,s.name,s.kind,s.pack_count,s.msrp,p.market_price,
      to_char(p.price_date,'YYYY-MM-DD') AS price_date
      FROM riftbound.sealed_products s LEFT JOIN riftbound.latest_sealed_prices p ON p.sealed_product_id=s.id
      ORDER BY s.set_id,s.name,s.id`);
    await db.query('COMMIT');
    return { source: 'local-database', cards: cards.rows,
      sealed: sealed.rows.map(row => ({ ...row, msrp: row.msrp === null ? null : Number(row.msrp),
        market_price: row.market_price === null ? null : Number(row.market_price) })) };
  } finally { await db.end(); }
}

async function fromExport(file) {
  if ((await stat(file)).size > 20 * 1024 * 1024) throw new Error('Export is too large');
  const data = JSON.parse(await readFile(file, 'utf8'));
  return { source: `export:${data.source ?? 'unknown'}@${data.fetched ?? 'unknown'}`,
    cards: normalizeCards(data.cards).map(card => ({ id: card.id, card_type: card.cardType, card_supertype: card.cardSupertype,
      rules_text: card.rulesText, is_alt: card.alt, is_overnumbered: card.over, is_signature: card.sig })),
    sealed: [] };
}

try {
  const args = process.argv.slice(2);
  const data = args[0] === '--from-export' && args.length === 2 ? await fromExport(args[1])
    : args.length === 0 ? await fromDatabase() : (() => { throw new Error('usage'); })();
  // Keep only cards with something worth bundling, and drop empty fields to stay small.
  const cards = data.cards
    .filter(card => card.card_type || card.card_supertype || card.rules_text || card.is_alt || card.is_overnumbered || card.is_signature)
    .map(card => Object.fromEntries(Object.entries(card).filter(([, value]) => value !== null && value !== false)));
  const snapshot = { version: 1, generated_at: new Date().toISOString(), source: data.source, cards, sealed: data.sealed };
  validateCatalog(snapshot);
  // Never replace a good snapshot with an empty or much smaller one (e.g. a fresh, unimported database).
  const previous = await readFile(OUTPUT, 'utf8').then(JSON.parse).catch(() => null);
  if (cards.length < 100 || (previous?.cards?.length && cards.length < previous.cards.length * 0.9)) {
    console.error(`Refusing to write: only ${cards.length} cards have details (current snapshot has ${previous?.cards?.length ?? 0}).`);
    console.error('If the database is new or empty, run npm run catalog:import first.');
    process.exit(1);
  }
  await writeFile(OUTPUT, JSON.stringify(snapshot) + '\n');
  console.log(`Wrote catalog snapshot: ${cards.length} cards with gameplay details, ${data.sealed.length} sealed products (${data.source}).`);
  console.log('Rebuild and deploy the site to publish it.');
} catch (error) {
  console.error(error.message === 'usage'
    ? 'Usage: node scripts/riftbound-catalog-snapshot.mjs [--from-export <file>]'
    : 'Catalog snapshot failed. Start the local database (npm run db:up) or pass a complete saved export. The existing snapshot was not changed.');
  process.exitCode = 1;
}
