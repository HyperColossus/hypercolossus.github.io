import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import readExcelFile from 'read-excel-file/node';
import { unzipSync, strFromU8 } from 'fflate';
import pg from 'pg';
import { OwnershipError, readOwnershipWorkbook, planOwnership, writeOwnership } from './lib/riftbound-ownership.mjs';

export async function readOwnershipBytes(bytes) {
  let expanded = 0;
  const files = unzipSync(bytes, { filter: file => {
    expanded += file.originalSize;
    if (expanded > 100 * 1024 * 1024) throw new OwnershipError('Workbook contents exceed 100 MB');
    return /^xl\/worksheets\/[^/]+\.xml$/.test(file.name);
  } });
  for (const xml of Object.values(files)) {
    if (/<(?:[\w-]+:)?f(?:\s|\/?>)/.test(strFromU8(xml))) throw new OwnershipError('Use literal ownership numbers. Workbooks containing formulas are not supported');
  }
  const workbook = await readExcelFile(bytes);
  return readOwnershipWorkbook(workbook);
}

export async function importOwnership(args) {
  if (![1, 3].includes(args.length) || (args.length === 3 && (args[1] !== '--apply' || !/^[a-f0-9]{64}$/.test(args[2])))) throw new OwnershipError('Usage: node scripts/riftbound-ownership-import.mjs <workbook.xlsx> [--apply <preview-token>]');
  const path = resolve(args[0]);
  if (!/\.xlsx$/i.test(path) || (await stat(path)).size > 20 * 1024 * 1024) throw new OwnershipError('Use an .xlsx workbook no larger than 20 MB');
  const bytes = await readFile(path);
  const records = await readOwnershipBytes(bytes);
  const fileHash = createHash('sha256').update(bytes).digest('hex');
  const env = parseEnv(await readFile(new URL('../.env.riftbound.local', import.meta.url), 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(env.RIFTBOUND_POSTGRES_PASSWORD ?? '')) throw new OwnershipError('Local database credentials are missing or invalid');
  const db = new pg.Client({ host: '127.0.0.1', port: 55432, database: 'riftbound_dev', user: 'riftbound_owner', password: env.RIFTBOUND_POSTGRES_PASSWORD, connectionTimeoutMillis: 5000 });
  const apply = args.length === 3;
  try {
    await db.connect();
    await db.query(apply ? 'BEGIN' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    if (apply) await db.query('LOCK TABLE riftbound.binder IN SHARE ROW EXCLUSIVE MODE');
    const cards = (await db.query('SELECT c.id,c.name,c.set_id,s.name AS set_name FROM riftbound.cards c JOIN riftbound.card_sets s ON s.id=c.set_id')).rows;
    const holdings = (await db.query('SELECT card_id,is_foil,quantity FROM riftbound.binder')).rows;
    const plan = planOwnership(records, cards, holdings, fileHash);
    if (apply && args[2] !== plan.token) throw new OwnershipError('Workbook or database changed since the preview. Run a new preview before applying');
    console.log(`Validated ${records.length} card rows. ${plan.changes.length} finish quantities will change.`);
    console.table(plan.changes.map(c => ({ Set: c.set, Card: c.name, ID: c.card_id, Finish: c.is_foil ? 'Foil' : 'Normal', Before: c.previous, After: c.quantity })));
    if (apply && plan.changes.length) {
      const backupDir = new URL('../backups/riftbound/', import.meta.url);
      await mkdir(backupDir, { recursive: true });
      const backup = new URL(`ownership-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.json`, backupDir);
      await writeFile(backup, JSON.stringify({ version: 1, created: new Date().toISOString(), holdings: plan.holdings }, null, 2), { flag: 'wx', mode: 0o600 });
      await writeOwnership(db, plan.changes);
      await db.query('COMMIT');
      console.log('Ownership changes saved. Previous holdings backed up in backups/riftbound. Refresh the collection.');
    } else {
      await db.query('ROLLBACK');
      if (apply) console.log('No ownership changes needed.');
      else console.log(`Preview only; no data changed. To save this exact preview, rerun with --apply ${plan.token}`);
    }
    return plan;
  } catch (error) {
    await db.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { await db.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  importOwnership(process.argv.slice(2)).catch(error => {
    console.error(error instanceof OwnershipError ? error.message : 'Ownership import failed. Check the workbook and local database. No partial changes were saved.');
    process.exitCode = 1;
  });
}
