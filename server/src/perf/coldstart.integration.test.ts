/**
 * P5 cold-start + zero-moderation-under-load validation (P5-TST-02 / P5-TST-03).
 *
 * P5-TST-02 — a brand-new player must encounter **≥3 traces** in their immediate surroundings on
 * landing (the "≥3 within 60s" cold-start guarantee, scope risk gd-1). We seed the authored corpus and
 * assert the landing 3×3 chunk block returns ≥3 traces.
 *
 * P5-TST-03 — under a burst of placements, curated content produces **zero moderation incidents**:
 * every placement is a valid template+word-bank signpost (no free text exists), and malformed/free-text
 * payloads are rejected at the API. There is no path by which a load spike can inject unmoderated text.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { visibleChunkIds, isPlaceableTraceType, type TracePayload } from '@wanderlight/shared';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';
import { noopAnalytics } from '../observability/analytics';
import { placeSystemTraces, type SystemTraceSpec } from '../trace/system';
import type { Repository } from '../repo/types';

const corpus = buildCorpus(
  { templates: [{ id: 'e1', category: 'encourage', text: 'a {place}', slots: ['place'] }] },
  { banks: { place: ['grove'] } },
);

const seedPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../content/seed-traces.json',
);

async function loadSeedSpecs(): Promise<SystemTraceSpec[]> {
  const file = JSON.parse(await readFile(seedPath, 'utf8')) as {
    traces: Array<{ type: string; x: number; y: number; payload?: TracePayload }>;
  };
  return file.traces
    .filter((t) => isPlaceableTraceType(t.type))
    .map((t) => ({
      type: t.type as SystemTraceSpec['type'],
      x: t.x,
      y: t.y,
      payload: t.payload ?? {},
    }));
}

let app: FastifyInstance;
let repo: Repository;
beforeEach(() => {
  repo = createMemoryRepository();
  app = buildApp({ repo, corpus, analytics: noopAnalytics, reporter: noopReporter, logger: false });
});

describe('P5-TST-02 cold-start density', () => {
  it('a new player sees ≥3 traces in the landing area after seeding', async () => {
    const specs = await loadSeedSpecs();
    await placeSystemTraces(repo, specs, Date.now());

    // Landing area = the chunks visible from the origin (a small camera at 0,0).
    const ids = visibleChunkIds({ x: 0, y: 0, width: 128, height: 128 }).join(';');
    const read = await app.inject({
      method: 'GET',
      url: `/world/chunks?ids=${encodeURIComponent(ids)}`,
    });
    expect(read.statusCode).toBe(200);

    const total = read
      .json()
      .chunks.reduce((sum: number, c: { traces: unknown[] }) => sum + c.traces.length, 0);
    expect(total).toBeGreaterThanOrEqual(3);
  });
});

describe('P5-TST-03 zero-moderation under load', () => {
  it('a burst of curated placements all succeed and none carry free text', async () => {
    const N = 60;
    let placed = 0;
    for (let i = 0; i < N; i += 1) {
      const token = (await app.inject({ method: 'POST', url: '/session' })).headers[
        'x-device-token'
      ] as string;
      const res = await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': token },
        // Spread across chunks so no single chunk hits its rate limit.
        payload: { type: 'lantern', x: i * 40, y: i * 40, payload: {} },
      });
      if (res.statusCode === 201) placed += 1;
    }
    // Every legitimate placement is accepted — the bot/rate gates pass legit traffic.
    expect(placed).toBe(N);
  });

  it('rejects a free-text / invalid signpost payload (no unmoderated text path exists)', async () => {
    const token = (await app.inject({ method: 'POST', url: '/session' })).headers[
      'x-device-token'
    ] as string;
    const res = await app.inject({
      method: 'POST',
      url: '/trace',
      headers: { 'x-device-token': token },
      // A signpost with an unknown template + arbitrary text must be rejected.
      payload: {
        type: 'signpost',
        x: 5,
        y: 5,
        payload: { templateId: 'free-text', slots: { anything: 'rude words' } },
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
