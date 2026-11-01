import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../server/index.js';

test('Removed owner endpoints cannot read or mutate the database', async () => {
  const worker = createWorker({ database: () => { throw new Error('Unexpected database access'); } });
  for (const route of ['login', 'logout', 'session', 'binder']) {
    for (const method of ['GET', 'POST']) {
      const response = await worker.fetch(new Request(`https://test/api/riftbound/admin/${route}`, { method }), {});
      assert.equal(response.status, 404);
    }
  }
});
