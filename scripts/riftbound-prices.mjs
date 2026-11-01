import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import pg from 'pg';
import { syncRiftboundPrices } from '../server/riftbound/prices.js';

let client;
try {
  const local = parseEnv(await readFile(new URL('../.env.riftbound.local', import.meta.url), 'utf8'));
  const apiKey = process.env.TCG_API_KEY ?? local.TCG_API_KEY;
  if (!/^[a-f0-9]{64}$/.test(local.RIFTBOUND_POSTGRES_PASSWORD ?? '')) throw new Error('Local database credentials are missing.');
  if (!apiKey) throw new Error('TCG_API_KEY is missing.');
  client = new pg.Client({
    connectionString: `postgresql://riftbound_owner:${local.RIFTBOUND_POSTGRES_PASSWORD}@127.0.0.1:55432/riftbound_dev`,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  const result = await syncRiftboundPrices(client, apiKey);
  console.log(`Price sync saved ${result.inserted} observations for ${result.pricedCards} cards on ${result.date}; ${result.matchedSets} sets, ${result.requests} API requests.`);
} catch (error) {
  const safe = new Set([
    'Local database credentials are missing.', 'TCG_API_KEY is missing.',
    'Missing or invalid TCG_API_KEY.', 'Import the RiftHunt catalog before syncing prices.',
    'No TCG API sets matched the imported RiftHunt catalog.',
    'Price sync would exceed its safe daily request budget.',
    'TCG API returned no prices matching the imported RiftHunt catalog.',
  ]);
  console.error(safe.has(error.message) ? error.message : 'Price sync failed. Check local services and provider availability.');
  process.exitCode = 1;
} finally {
  await client?.end();
}
