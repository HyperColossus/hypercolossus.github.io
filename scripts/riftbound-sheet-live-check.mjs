import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createSheetReader } from '../server/riftbound/sheet.js';
import { createWorker } from '../server/index.js';

const credentialPath = process.argv[2];
if (!credentialPath) throw new Error('Supply the service-account credential file path.');
const secret = await fs.readFile(credentialPath, 'utf8');
const env = {
  RIFTBOUND_SHEET_ENABLED: 'true',
  RIFTBOUND_SHEET_ID: '1pytSoSo9Tu1wfW8RnvIIaIZu5CQyVPYVQM3mk3TfF2g',
  GOOGLE_SERVICE_ACCOUNT_JSON: secret,
};
let now = Date.now(), googleReads = 0;
const reader = createSheetReader({ clock: () => now, fetcher: (url, options) => {
  if (String(url).startsWith('https://sheets.googleapis.com/')) googleReads++;
  return fetch(url, options);
} });
const worker = createWorker({ sheetReader: reader, database: () => { throw new Error('Database should not be accessed'); } });
async function get(route) {
  const response = await worker.fetch(new Request(`https://site.test/api/riftbound/${route}`), env);
  assert.equal(response.status, 200, `${route} unavailable; check Google Sheets API and sharing`);
  return response.json();
}
// Authorize and read directly first; never print credentials or OAuth tokens.
await reader(env);
const summary = await get('summary');
assert.equal(summary.source, 'google-sheet');
assert.equal((await get('health')).status, 'ready');
const ownership = await get('ownership');
assert.equal(ownership.items.reduce((n, c) => n + Number(c.quantity), 0), Number(summary.copies));
await get('catalog?owned=true&set=OGN');
await get('binder?finish=foil&set=UNL');
await get('facets');
assert.equal(googleReads, 1);
// Advance only the injected cache clock to verify a second real Google read.
now += 61000;
await get('summary');
assert.equal(googleReads, 2);
if (process.argv.includes('--configure-local')) {
  const credentials = JSON.parse(secret);
  const compact = JSON.stringify(credentials);
  if (compact.includes("'")) throw new Error('Credential cannot be represented in local environment format');
  const content = `RIFTBOUND_SHEET_ENABLED="true"\nRIFTBOUND_SHEET_ID="${env.RIFTBOUND_SHEET_ID}"\nGOOGLE_SERVICE_ACCOUNT_JSON='${compact}'\n`;
  await fs.writeFile('.dev.vars', content, { mode: 0o600 });
}
console.log(JSON.stringify({ status: 'passed', authenticated: true, cache_refresh_google_reads: googleReads, local_configured: process.argv.includes('--configure-local'), summary }, null, 2));
