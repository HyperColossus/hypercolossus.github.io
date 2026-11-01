import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../server/index.js';
import { checkDatabase } from '../server/database.js';

const request = (path, method = 'GET') => new Request(`https://example.test${path}`, { method });

test('static and SPA requests go to assets without checking the database', async () => {
  const worker = createWorker({ databaseReady: () => assert.fail('Unexpected database query') });
  for (const path of ['/', '/admin', '/assets/main.js', '/apiary']) {
    const response = await worker.fetch(request(path), {
      ASSETS: { fetch: req => new Response(new URL(req.url).pathname) },
    });
    assert.equal(await response.text(), path);
  }
});

test('all unknown API paths return JSON 404s, never the SPA', async () => {
  const worker = createWorker({ databaseReady: () => assert.fail('Unexpected database query') });
  for (const path of ['/api', '/api/nope', '/api/riftbound/nope', '/api/riftbound/health/']) {
    const response = await worker.fetch(request(path), {});
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('health reflects database readiness and strips error details', async () => {
  for (const [databaseReady, status, body] of [
    [async () => true, 200, { status: 'ready' }],
    [async () => false, 503, { status: 'unavailable' }],
    [async () => { throw new Error('postgres://secret'); }, 503, { status: 'unavailable' }],
  ]) {
    const worker = createWorker({ databaseReady });
    const response = await worker.fetch(request('/api/riftbound/health'), {});
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), body);
    const head = await worker.fetch(request('/api/riftbound/health', 'HEAD'), {});
    assert.equal(head.status, status);
    assert.equal(await head.text(), '');
  }
});

test('health rejects writes without querying the database', async () => {
  const worker = createWorker({ databaseReady: () => assert.fail('Unexpected database query') });
  const response = await worker.fetch(request('/api/riftbound/health', 'POST'), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});

test('unconfigured database fails closed', async () => {
  assert.equal(await checkDatabase({}), false);
});
