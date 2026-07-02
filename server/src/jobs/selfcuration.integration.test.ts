/**
 * P2.D self-curation integration tests (density cap + fade/GC).
 *
 * Density cap (P2-SRV-06): a chunk crowded past MAX_TRACES_PER_CHUNK returns only the top-priority
 * traces. Fade/GC (P2-SRV-07): the job removes expired, unappreciated, unlit, non-system traces and
 * fades their warmth, while provably keeping fresh/appreciated ones. Driven over the memory repo
 * (place via the system author so we can control counts + expiry without economy limits).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MAX_TRACES_PER_CHUNK, TRACE_TTL_MS } from '@wanderlight/shared';
import { createMemoryRepository } from '../repo/memory';
import type { Repository } from '../repo/types';
import { getSystemAuthor } from '../trace/system';
import { createFadeGcJob } from './gc';

let repo: Repository;
let authorId: string;

beforeEach(async () => {
  repo = createMemoryRepository();
  authorId = (await getSystemAuthor(repo)).id;
});

/** Place a lantern directly through the repo with explicit expiry + system flag control. */
async function place(opts: {
  x: number;
  createdAt: number;
  expiresAt: number | null;
  systemAuthored?: boolean;
}) {
  const { trace } = await repo.placeTrace({
    type: 'lantern',
    x: opts.x,
    y: 0,
    chunkX: 0,
    chunkY: 0,
    authorId,
    payload: {},
    warmth: 2,
    createdAt: opts.createdAt,
    expiresAt: opts.expiresAt,
    cost: 0,
    systemAuthored: opts.systemAuthored ?? false,
  });
  return trace;
}

describe('P2-SRV-06 density cap', () => {
  it('returns only the top-priority traces when a chunk is over the cap', async () => {
    const now = 1_000_000;
    // Place more than the cap; fresher ones (higher createdAt) should win.
    for (let i = 0; i < MAX_TRACES_PER_CHUNK + 15; i++) {
      await place({ x: i, createdAt: now - i * 1000, expiresAt: null });
    }
    const [chunk] = await repo.getChunkTraces([{ cx: 0, cy: 0 }], now);
    expect(chunk!.traces).toHaveLength(MAX_TRACES_PER_CHUNK);
    // The freshest trace (createdAt === now) must be present; the oldest must be culled.
    const createdAts = chunk!.traces.map((t) => t.createdAt);
    expect(Math.max(...createdAts)).toBe(now);
    expect(Math.min(...createdAts)).toBeGreaterThan(now - (MAX_TRACES_PER_CHUNK + 15) * 1000);
  });
});

describe('P2-SRV-07 fade + GC', () => {
  it('removes an expired, unappreciated trace and fades its warmth', async () => {
    const now = TRACE_TTL_MS.lantern! + 10_000;
    const stale = await place({ x: 1, createdAt: 0, expiresAt: 5_000 }); // expired well before now

    const warmthBefore = (await repo.getChunkTraces([{ cx: 0, cy: 0 }], now))[0]!.warmth;
    const summary = await createFadeGcJob(repo).run(now);
    expect(summary).toMatchObject({ removed: 1 });

    expect(await repo.getTraceById(stale.id)).toBeNull();
    const warmthAfter = (await repo.getChunkTraces([{ cx: 0, cy: 0 }], now))[0]!.warmth;
    expect(warmthAfter).toBeLessThan(warmthBefore);
  });

  it('never removes a fresh or appreciated trace', async () => {
    const now = 10_000_000;
    const fresh = await place({ x: 1, createdAt: now, expiresAt: now + 1_000_000 });
    const appreciated = await place({ x: 2, createdAt: 0, expiresAt: 5_000 });
    // Appreciate the expired one so it becomes GC-safe.
    await repo.appreciate(appreciated.id, 'someone-else', 5);

    const summary = await createFadeGcJob(repo).run(now);
    expect(summary).toMatchObject({ removed: 0 });
    expect(await repo.getTraceById(fresh.id)).not.toBeNull();
    expect(await repo.getTraceById(appreciated.id)).not.toBeNull();
  });

  it('is a no-op when nothing is eligible', async () => {
    const summary = await createFadeGcJob(repo).run(Date.now());
    expect(summary).toMatchObject({ removed: 0 });
  });
});
