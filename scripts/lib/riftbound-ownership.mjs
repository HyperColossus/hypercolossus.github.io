import { createHash } from 'node:crypto';

export class OwnershipError extends Error {}
const fail = message => { throw new OwnershipError(message); };
const required = ['Card ID', 'Normal owned', 'Foil owned'];

export function readOwnershipWorkbook(workbook) {
  const records = [];
  const seen = new Set();
  for (const { sheet: name, data } of workbook) {
    const sheet = { name, rowCount: data.length };
    let headers;
    let headerRow;
    for (let row = 1; row <= Math.min(sheet.rowCount, 25); row++) {
      const cells = data[row - 1] ?? [];
      if (required.every(label => cells.includes(label))) {
        headers = required.map(label => {
          if (cells.filter(value => value === label).length !== 1) fail(`${sheet.name}: repeated ${label} header`);
          return cells.indexOf(label);
        });
        headerRow = row;
        break;
      }
    }
    if (!headers) fail(`${sheet.name}: missing Card ID, Normal owned or Foil owned headers`);
    if (sheet.rowCount > 20025) fail(`${sheet.name}: too many rows`);
    for (let row = headerRow + 1; row <= sheet.rowCount; row++) {
      const [id, normal, foil] = headers.map(col => data[row - 1]?.[col]);
      const blank = value => value === null || value === undefined || value === '';
      if ([id, normal, foil].every(blank)) continue;
      const at = `${sheet.name} row ${row}`;
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_:-]{1,100}$/.test(id.trim())) fail(`${at}: invalid Card ID`);
      const key = id.trim();
      if (seen.has(key)) fail(`${at}: duplicate Card ID ${key}`);
      seen.add(key);
      const quantity = (value, finish) => {
        if (blank(value)) return null; // Blank means leave this finish unchanged.
        if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) fail(`${at}: ${finish} must be a literal whole number, not a formula`);
        const n = Number(value);
        if (!Number.isSafeInteger(n) || n < 0 || n > 999999) fail(`${at}: ${finish} must be between 0 and 999999`);
        return n;
      };
      records.push({ id: key, sheet: sheet.name, row, normal: quantity(normal, 'Normal owned'), foil: quantity(foil, 'Foil owned') });
    }
  }
  if (!records.length || records.length > 20000) fail('Workbook must contain 1–20000 card rows');
  return records;
}

export function planOwnership(records, cards, holdings, fileHash) {
  const catalog = new Map(cards.map(card => [card.id, card]));
  const current = new Map(holdings.map(row => [`${row.card_id}:${row.is_foil}`, row.quantity]));
  const changes = [];
  for (const row of records) {
    const card = catalog.get(row.id);
    if (!card) fail(`${row.sheet} row ${row.row}: unknown Card ID ${row.id}`);
    if (![card.set_id, card.set_name].includes(row.sheet)) fail(`${row.sheet} row ${row.row}: card belongs to ${card.set_id}`);
    for (const [is_foil, quantity] of [[false, row.normal], [true, row.foil]]) {
      if (quantity === null) continue;
      const previous = current.get(`${row.id}:${is_foil}`) ?? 0;
      if (quantity !== previous) changes.push({ card_id: row.id, name: card.name, set: card.set_id, is_foil, previous, quantity });
    }
  }
  changes.sort((a, b) => a.card_id.localeCompare(b.card_id) || Number(a.is_foil) - Number(b.is_foil));
  const snapshot = [...holdings].sort((a, b) => a.card_id.localeCompare(b.card_id) || Number(a.is_foil) - Number(b.is_foil));
  const token = createHash('sha256').update(JSON.stringify({ fileHash, snapshot, changes })).digest('hex');
  return { token, changes, holdings: snapshot };
}

export async function writeOwnership(db, changes) {
  for (const change of changes) {
    if (change.quantity === 0) {
      await db.query('DELETE FROM riftbound.binder WHERE card_id=$1 AND is_foil=$2', [change.card_id, change.is_foil]);
    } else {
      await db.query(`INSERT INTO riftbound.binder (card_id,is_foil,quantity) VALUES ($1,$2,$3)
        ON CONFLICT (card_id,is_foil) DO UPDATE SET quantity=EXCLUDED.quantity`, [change.card_id, change.is_foil, change.quantity]);
    }
  }
}
