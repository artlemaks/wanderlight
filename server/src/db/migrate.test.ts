import { describe, it, expect } from 'vitest';
import { parseMigration, migrateUp, migrateDown, loadMigrations, type Migration } from './migrate';

describe('parseMigration', () => {
  it('splits UP and DOWN sections', () => {
    const m = parseMigration(
      '0001_x',
      '-- comment\n-- UP\nCREATE TABLE x();\n-- DOWN\nDROP TABLE x;\n',
    );
    expect(m.version).toBe('0001_x');
    expect(m.up).toBe('CREATE TABLE x();');
    expect(m.down).toBe('DROP TABLE x;');
  });

  it('throws when UP is missing', () => {
    expect(() => parseMigration('bad', 'SELECT 1;')).toThrow(/UP/);
  });
});

describe('the real migration files', () => {
  it('all parse with a non-empty UP and a DOWN', async () => {
    const migrations = await loadMigrations();
    expect(migrations.length).toBeGreaterThanOrEqual(4);
    for (const m of migrations) {
      expect(m.up.length).toBeGreaterThan(0);
      expect(m.down.length).toBeGreaterThan(0);
    }
  });
});

/** A fake SQL client recording statements and tracking a `_migrations` set — no real DB needed. */
function fakeClient() {
  const applied = new Set<string>();
  const statements: string[] = [];
  return {
    statements,
    applied,
    async query(sql: string, params: unknown[] = []) {
      statements.push(sql);
      if (sql.startsWith('SELECT version FROM _migrations')) {
        return { rows: [...applied].sort().map((v) => ({ version: v })) };
      }
      if (sql.startsWith('INSERT INTO _migrations')) {
        applied.add(String(params[0]));
      }
      if (sql.startsWith('DELETE FROM _migrations')) {
        applied.delete(String(params[0]));
      }
      return { rows: [] };
    },
    async end() {},
  };
}

const migrations: Migration[] = [
  { version: '0001', up: 'CREATE 1', down: 'DROP 1' },
  { version: '0002', up: 'CREATE 2', down: 'DROP 2' },
];

describe('migrateUp / migrateDown', () => {
  it('applies only not-yet-applied migrations in order', async () => {
    const client = fakeClient();
    const ran = await migrateUp(client, migrations);
    expect(ran).toEqual(['0001', '0002']);
    // second run is a no-op (idempotent)
    expect(await migrateUp(client, migrations)).toEqual([]);
  });

  it('rolls back the most recent migration', async () => {
    const client = fakeClient();
    await migrateUp(client, migrations);
    expect(await migrateDown(client, migrations)).toBe('0002');
    expect(await migrateDown(client, migrations)).toBe('0001');
    expect(await migrateDown(client, migrations)).toBeNull();
  });
});
