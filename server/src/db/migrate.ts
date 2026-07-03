/**
 * Zero-dependency SQL migration runner (P1-DATA-01).
 *
 * Migrations are plain `.sql` files in `server/migrations`, ordered by filename, each split into an
 * `-- UP` and a `-- DOWN` section. Applied versions are tracked in a `_migrations` table so `up` is
 * idempotent and `down` rolls back the most recent migration.
 *
 * Follows the project's guarded-integration rule: `pg` is loaded via a **variable-specifier dynamic
 * import** so it never enters the lockfile or CI until the datastore is activated (`npm i pg` +
 * `DATABASE_URL`). With no `DATABASE_URL`, this exits with clear activation instructions rather than
 * crashing — the same shape as the Sentry/PostHog seams.
 *
 * Policy (migrate-on-deploy): `migrate up` runs on every deploy before the server accepts traffic;
 * it only applies versions not yet in `_migrations`, so re-running is safe. See docs/Migrations.md.
 */

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'migrations');

export interface Migration {
  readonly version: string;
  readonly up: string;
  readonly down: string;
}

/** Split a migration file body into its UP and DOWN halves. */
export function parseMigration(version: string, sql: string): Migration {
  const upMatch = /--\s*UP\s*\n([\s\S]*?)(?=--\s*DOWN\s*\n|$)/i.exec(sql);
  const downMatch = /--\s*DOWN\s*\n([\s\S]*)$/i.exec(sql);
  if (!upMatch) {
    throw new Error(`Migration ${version} is missing an "-- UP" section`);
  }
  return {
    version,
    up: (upMatch[1] ?? '').trim(),
    down: (downMatch?.[1] ?? '').trim(),
  };
}

/** Load and parse every `*.sql` migration, sorted ascending by filename (the version). */
export async function loadMigrations(dir: string = MIGRATIONS_DIR): Promise<Migration[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  return Promise.all(
    files.map(async (f) =>
      parseMigration(f.replace(/\.sql$/, ''), await readFile(join(dir, f), 'utf8')),
    ),
  );
}

/** Minimal client surface we need — satisfied by `pg`'s `Client` without importing its types. */
interface SqlClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
  end(): Promise<void>;
}

/** Connect via a guarded `pg` import. Returns null (with guidance) when unavailable. */
async function connect(databaseUrl: string | undefined): Promise<SqlClient | null> {
  if (!databaseUrl) {
    console.error(
      'DATABASE_URL is not set — nothing to migrate. Set it in .env to activate the datastore.',
    );
    return null;
  }
  const pkg = 'pg';
  try {
    const pg = (await import(pkg)) as {
      default?: { Client: new (c: unknown) => SqlClient };
      Client?: new (c: unknown) => SqlClient;
    };
    const Client = pg.Client ?? pg.default?.Client;
    if (!Client) throw new Error('pg.Client not found');
    const client = new Client({ connectionString: databaseUrl });
    await (client as unknown as { connect(): Promise<void> }).connect();
    return client;
  } catch {
    console.error(
      'The `pg` package is not installed. Run `npm i pg` in server/ to activate migrations.',
    );
    return null;
  }
}

async function ensureMigrationsTable(client: SqlClient): Promise<void> {
  await client.query(
    'CREATE TABLE IF NOT EXISTS _migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
}

async function appliedVersions(client: SqlClient): Promise<Set<string>> {
  const { rows } = await client.query('SELECT version FROM _migrations ORDER BY version');
  return new Set(rows.map((r) => String(r.version)));
}

/** Apply every not-yet-applied migration, in order. */
export async function migrateUp(client: SqlClient, migrations: Migration[]): Promise<string[]> {
  await ensureMigrationsTable(client);
  const applied = await appliedVersions(client);
  const ran: string[] = [];
  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    await client.query('BEGIN');
    try {
      await client.query(m.up);
      await client.query('INSERT INTO _migrations (version) VALUES ($1)', [m.version]);
      await client.query('COMMIT');
      ran.push(m.version);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${m.version} failed: ${(err as Error).message}`);
    }
  }
  return ran;
}

/** Roll back the single most recently applied migration. */
export async function migrateDown(
  client: SqlClient,
  migrations: Migration[],
): Promise<string | null> {
  await ensureMigrationsTable(client);
  const applied = await appliedVersions(client);
  const target = [...migrations].reverse().find((m) => applied.has(m.version));
  if (!target) return null;
  await client.query('BEGIN');
  try {
    if (target.down) await client.query(target.down);
    await client.query('DELETE FROM _migrations WHERE version = $1', [target.version]);
    await client.query('COMMIT');
    return target.version;
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`Rollback of ${target.version} failed: ${(err as Error).message}`);
  }
}

/** CLI entrypoint: `migrate up` (default) | `migrate down`. */
async function main(): Promise<void> {
  const direction = process.argv[2] ?? 'up';
  const client = await connect(process.env.DATABASE_URL);
  if (!client) process.exit(1);
  try {
    const migrations = await loadMigrations();
    if (direction === 'down') {
      const rolled = await migrateDown(client, migrations);
      console.log(rolled ? `Rolled back ${rolled}` : 'Nothing to roll back');
    } else {
      const ran = await migrateUp(client, migrations);
      console.log(ran.length ? `Applied: ${ran.join(', ')}` : 'Already up to date');
    }
  } finally {
    await client.end();
  }
}

// Run only when invoked directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
