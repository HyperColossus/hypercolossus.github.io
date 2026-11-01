import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';
import pg from 'pg';
import { checkDatabase } from '../server/database.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const envPath = join(root, '.env.riftbound.local');
const action = process.argv[2];

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', windowsHide: true });
    child.on('error', () => reject(new Error('Could not start the required local tool.')));
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Local command did not complete successfully.')));
  });
}

function dockerPath() {
  if (process.env.DOCKER_PATH) return process.env.DOCKER_PATH;
  if (process.platform === 'win32') {
    for (const path of [
      join(homedir(), 'AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe'),
      'C:/Program Files/Docker/Docker/resources/bin/docker.exe',
    ]) if (existsSync(path)) return path;
  }
  return 'docker';
}

async function settings() {
  if (!existsSync(envPath)) {
    if (action !== 'up') throw new Error('Run npm run db:up first.');
    await writeFile(envPath, [
      '# Local Docker database credentials. Do not commit or delete while retaining the database volume.',
      `RIFTBOUND_POSTGRES_PASSWORD=${randomBytes(32).toString('hex')}`,
      `RIFTBOUND_RUNTIME_PASSWORD=${randomBytes(32).toString('hex')}`,
      '',
    ].join('\n'), { flag: 'wx', mode: 0o600 });
  }
  const values = parseEnv(await readFile(envPath, 'utf8'));
  for (const key of ['RIFTBOUND_POSTGRES_PASSWORD', 'RIFTBOUND_RUNTIME_PASSWORD']) {
    if (!/^[a-f0-9]{64}$/.test(values[key] ?? '')) throw new Error('Local credential file is invalid; preserve it and repair before continuing.');
  }
  return values;
}

function connection(user, password) {
  return `postgresql://${user}:${password}@127.0.0.1:55432/riftbound_dev`;
}

async function initialize(ownerUrl, runtimePassword) {
  const client = new pg.Client({ connectionString: ownerUrl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT to_regnamespace('riftbound') AS schema");
    if (!rows[0].schema) {
      await client.query(await readFile(join(root, 'db/riftbound/001_initial.sql'), 'utf8'));
      console.log('Applied the initial Riftbound schema.');
    }
    await client.query(await readFile(join(root, 'db/riftbound/002_allow_shared_tcg_products.sql'), 'utf8'));
    await client.query(await readFile(join(root, 'db/riftbound/003_card_gameplay.sql'), 'utf8'));
    await client.query(await readFile(join(root, 'db/riftbound/004_admin_and_sync.sql'), 'utf8'));
    await client.query(await readFile(join(root, 'db/riftbound/005_card_details.sql'), 'utf8'));
    await client.query(await readFile(join(root, 'db/riftbound/006_sync_limits.sql'), 'utf8'));
    await client.query('BEGIN');
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'riftbound_runtime'");
    if (!role.rowCount) await client.query('CREATE ROLE riftbound_runtime LOGIN');
    // Password comes only from the hex-validated local file, never user SQL input.
    await client.query(`ALTER ROLE riftbound_runtime WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${runtimePassword}'`);
    await client.query(`
      REVOKE ALL ON DATABASE riftbound_dev FROM PUBLIC;
      GRANT CONNECT ON DATABASE riftbound_dev TO riftbound_runtime;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      GRANT USAGE ON SCHEMA riftbound TO riftbound_runtime;
      GRANT SELECT ON riftbound.card_sets, riftbound.cards, riftbound.binder,
        riftbound.sealed_products, riftbound.price_history,
        riftbound.latest_card_prices, riftbound.latest_sealed_prices TO riftbound_runtime;
      REVOKE INSERT, UPDATE, DELETE ON riftbound.price_history, riftbound.sync_leases FROM riftbound_runtime;
      REVOKE INSERT, UPDATE, DELETE ON riftbound.binder, riftbound.sessions FROM riftbound_runtime;
    `);
    await client.query('COMMIT');
  } finally {
    await client.end();
  }
}

try {
  if (!['up', 'stop', 'check', 'server'].includes(action)) throw new Error('Choose up, stop, check, or server.');
  const values = await settings();
  const runtimeUrl = connection('riftbound_runtime', values.RIFTBOUND_RUNTIME_PASSWORD);
  if (action === 'up' || action === 'stop') {
    const docker = dockerPath();
    const env = { ...process.env, ...values, PATH: `${dirname(docker)}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}` };
    await run(docker, ['compose', '--env-file', envPath, '-f', 'compose.riftbound.yaml',
      ...(action === 'up' ? ['up', '-d', '--wait', '--wait-timeout', '60'] : ['stop'])], env);
    if (action === 'up') await initialize(connection('riftbound_owner', values.RIFTBOUND_POSTGRES_PASSWORD), values.RIFTBOUND_RUNTIME_PASSWORD);
  }
  if (action === 'up' || action === 'check') {
    if (!await checkDatabase({ HYPERDRIVE: { connectionString: runtimeUrl } })) throw new Error('Database readiness check failed.');
    const client = new pg.Client({ connectionString: runtimeUrl, connectionTimeoutMillis: 5000 });
    try {
      await client.connect();
      const { rows } = await client.query(`SELECT
        has_table_privilege(current_user, 'riftbound.cards', 'INSERT,UPDATE,DELETE') AS can_write,
        has_table_privilege(current_user, 'riftbound.binder', 'INSERT,UPDATE,DELETE') AS can_write_binder,
        has_table_privilege(current_user, 'riftbound.price_history', 'INSERT,UPDATE,DELETE') AS can_write_prices,
        has_schema_privilege(current_user, 'riftbound', 'CREATE') AS can_create`);
      if (rows[0].can_write || rows[0].can_write_binder || rows[0].can_write_prices || rows[0].can_create) throw new Error('Runtime role has unexpected write privileges.');
    } finally { await client.end(); }
    console.log('Riftbound PostgreSQL is ready on localhost:55432; runtime role is read-only.');
  }
  if (action === 'server') {
    // Local Hyperdrive emulation only; the owner credential is not passed to Wrangler.
    const env = { ...process.env, CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE: runtimeUrl };
    delete env.RIFTBOUND_POSTGRES_PASSWORD;
    delete env.RIFTBOUND_RUNTIME_PASSWORD;
    delete env.RIFTBOUND_MIGRATION_DATABASE_URL;
    await run(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'wrangler.site.jsonc', '--env', 'local', '--local'], env);
  }
} catch (error) {
  // Database errors can contain secrets. Only our known setup messages are exposed.
  const safe = ['Run npm run db:up first.', 'Choose up, stop, check, or server.',
    'Local credential file is invalid; preserve it and repair before continuing.',
    'Could not start the required local tool.', 'Local command did not complete successfully.',
    'Database readiness check failed.', 'Runtime role has unexpected write privileges.'];
  console.error(safe.includes(error.message) ? error.message : 'Local database setup failed. Check Docker status, port 55432, and the existing credential file.');
  process.exitCode = 1;
}
