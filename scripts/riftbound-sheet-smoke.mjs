import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { parseInventorySheet } from '../server/riftbound/sheet.js';
import { createWorker } from '../server/index.js';

// A connector export tests real inventory through the production API without credentials.
// This preview is a snapshot; service-account authorization must be tested separately.
const file = process.argv.find(a => a.endsWith('.json'));
if (!file) throw new Error('Supply a bounded Google Sheets cell export JSON file.');
const document = JSON.parse(await fs.readFile(file, 'utf8'));
const snapshot = parseInventorySheet(document);
const worker = createWorker({ sheetReader: async () => snapshot, database: () => { throw new Error('Snapshot preview has no gameplay database'); } });
const env = { RIFTBOUND_SHEET_ENABLED: 'true' };
const get = async route => {
  const response = await worker.fetch(new Request(`http://localhost/api/riftbound/${route}`), env);
  assert.equal(response.status, 200, route);
  return response.json();
};
const summary = await get('summary');
const ownership = await get('ownership');
assert.equal(ownership.items.reduce((n, c) => n + Number(c.quantity), 0), Number(summary.copies));
let binderCopies = 0;
for (let page = 1; ; page++) {
  const result = await get(`binder?limit=60&page=${page}`);
  binderCopies += result.items.reduce((n, c) => n + c.quantity, 0);
  if (page * result.limit >= result.total) break;
}
assert.equal(binderCopies, Number(summary.copies));
for (const [set, number, foil] of [['OGN','119a',true],['OGN','98',true],['SFD','214',true],['UNL','10',true],['UNL','96',false],['SFD','T03',false],['UNL','T04x',false],['UNL','T05x',false]]) {
  const card = snapshot.cards.find(c => c.set_id === set && c.collector_number === number);
  assert.ok(card, `${set} ${number}`);
  assert.ok(card[foil ? 'foil_owned' : 'normal_owned'] > 0, `${set} ${number} finish`);
}
assert.equal(snapshot.cards.filter(c => c.name.includes('(Oversized)') && c.normal_owned > 0).length, 4);
assert.ok(snapshot.cards.some(c => c.id === 'inventory:VEN-shadow-clone-empowered' && c.quantity === 4));
await get('health');
await get('facets');
await get('catalog?owned=true&set=OGN');
console.log(JSON.stringify({ checked: 'real sheet snapshot through website API', ...summary }, null, 2));

if (process.argv.includes('--serve')) {
  const root = path.resolve('dist');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1:8091');
      if (url.pathname.startsWith('/api/')) {
        const result = await worker.fetch(new Request(url), env);
        response.writeHead(result.status, Object.fromEntries(result.headers));
        response.end(await result.text());
        return;
      }
      let target = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!target.startsWith(root + path.sep) && target !== root) { response.writeHead(403); response.end(); return; }
      let bytes;
      try { bytes = await fs.readFile(target); }
      catch { target = path.join(root, 'index.html'); bytes = await fs.readFile(target); }
      response.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream' });
      response.end(bytes);
    } catch { response.writeHead(500); response.end('Preview unavailable'); }
  }).listen(8091, '127.0.0.1', () => console.log('Snapshot preview: http://127.0.0.1:8091/riftbound'));
}
