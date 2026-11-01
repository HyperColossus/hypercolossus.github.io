// Daily check (Windows Task Scheduler, see install-catalog-watch.cmd): when RiftHunt
// publishes new cards (e.g. Radiance/RAD after its Oct 23, 2026 release), rebuild the
// bundled catalog snapshot, run the tests, then commit and push only that file.
// No Docker needed. Logs to outputs/catalog-watch/watch.log.
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fetchRiftHuntCatalog } from '../server/riftbound/import.js';
import { catalogGrowth } from '../server/riftbound/catalog.js';

const root = new URL('..', import.meta.url);
const dir = new URL('outputs/catalog-watch/', root);
const snapshotPath = 'server/riftbound/catalog-snapshot.json';
const dryRun = process.argv.includes('--dry-run');
const log = async line => {
  const entry = `${new Date().toISOString()} ${line}`;
  console.log(entry);
  await appendFile(new URL('watch.log', dir), entry + '\n').catch(() => {});
};
const run = (cmd, args) => execFileSync(cmd, args, { cwd: fileURLToPath(root), stdio: 'pipe', shell: process.platform === 'win32', encoding: 'utf8' });

try {
  await mkdir(dir, { recursive: true });
  const current = JSON.parse(await readFile(new URL(snapshotPath, root), 'utf8'));
  const catalog = await fetchRiftHuntCatalog();
  const growth = catalogGrowth(current.sets, catalog.normalized.filter(card => card.cardType));
  const summary = Object.entries(growth).map(([set, { before, after }]) => `${set} ${before}->${after}`).join(', ');
  if (!summary) {
    await log(`No new cards on RiftHunt (export ${catalog.fetched ?? 'undated'}). RAD in snapshot: ${current.sets?.RAD ?? 0}.`);
  } else if (dryRun) {
    await log(`Dry run: new cards available (${summary}). Nothing written.`);
  } else {
    const exportFile = new URL(`rifthunt-${new Date().toISOString().slice(0, 10)}.json`, dir);
    await writeFile(exportFile, JSON.stringify({ source: catalog.source, fetched: catalog.fetched, cards: catalog.cards }));
    run('node', ['scripts/riftbound-catalog-snapshot.mjs', '--from-export', fileURLToPath(exportFile)]);
    try { run('npm', ['test']); }
    catch { run('git', ['checkout', '--', snapshotPath]); throw new Error('tests failed; snapshot restored'); }
    run('git', ['commit', '-m', `Catalog watch: new RiftHunt cards (${summary})`, '--', snapshotPath]);
    try { run('git', ['push']); } catch { await log('Committed, but push failed; run git push manually.'); }
    await log(`Updated catalog snapshot: ${summary}. Rebuild and deploy the site to publish.`);
  }
} catch (error) {
  await log(`Catalog watch failed: ${error.message}. Existing snapshot unchanged.`);
  process.exitCode = 1;
}
