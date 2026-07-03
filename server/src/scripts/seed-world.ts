/**
 * World seed script (P2-CNT-01) — places the authored system-trace seed pass.
 *
 * Reads `content/seed-traces.json` and places each entry as a system-authored trace (P2-SRV-08) into
 * the configured datastore (memory unless DATABASE_URL is set). Run with `npm run seed:world`.
 * Idempotency is NOT enforced here — re-running places the seed again — so run it once per fresh
 * world (the seed content itself is draft, pending director sign-off).
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadConfig, isPlaceableTraceType, type TracePayload } from '@wanderlight/shared';
import { createRepository } from '../repo/factory';
import { placeSystemTraces, type SystemTraceSpec } from '../trace/system';

interface SeedFile {
  readonly traces: ReadonlyArray<{ type: string; x: number; y: number; payload?: TracePayload }>;
}

/** Keep only well-formed, placeable seed entries. */
function parseSpecs(file: SeedFile): SystemTraceSpec[] {
  const out: SystemTraceSpec[] = [];
  for (const t of file.traces ?? []) {
    if (!isPlaceableTraceType(t.type)) continue;
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) continue;
    out.push({ type: t.type, x: t.x, y: t.y, payload: t.payload ?? {} });
  }
  return out;
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const seedPath = resolve(here, '../../../content/seed-traces.json');
  const file = JSON.parse(await readFile(seedPath, 'utf8')) as SeedFile;
  const specs = parseSpecs(file);

  const config = loadConfig();
  const repo = await createRepository(config.databaseUrl, console);
  try {
    const placed = await placeSystemTraces(repo, specs, Date.now());
    console.log(
      `Seeded ${placed.length} system traces (${config.databaseUrl ? 'postgres' : 'memory'}).`,
    );
  } finally {
    await repo.close();
  }
}

main().catch((err) => {
  console.error('seed-world failed', err);
  process.exit(1);
});
