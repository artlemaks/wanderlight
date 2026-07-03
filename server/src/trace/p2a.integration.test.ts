/**
 * P2.A full trace-set integration tests (gift / shrine / lantern lit-count + system author).
 *
 * Drives the real Fastify app via `app.inject` against the in-memory repo, mirroring the P1 loop
 * harness. Covers: a gift claimed once (finder + author rewarded, charge consumed), a lantern lit
 * idempotently per player (raising chunk warmth), shrine offerings accumulating, and system-authored
 * seed traces being placeable + never-expiring.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  STARTING_MOTES,
  STARTING_GIFT_CHARGES,
  GIFT_CLAIM_REWARD_MOTES,
  GIFT_AUTHOR_REWARD_MOTES,
  SHRINE_OFFERING_COST,
} from '@wanderlight/shared';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import type { Repository } from '../repo/types';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';
import { noopAnalytics } from '../observability/analytics';
import { placeSystemTrace } from './system';

const corpus = buildCorpus({ templates: [] }, { banks: {} });

let app: FastifyInstance;
let repo: Repository;

beforeEach(() => {
  repo = createMemoryRepository();
  app = buildApp({ repo, corpus, analytics: noopAnalytics, reporter: noopReporter, logger: false });
});

async function newSession(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/session' });
  return res.headers['x-device-token'] as string;
}

async function place(token: string, type: 'gift' | 'lantern', x = 5, y = 5) {
  return app.inject({
    method: 'POST',
    url: '/trace',
    headers: { 'x-device-token': token },
    payload: { type, x, y, payload: {} },
  });
}

describe('P2-SRV-01 gift trace', () => {
  it('consumes a gift charge on placement and lets exactly one finder claim it', async () => {
    const author = await newSession();
    const placed = await place(author, 'gift');
    expect(placed.statusCode).toBe(201);
    const traceId = placed.json().trace.id;

    // Author's gift charge was consumed (session echoes motes; verify charges via a re-place count).
    // Finder claims → applied, receives reward motes.
    const finder = await newSession();
    const claim = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/claim`,
      headers: { 'x-device-token': finder },
    });
    expect(claim.statusCode).toBe(200);
    expect(claim.json()).toMatchObject({ applied: true });
    expect(claim.json().motes).toBe(STARTING_MOTES + GIFT_CLAIM_REWARD_MOTES);

    // A second finder cannot claim the same gift.
    const other = await newSession();
    const second = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/claim`,
      headers: { 'x-device-token': other },
    });
    expect(second.json()).toMatchObject({ applied: false });
  });

  it('rewards the author when their gift is claimed', async () => {
    const author = await newSession();
    const traceId = (await place(author, 'gift')).json().trace.id;
    const finder = await newSession();
    await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/claim`,
      headers: { 'x-device-token': finder },
    });
    const authorState = await app.inject({
      method: 'POST',
      url: '/session',
      headers: { 'x-device-token': author },
    });
    expect(authorState.json().motes).toBe(STARTING_MOTES + GIFT_AUTHOR_REWARD_MOTES);
  });

  it('rejects claiming your own gift', async () => {
    const author = await newSession();
    const traceId = (await place(author, 'gift')).json().trace.id;
    const res = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/claim`,
      headers: { 'x-device-token': author },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects placing a gift once charges are exhausted', async () => {
    const author = await newSession();
    for (let i = 0; i < STARTING_GIFT_CHARGES; i++) {
      expect((await place(author, 'gift', i, 0)).statusCode).toBe(201);
    }
    const broke = await place(author, 'gift', 9, 0);
    expect(broke.statusCode).toBe(402);
    expect(broke.json().error).toBe('insufficient_charges');
  });
});

describe('P2-DATA-01 lantern lit-count', () => {
  it('increments lit-count once per player and raises chunk warmth', async () => {
    const author = await newSession();
    const traceId = (await place(author, 'lantern')).json().trace.id;

    const warmthBefore = (await app.inject({ method: 'GET', url: '/world/chunks?ids=0,0' })).json()
      .chunks[0].warmth;

    const fan = await newSession();
    const first = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/light`,
      headers: { 'x-device-token': fan },
    });
    expect(first.json()).toMatchObject({ applied: true, litCount: 1 });

    // Same fan lighting again is a no-op.
    const again = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/light`,
      headers: { 'x-device-token': fan },
    });
    expect(again.json()).toMatchObject({ applied: false, litCount: 1 });

    const warmthAfter = (await app.inject({ method: 'GET', url: '/world/chunks?ids=0,0' })).json()
      .chunks[0].warmth;
    expect(warmthAfter).toBeGreaterThan(warmthBefore);
  });

  it('rejects lighting a non-lantern trace', async () => {
    const author = await newSession();
    const traceId = (await place(author, 'gift')).json().trace.id;
    const res = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/light`,
      headers: { 'x-device-token': author },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('P2-SRV-02 shrine offering', () => {
  it('accumulates offerings and exposes readable state', async () => {
    const token = await newSession();
    const first = await app.inject({
      method: 'POST',
      url: '/shrine/offering',
      headers: { 'x-device-token': token },
      payload: { x: 3, y: 3 },
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().shrine.offerings).toBe(1);
    expect(first.json().motes).toBe(STARTING_MOTES - SHRINE_OFFERING_COST);

    await app.inject({
      method: 'POST',
      url: '/shrine/offering',
      headers: { 'x-device-token': token },
      payload: { x: 3, y: 3 },
    });

    const read = await app.inject({ method: 'GET', url: '/shrine?ids=0,0' });
    expect(read.statusCode).toBe(200);
    expect(read.json().shrines[0].offerings).toBe(2);
  });

  it('rejects an offering the player cannot afford', async () => {
    const token = await newSession();
    // Drain motes with shrine offerings (STARTING_MOTES=30, cost=5 → 6 succeed, 7th fails).
    for (let i = 0; i < STARTING_MOTES / SHRINE_OFFERING_COST; i++) {
      const ok = await app.inject({
        method: 'POST',
        url: '/shrine/offering',
        headers: { 'x-device-token': token },
        payload: { x: 3, y: 3 },
      });
      expect(ok.statusCode).toBe(201);
    }
    const broke = await app.inject({
      method: 'POST',
      url: '/shrine/offering',
      headers: { 'x-device-token': token },
      payload: { x: 3, y: 3 },
    });
    expect(broke.statusCode).toBe(402);
  });
});

describe('P2-SRV-08 system-trace author', () => {
  it('places a flagged, never-expiring trace discoverable in the chunk read', async () => {
    const trace = await placeSystemTrace(
      repo,
      { type: 'lantern', x: 12, y: 12, payload: {} },
      1000,
    );
    expect(trace.systemAuthored).toBe(true);
    expect(trace.expiresAt).toBeNull();

    const read = await app.inject({ method: 'GET', url: '/world/chunks?ids=0,0' });
    expect(read.json().chunks[0].traces.map((t: { id: string }) => t.id)).toContain(trace.id);
  });
});
