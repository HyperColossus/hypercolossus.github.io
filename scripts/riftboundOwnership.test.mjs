import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { zipSync, strToU8 } from 'fflate';
import { PGlite } from '@electric-sql/pglite';
import { readOwnershipWorkbook, planOwnership, writeOwnership } from './lib/riftbound-ownership.mjs';
import { readOwnershipBytes } from './riftbound-ownership-import.mjs';

const sheet = rows => [{ sheet: 'OGN', data: [['Title'], ['Foil owned', 'Card ID', 'Normal owned'], ...rows] }];
const catalog = [{ id: 'a', name: 'Alpha', set_id: 'OGN', set_name: 'Origins' }];
test('Ownership import uses headers and IDs, distinguishes blank, zero and separate finishes', () => {
  const records = readOwnershipWorkbook(sheet([[3, 'a', null]]));
  const plan = planOwnership(records, catalog, [{ card_id: 'a', is_foil: false, quantity: 4 }], 'file');
  assert.deepEqual(plan.changes.map(c => [c.is_foil, c.quantity]), [[true, 3]]);
  const zero = planOwnership(readOwnershipWorkbook(sheet([[null, 'a', 0]])), catalog, [{ card_id: 'a', is_foil: false, quantity: 4 }], 'file');
  assert.equal(zero.changes[0].quantity, 0);
});
test('Invalid counts, duplicates, unknown IDs and wrong sets fail before writes', () => {
  for (const value of [-1, 1.5, '2.0', 'abc', true, { formula: '1+1', result: 2 }, 1000000]) assert.throws(() => readOwnershipWorkbook(sheet([[value, 'a', 0]])));
  assert.throws(() => readOwnershipWorkbook(sheet([[0, 'a', 1], [1, 'a', 0]])), /duplicate/);
  assert.throws(() => readOwnershipWorkbook([{ sheet: 'OGN', data: [['Card ID', 'Normal owned']] }]), /headers/);
  assert.throws(() => planOwnership(readOwnershipWorkbook(sheet([[0, 'missing', 0]])), catalog, [], 'file'), /unknown/);
  assert.throws(() => planOwnership([{ id: 'a', sheet: 'SFD', row: 2, normal: 1, foil: 0 }], catalog, [], 'file'), /belongs/);
});
test('Preview token changes when workbook bytes or current ownership change', () => {
  const rows = readOwnershipWorkbook(sheet([[0, 'a', 2]]));
  const token = planOwnership(rows, catalog, [], 'file').token;
  assert.notEqual(token, planOwnership(rows, catalog, [], 'edited file').token);
  assert.notEqual(token, planOwnership(rows, catalog, [{ card_id: 'a', is_foil: true, quantity: 1 }], 'file').token);
});
test('Formula cells are rejected even when they have cached numeric results', async () => {
  for (const formula of ['<f>1+1</f><v>2</v>', '<x:f/><x:v>2</x:v>']) {
    const bytes = zipSync({ 'xl/worksheets/sheet1.xml': strToU8(`<worksheet><c>${formula}</c></worksheet>`) });
    await assert.rejects(readOwnershipBytes(Buffer.from(bytes)), /formulas/);
  }
});
test('Transactional ownership writes set exact counts, remove zero, preserve omitted holdings and roll back failures', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL('../db/riftbound/001_initial.sql', import.meta.url), 'utf8'));
    await db.exec("INSERT INTO riftbound.card_sets VALUES ('OGN','Origins'); INSERT INTO riftbound.cards (id,set_id,name,rarity) VALUES ('a','OGN','Alpha','Common'),('b','OGN','Beta','Rare'); INSERT INTO riftbound.binder VALUES ('a',false,2),('b',true,4)");
    await db.query('BEGIN');
    await writeOwnership(db, [{ card_id: 'a', is_foil: false, quantity: 0 }, { card_id: 'a', is_foil: true, quantity: 3 }]);
    await db.query('COMMIT');
    assert.deepEqual((await db.query('SELECT * FROM riftbound.binder ORDER BY card_id')).rows, [{ card_id: 'a', is_foil: true, quantity: 3 }, { card_id: 'b', is_foil: true, quantity: 4 }]);
    await db.query('BEGIN');
    await assert.rejects(writeOwnership(db, [{ card_id: 'a', is_foil: true, quantity: 9 }, { card_id: 'missing', is_foil: true, quantity: 1 }]));
    await db.query('ROLLBACK');
    assert.equal((await db.query("SELECT quantity FROM riftbound.binder WHERE card_id='a'")).rows[0].quantity, 3);
  } finally { await db.close(); }
});
