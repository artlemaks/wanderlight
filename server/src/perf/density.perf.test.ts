/**
 * Density + performance test (P2-TST-02).
 *
 * Asserts the perf thresholds from the AC as repeatable checks over the in-memory repo: a chunk read
 * at heavy density returns within the 500ms budget, and the fade/GC job over a large eligible set
 * completes fast enough to cause no lag spike. Thresholds are generous so the test is stable in CI
 * across machines while still catching an accidental O(n^2) regression.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryRepository } from '../repo/memory';
import type { Repository } from '../repo/types';
import { getSystemAuthor } from '../trace/system';

/** Chunk-read latency budget from the AC. */
const CHUNK_READ_BUDGET_MS = 500;
/** GC-run budget — a single scheduled sweep must not stall the loop. */
const GC_BUDGET_MS = 500;
/** Heavy but realistic worst-case: far past the visible cap, in one chunk. */
const HEAVY_DENSITY = 2000;

let repo: Repository;
let authorId: string;

beforeEach(async () => {
  repo = createMemoryRepository();
  authorId = (await getSystemAuthor(repo)).id;
});

async function fillChunk(count: number, expiresAt: number | null): Promise<void> {
  for (let i = 0; i < count; i++) {
    await repo.placeTrace({
      type: 'lantern',
      x: i % 64,
      y: Math.floor(i / 64) % 64,
      chunkX: 0,
      chunkY: 0,
      authorId,
      payload: {},
      warmth: 1,
      createdAt: i,
      expiresAt,
      cost: 0,
    });
  }
}

describe('P2-TST-02 density + perf', () => {
  it('reads a heavily-dense chunk within the 500ms budget', async () => {
    await fillChunk(HEAVY_DENSITY, null);
    const start = performance.now();
    const [chunk] = await repo.getChunkTraces([{ cx: 0, cy: 0 }], 1_000_000);
    const elapsed = performance.now() - start;
    // Cap still enforced under load.
    expect(chunk!.traces.length).toBeLessThanOrEqual(24);
    expect(elapsed).toBeLessThan(CHUNK_READ_BUDGET_MS);
  });

  it('garbage-collects a large eligible set within budget without stalling', async () => {
    await fillChunk(HEAVY_DENSITY, 5_000); // all expired well before `now`
    const start = performance.now();
    const summary = await repo.gcTraces(10_000_000);
    const elapsed = performance.now() - start;
    expect(summary.removed).toBe(HEAVY_DENSITY);
    expect(elapsed).toBeLessThan(GC_BUDGET_MS);
  });
});
