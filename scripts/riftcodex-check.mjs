import { fetchRiftHuntCatalog } from '../server/riftbound/import.js';

// One public request; no database credentials, writes, cookies, or challenge retries.
console.log(`RiftHunt catalog check at ${new Date().toISOString()}`);
console.log('Endpoint: https://api.rifthunt.com/bulk/cards');
try {
  const data = await fetchRiftHuntCatalog();
  console.log(`API reachable; validated ${data.normalized.length} cards across ${new Set(data.normalized.map(card => card.setId)).size} sets. Export fetched ${data.fetched}. Run npm run catalog:import to import them.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
