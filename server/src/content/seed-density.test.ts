/**
 * Seed-corpus density audit (P3-CNT-01; prereq for the P5-TST-02 cold-start check).
 *
 * Loads the authored system-trace corpus (`content/seed-traces.json`) and asserts every chunk of the
 * 3×3 First Vale block carries at least one seed trace — so a brand-new, community-less player is never
 * dropped into a barren chunk (scope cold-start risk gd-1). Validates the *content*, not placement.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { worldToChunk, chunkId, isPlaceableTraceType } from '@wanderlight/shared';

const here = dirname(fileURLToPath(import.meta.url));
const seedPath = resolve(here, '../../../content/seed-traces.json');

interface SeedFile {
  readonly traces: ReadonlyArray<{ type: string; x: number; y: number }>;
}

async function loadSeed(): Promise<SeedFile> {
  return JSON.parse(await readFile(seedPath, 'utf8')) as SeedFile;
}

describe('seed corpus density (First Vale)', () => {
  it('has 40–50 curated traces (P3-CNT-01 budget)', async () => {
    const seed = await loadSeed();
    expect(seed.traces.length).toBeGreaterThanOrEqual(40);
    expect(seed.traces.length).toBeLessThanOrEqual(50);
  });

  it('places at least one trace in every First Vale chunk (no barren visited chunk)', async () => {
    const seed = await loadSeed();
    const byChunk = new Map<string, number>();
    for (const t of seed.traces) {
      const { cx, cy } = worldToChunk(t.x, t.y);
      const id = chunkId(cx, cy);
      byChunk.set(id, (byChunk.get(id) ?? 0) + 1);
    }
    for (let cy = -1; cy <= 1; cy += 1) {
      for (let cx = -1; cx <= 1; cx += 1) {
        expect(byChunk.get(chunkId(cx, cy)) ?? 0).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every seed entry is a placeable trace type', async () => {
    const seed = await loadSeed();
    for (const t of seed.traces) expect(isPlaceableTraceType(t.type)).toBe(true);
  });
});
