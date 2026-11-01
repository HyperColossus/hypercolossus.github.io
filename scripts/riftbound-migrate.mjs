import { readFile } from 'node:fs/promises';
import pg from 'pg';

// Operator-only: never imported by the Worker or the Vite client.
if (!process.env.RIFTBOUND_MIGRATION_DATABASE_URL) {
  console.error('Set RIFTBOUND_MIGRATION_DATABASE_URL to the isolated development database.');
  process.exitCode = 1;
} else {
  const client = new pg.Client({
    connectionString: process.env.RIFTBOUND_MIGRATION_DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    for (const path of ['001_initial.sql', '002_allow_shared_tcg_products.sql', '003_card_gameplay.sql', '004_admin_and_sync.sql', '005_card_details.sql', '006_sync_limits.sql']) {
      await client.query(await readFile(new URL(`../db/riftbound/${path}`, import.meta.url), 'utf8'));
    }
    console.log('Riftbound migrations applied. Configure runtime grants before connecting the Worker.');
  } catch (error) {
    // Only a PostgreSQL error code is safe to print; connection errors may contain credentials.
    const code = /^[0-9A-Z]{5}$/.test(error.code ?? '') ? ` (${error.code})` : '';
    console.error(`Migration failed${code}. Verify connectivity, privileges, and whether the schema already exists.`);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
