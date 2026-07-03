/**
 * P2.C economy + journal integration tests.
 *
 * Drives the real Fastify app via `app.inject` against the in-memory repo. Covers: journal events
 * recorded for the meaningful actions (place / appreciate / receive / offering / collect), the earn
 * rules (mote collection, first-light bonus) crediting server-authoritatively, and mote-collection
 * validation + idempotency.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  STARTING_MOTES,
  MOTE_COLLECT_VALUE,
  FIRST_LIGHT_BONUS_MOTES,
  motesInChunk,
  WORLD_SEED,
} from '@wanderlight/shared';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';
import { noopAnalytics } from '../observability/analytics';

const corpus = buildCorpus(
  {
    templates: [{ id: 'e1', category: 'encourage', text: 'a {place}', slots: ['place'] }],
  },
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

async function journalKinds(token: string): Promise<string[]> {
  const res = await app.inject({
    method: 'GET',
    url: '/journal',
    headers: { 'x-device-token': token },
  });
  return res.json().events.map((e: { kind: string }) => e.kind);
}

describe('P2-DATA-02 journal', () => {
  it('records place_trace and both sides of an appreciation', async () => {
    const author = await newSession();
    const traceId = (
      await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': author },
        payload: signpost,
      })
    ).json().trace.id;
    expect(await journalKinds(author)).toContain('place_trace');

    const fan = await newSession();
    await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/appreciate`,
      headers: { 'x-device-token': fan },
    });
    expect(await journalKinds(fan)).toContain('appreciate');
    expect(await journalKinds(author)).toContain('receive_appreciation');
  });

  it('records an offering', async () => {
    const token = await newSession();
    await app.inject({
      method: 'POST',
      url: '/shrine/offering',
      headers: { 'x-device-token': token },
      payload: { x: 3, y: 3 },
    });
    expect(await journalKinds(token)).toContain('offering');
  });

  it('returns entries newest-first', async () => {
    const token = await newSession();
    await app.inject({
      method: 'POST',
      url: '/trace',
      headers: { 'x-device-token': token },
      payload: signpost,
    });
    await app.inject({
      method: 'POST',
      url: '/shrine/offering',
      headers: { 'x-device-token': token },
      payload: { x: 3, y: 3 },
    });
    const kinds = await journalKinds(token);
    expect(kinds[0]).toBe('offering'); // most recent
  });
});

describe('P2-CLI-05 mote collection (earn)', () => {
  it('credits motes once per mote and is idempotent', async () => {
    const token = await newSession();
    const moteId = motesInChunk(WORLD_SEED, 0, 0)[0]!.id;

    const first = await app.inject({
      method: 'POST',
      url: '/mote/collect',
      headers: { 'x-device-token': token },
      payload: { moteId },
    });
    expect(first.json()).toMatchObject({
      applied: true,
      motes: STARTING_MOTES + MOTE_COLLECT_VALUE,
    });
    expect(await journalKinds(token)).toContain('collect_mote');

    const again = await app.inject({
      method: 'POST',
      url: '/mote/collect',
      headers: { 'x-device-token': token },
      payload: { moteId },
    });
    expect(again.json()).toMatchObject({
      applied: false,
      motes: STARTING_MOTES + MOTE_COLLECT_VALUE,
    });
  });

  it('rejects a fabricated mote id', async () => {
    const token = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/mote/collect',
      headers: { 'x-device-token': token },
      payload: { moteId: 'm:999,999:1,1' },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('P2-SRV-05 first-light earn', () => {
  it('gives the first lighter of a lantern a bonus', async () => {
    const author = await newSession();
    const traceId = (
      await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': author },
        payload: { type: 'lantern', x: 0, y: 0, payload: {} },
      })
    ).json().trace.id;

    const lighter = await newSession();
    await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/light`,
      headers: { 'x-device-token': lighter },
    });
    const state = await app.inject({
      method: 'POST',
      url: '/session',
      headers: { 'x-device-token': lighter },
    });
    expect(state.json().motes).toBe(STARTING_MOTES + FIRST_LIGHT_BONUS_MOTES);
    expect(await journalKinds(lighter)).toContain('first_light');
  });
});
