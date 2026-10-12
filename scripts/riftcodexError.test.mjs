import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchCatalog } from '../server/riftbound/import.js';

test('RiftHunt failures report the provider without exposing HTML or retrying', async () => {
  let calls = 0;
  await assert.rejects(fetchCatalog(async () => {
    calls++;
    return new Response('<html>Just a moment...</html>', { status: 403,
      headers: { 'content-type': 'text/html' } });
  }), error => {
    assert.match(error.message, /RiftHunt returned HTTP 403/);
    assert.doesNotMatch(error.message, /<html>/);
    return true;
  });
  assert.equal(calls, 1);
});
