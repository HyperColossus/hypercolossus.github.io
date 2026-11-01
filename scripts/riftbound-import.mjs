import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { fetchRiftHuntCatalog, importCatalog } from '../server/riftbound/import.js';
import { fetchDotggCatalog, reconcileDotggCards } from '../server/riftbound/dotgg.js';

try {
  const args = process.argv.slice(2);
  const dotgg = args.length === 2 && args[0] === '--source' && args[1] === 'dotgg';
  if (args.length && !dotgg && (args.length !== 2 || args[0] !== '--file')) throw new Error('Invalid arguments');
  let items;
  let sourceMetadata = null;
  if (args.length && !dotgg) {
    const data = JSON.parse(await readFile(args[1], 'utf8'));
    if (Array.isArray(data.cards)) {
      items = data.cards;
      sourceMetadata = { fetched: data.fetched ?? null, source: data.source ?? null };
    } else if (Array.isArray(data.items) && data.total === data.items.length) items = data.items;
    else throw new Error('Incomplete export');
  } else {
    try {
      const catalog = await (dotgg ? fetchDotggCatalog() : fetchRiftHuntCatalog());
      items = catalog.cards;
      sourceMetadata = { fetched: catalog.fetched, source: catalog.source };
    } catch (error) { console.error(`Catalog download failed: ${error.message}`); process.exitCode = 1; }
  }
  if (items) {
    const local = parseEnv(await readFile(new URL('../.env.riftbound.local', import.meta.url), 'utf8'));
    if (!/^[a-f0-9]{64}$/.test(local.RIFTBOUND_POSTGRES_PASSWORD ?? '')) throw new Error('Missing local credentials');
    const client = new pg.Client({ connectionString: `postgresql://riftbound_owner:${local.RIFTBOUND_POSTGRES_PASSWORD}@127.0.0.1:55432/riftbound_dev`, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      if (dotgg) {
        const existing = await client.query('SELECT c.id, c.name, c.set_id, c.tcg_product_id, s.name AS set_name FROM riftbound.cards c JOIN riftbound.card_sets s ON s.id = c.set_id');
        const reconciled = reconcileDotggCards(items, existing.rows);
        items = reconciled.cards;
        console.log(`Skipped ${reconciled.skipped} ambiguous or unmatched existing printings.`);
      }
      const count = await importCatalog(client, items);
      console.log(`Imported ${count} Catalog cards${sourceMetadata?.fetched ? ` from the ${sourceMetadata.source} export fetched ${sourceMetadata.fetched}` : ''}. Binder and price history were preserved.`);
    } finally { await client.end(); }
  }
} catch {
  console.error('Catalog import failed. Use no arguments, --source dotgg, or --file <complete-provider-export.json>; check Docker and local credentials. No partial import was committed.');
  process.exitCode = 1;
}
