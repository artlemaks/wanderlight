/**
 * P3 integration test (P3-TST-01/02).
 *
 * Drives the real Fastify app via `app.inject` against the in-memory repo — no network, no DB — over
 * the P3 slice: anon→email upgrade (no data loss) + cross-device link; attunement unlocks + wardrobe
 * equip (server-validated ownership); appreciation notification summary + seen-clearing on return.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  STARTING_MOTES,
  TRACE_PLACEMENT_COST,
  APPRECIATION_REWARD_MOTES,
  ATTUNEMENT_EARN,
  attunementLevel,
} from '@wanderlight/shared';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';
import { noopAnalytics } from '../observability/analytics';

const corpus = buildCorpus(
  { templates: [{ id: 'e1', category: 'encourage', text: 'a {place}', slots: ['place'] }] },
  { banks: { place: ['grove'] } },
);

const signpost = {
  type: 'signpost' as const,
  x: 10,
  y: 20,
  payload: { templateId: 'e1', slots: { place: 'grove' } },
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

async function newSession(): Promise<string> {
  const res = await app.inject({ method: 'POST', url: '/session' });
  return res.headers['x-device-token'] as string;
}

async function placeSignpost(token: string): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/trace',
    headers: { 'x-device-token': token },
    payload: signpost,
  });
  return res.json().trace.id;
}

describe('P3 accounts — anon→email upgrade + cross-device link', () => {
  it('upgrade preserves the anon account data', async () => {
    const a = await newSession();
    await placeSignpost(a); // spends 10 motes → 20 left

    const up = await app.inject({
      method: 'POST',
      url: '/auth/upgrade',
      headers: { 'x-device-token': a },
      payload: { email: 'Wanderer@Example.com' },
    });
    expect(up.statusCode).toBe(200);
    expect(up.json()).toMatchObject({ email: 'wanderer@example.com', linked: false });
    expect(up.json().motes).toBe(STARTING_MOTES - TRACE_PLACEMENT_COST.signpost);
  });

  it('a second device linking the same email resolves to the one canonical account', async () => {
    const a = await newSession();
    await placeSignpost(a); // canonical account now has 20 motes
    await app.inject({
      method: 'POST',
      url: '/auth/upgrade',
      headers: { 'x-device-token': a },
      payload: { email: 'w@example.com' },
    });

    const b = await newSession(); // fresh device, 30 motes of its own
    const link = await app.inject({
      method: 'POST',
      url: '/auth/upgrade',
      headers: { 'x-device-token': b },
      payload: { email: 'w@example.com' },
    });
    expect(link.json().linked).toBe(true);
    // Resolves to the canonical (A) account — 20 motes — not B's fresh 30.
    expect(link.json().motes).toBe(STARTING_MOTES - TRACE_PLACEMENT_COST.signpost);
  });

  it('rejects an invalid email', async () => {
    const a = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/upgrade',
      headers: { 'x-device-token': a },
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('P3 cosmetics — attunement unlocks + wardrobe equip', () => {
  it('unlocks a milestone cosmetic through play and equips it', async () => {
    const author = await newSession();
    const traceId = await placeSignpost(author);
    // 7 distinct travelers thank the trace → 7 * receive_appreciation attunement ≥ milestone 1 (25).
    for (let i = 0; i < 7; i += 1) {
      const fan = await newSession();
      await app.inject({
        method: 'POST',
        url: `/trace/${traceId}/appreciate`,
        headers: { 'x-device-token': fan },
      });
    }
    const attun = 7 * ATTUNEMENT_EARN.receive_appreciation;
    expect(attunementLevel(attun)).toBeGreaterThanOrEqual(1);

    const cos = await app.inject({
      method: 'GET',
      url: '/cosmetics',
      headers: { 'x-device-token': author },
    });
    expect(cos.json().owned).toContain('lantern.rose'); // milestone 1
    expect(cos.json().owned).not.toContain('lantern.gold'); // milestone 7 — not yet

    const equip = await app.inject({
      method: 'POST',
      url: '/cosmetics/equip',
      headers: { 'x-device-token': author },
      payload: { category: 'lantern_color', cosmeticId: 'lantern.rose' },
    });
    expect(equip.statusCode).toBe(200);
    expect(equip.json().equipped.lantern_color).toBe('lantern.rose');
  });

  it('refuses to equip a cosmetic the player does not own', async () => {
    const a = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/cosmetics/equip',
      headers: { 'x-device-token': a },
      payload: { category: 'lantern_color', cosmeticId: 'lantern.gold' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('refuses a mismatched category', async () => {
    const a = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/cosmetics/equip',
      headers: { 'x-device-token': a },
      payload: { category: 'cloak', cosmeticId: 'lantern.amber' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('P3 appreciation notifications', () => {
  it('summarizes thanks on return and clears them after', async () => {
    const author = await newSession();
    const traceId = await placeSignpost(author);
    for (let i = 0; i < 3; i += 1) {
      const fan = await newSession();
      await app.inject({
        method: 'POST',
        url: `/trace/${traceId}/appreciate`,
        headers: { 'x-device-token': fan },
      });
    }

    const first = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { 'x-device-token': author },
    });
    expect(first.json().totalNew).toBe(3);
    expect(first.json().traces[0]).toMatchObject({ traceType: 'signpost', count: 3 });

    // Second return: already seen → nothing new.
    const second = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { 'x-device-token': author },
    });
    expect(second.json().totalNew).toBe(0);
  });

  it('author still earns motes per appreciation (economy unchanged by notifications)', async () => {
    const author = await newSession();
    const traceId = await placeSignpost(author);
    const fan = await newSession();
    await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/appreciate`,
      headers: { 'x-device-token': fan },
    });
    const state = await app.inject({
      method: 'POST',
      url: '/session',
      headers: { 'x-device-token': author },
    });
    expect(state.json().motes).toBe(
      STARTING_MOTES - TRACE_PLACEMENT_COST.signpost + APPRECIATION_REWARD_MOTES,
    );
  });
});
