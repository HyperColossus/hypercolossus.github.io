import pg from 'pg';

// Per-request clients: Hyperdrive owns connection pooling in production.
export async function checkDatabase(env) {
  if (!env.HYPERDRIVE?.connectionString) return false;
  return withDatabase(env, async client => {
    await client.query(`SELECT 1 FROM riftbound.card_sets, riftbound.cards, riftbound.binder,
      riftbound.sealed_products, riftbound.price_history,
      riftbound.latest_card_prices, riftbound.latest_sealed_prices LIMIT 0`);
    return true;
  });
}

export async function withDatabase(env, operation) {
  const connectionString = env.HYPERDRIVE?.connectionString;
  if (!connectionString) throw new Error('Database unavailable');

  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
    statement_timeout: 5000,
  });
  try {
    await client.connect();
    return await operation(client);
  } finally {
    await client.end();
  }
}
