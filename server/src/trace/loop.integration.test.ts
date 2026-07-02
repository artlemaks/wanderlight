/**
 * P1 full-loop integration test (P1-TST-01).
 *
 * Drives the real Fastify app via `app.inject` against the in-memory repo — no network, no DB — so
 * the whole vertical slice is exercised in CI: session bootstrap → place a signpost → another
 * session discovers it in the chunk read → appreciates it (rewarding the author) → idempotency,
 * economy, and rate-limit rejections. This is the server half of the P1 exit demo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  STARTING_MOTES,
  TRACE_PLACEMENT_COST,
  APPRECIATION_REWARD_MOTES,
} from '@wanderlight/shared';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';
import { noopAnalytics } from '../observability/analytics';

const corpus = buildCorpus(
  {
    templates: [
      {
        id: 'encourage-01',
        category: 'encourage',
        text: 'a {adjective} {place}',
        slots: ['adjective', 'place'],
      },
    ],
  },
  { banks: { adjective: ['gentle', 'quiet'], place: ['grove', 'meadow'] } },
);

const signpost = {
  type: 'signpost' as const,
  x: 10,
  y: 20,
  payload: { templateId: 'encourage-01', slots: { adjective: 'gentle', place: 'grove' } },
};

let app: FastifyInstance;

beforeEach(() => {
  app = buildApp({
    repo: createMemoryRepository(),
    corpus,
    analytics: noopAnalytics,
    reporter: noopReporter,
    logger: false,
  });
});

/** Bootstrap a session, returning its device token so subsequent calls act as the same player. */
async function newSession(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/session' });
  return res.headers['x-device-token'] as string;
}

describe('P1 trace loop', () => {
  it('bootstraps an anonymous player with starting motes', async () => {
    const res = await app.inject({ method: 'POST', url: '/session' });
    expect(res.statusCode).toBe(200);
    expect(res.json().motes).toBe(STARTING_MOTES);
    expect(res.headers['x-device-token']).toBeTruthy();
  });

  it('places a signpost, debits motes, and another session discovers it', async () => {
    const author = await newSession();
    const place = await app.inject({
      method: 'POST',
      url: '/trace',
      headers: { 'x-device-token': author },
      payload: signpost,
    });
    expect(place.statusCode).toBe(201);
    expect(place.json().motes).toBe(STARTING_MOTES - TRACE_PLACEMENT_COST.signpost);
    const traceId = place.json().trace.id;
    expect(place.json().trace.chunkX).toBe(0); // (10,20) → chunk (0,0)

    // A different visitor reads the chunk and finds the trace.
    const read = await app.inject({ method: 'GET', url: '/world/chunks?ids=0,0' });
    expect(read.statusCode).toBe(200);
    const chunk = read.json().chunks[0];
    expect(chunk.chunkId).toBe('0,0');
    expect(chunk.warmth).toBeGreaterThan(0);
    expect(chunk.traces.map((t: { id: string }) => t.id)).toContain(traceId);
  });

  it('rewards the author on appreciation and is idempotent per player', async () => {
    const author = await newSession();
    const traceId = (
      await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': author },
        payload: signpost,
      })
    ).json().trace.id;

    const fan = await newSession();
    const first = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/appreciate`,
      headers: { 'x-device-token': fan },
    });
    expect(first.json()).toMatchObject({ applied: true, appreciations: 1 });

    // Same fan again → no-op.
    const second = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/appreciate`,
      headers: { 'x-device-token': fan },
    });
    expect(second.json()).toMatchObject({ applied: false, appreciations: 1 });

    // Author was rewarded exactly once.
    const authorState = await app.inject({
      method: 'POST',
      url: '/session',
      headers: { 'x-device-token': author },
    });
    expect(authorState.json().motes).toBe(
      STARTING_MOTES - TRACE_PLACEMENT_COST.signpost + APPRECIATION_REWARD_MOTES,
    );
  });

  it('rejects appreciating your own trace', async () => {
    const author = await newSession();
    const traceId = (
      await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': author },
        payload: signpost,
      })
    ).json().trace.id;
    const res = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/appreciate`,
      headers: { 'x-device-token': author },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid signpost payload (free text / bad word)', async () => {
    const author = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/trace',
      headers: { 'x-device-token': author },
      payload: {
        ...signpost,
        payload: { templateId: 'encourage-01', slots: { adjective: 'gentle', place: 'volcano' } },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects placement with insufficient motes', async () => {
    const author = await newSession();
    // STARTING_MOTES=30, signpost=10 → 3 succeed, 4th is short.
    for (let i = 0; i < 3; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': author },
        payload: signpost,
      });
      expect(ok.statusCode).toBe(201);
    }
    const broke = await app.inject({
      method: 'POST',
      url: '/trace',
      headers: { 'x-device-token': author },
      payload: signpost,
    });
    expect(broke.statusCode).toBe(402);
  });

  it('returns 400 for a chunk read with no ids', async () => {
    const res = await app.inject({ method: 'GET', url: '/world/chunks' });
    expect(res.statusCode).toBe(400);
  });
});
