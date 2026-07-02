/**
 * Footpath aggregation integration test (P2-CLI-02 → P2-SRV-03 → P2-SRV-04).
 *
 * Ingests a batch of movement-heat samples through `POST /heat`, runs the aggregation job, then reads
 * the chunk to assert footfall persisted (per-tile counts) and warmth rose from footfall — the full
 * footpath/warmth pipeline over the in-memory repo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import type { Repository } from '../repo/types';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';
import { noopAnalytics } from '../observability/analytics';
import { createFootpathAggregationJob } from './footpath';

const corpus = buildCorpus({ templates: [] }, { banks: {} });

let app: FastifyInstance;
let repo: Repository;

beforeEach(() => {
  repo = createMemoryRepository();
  app = buildApp({ repo, corpus, analytics: noopAnalytics, reporter: noopReporter, logger: false });
});

describe('footpath aggregation', () => {
  it('ingests heat, aggregates per-tile footfall, and raises chunk warmth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/heat',
      payload: {
        tiles: [
          { tx: 0, ty: 0 },
          { tx: 0, ty: 0 },
          { tx: 1, ty: 0 },
        ],
      },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json().accepted).toBe(3);

    // Before aggregation the chunk has no footfall.
    const before = (await app.inject({ method: 'GET', url: '/world/chunks?ids=0,0' })).json()
      .chunks[0];
    expect(before.footfall).toEqual({});

    const summary = await createFootpathAggregationJob(repo).run(Date.now());
    expect(summary).toEqual({ samplesProcessed: 3, chunksTouched: 1 });

    const after = (await app.inject({ method: 'GET', url: '/world/chunks?ids=0,0' })).json()
      .chunks[0];
    expect(after.footfall).toEqual({ '0,0': 2, '1,0': 1 });
    expect(after.warmth).toBeGreaterThan(0);
  });

  it('is a no-op with nothing buffered', async () => {
    const summary = await createFootpathAggregationJob(repo).run(Date.now());
    expect(summary).toEqual({ samplesProcessed: 0, chunksTouched: 0 });
  });

  it('drops malformed tiles rather than rejecting the whole batch', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/heat',
      payload: {
        tiles: [
          { tx: 1.5, ty: 0 },
          { tx: 2, ty: 2 },
          { tx: 'x', ty: 0 },
        ],
      },
    });
    expect(res.statusCode).toBe(202);
    expect(res.json().accepted).toBe(1);
  });
});
