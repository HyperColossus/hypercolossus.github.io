import test from 'node:test';
import assert from 'node:assert/strict';
import { breathing, GLOW_DELAY, GLOW_PERIOD } from '../src/components/powerGlow.js';

test('no glow pulse during the first 5 seconds', () => {
  for (let t = 0; t <= GLOW_DELAY; t += 0.05) assert.equal(breathing(t), 0);
});
test('the pulse starts smoothly (no jump right after the delay)', () => {
  let prev = breathing(GLOW_DELAY);
  for (let t = GLOW_DELAY; t < GLOW_DELAY + 2; t += 1 / 60) {
    const next = breathing(t + 1 / 60);
    assert.ok(Math.abs(next - prev) < 0.05, `jump of ${next - prev} at ${t.toFixed(2)}s`);
    prev = next;
  }
});
test('once running it goes fully dark and fully bright each breath', () => {
  const samples = [];
  for (let t = 10; t < 10 + GLOW_PERIOD; t += 0.01) samples.push(breathing(t));
  assert.ok(Math.min(...samples) < 0.01);
  assert.ok(Math.max(...samples) > 0.99);
  samples.forEach(v => assert.ok(v >= 0 && v <= 1));
});
