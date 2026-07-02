/**
 * Retention-signal instrumentation test (P2-ANL-01).
 *
 * Verifies the two events that make "% of traces receiving ≥1 appreciation" computable in PostHog
 * actually fire with the right distinct-ids: `appreciate_trace` under the giver, and
 * `receive_appreciation` under the *author*. Uses a recording analytics client so we assert on the
 * emitted events without any network.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { AnalyticsClient } from '../observability/analytics';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';

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

interface Captured {
  distinctId: string;
  name: string;
  properties: Record<string, unknown>;
}

function recordingAnalytics(): { client: AnalyticsClient; events: Captured[] } {
  const events: Captured[] = [];
  const client: AnalyticsClient = {
    capture(distinctId, event) {
      events.push({ distinctId, name: event.name, properties: event.properties });
    },
    async shutdown() {},
  };
  return { client, events };
}

let app: FastifyInstance;
let events: Captured[];

beforeEach(() => {
  const rec = recordingAnalytics();
  events = rec.events;
  app = buildApp({
    repo: createMemoryRepository(),
    corpus,
    analytics: rec.client,
    reporter: noopReporter,
    logger: false,
  });
});

async function newSession(): Promise<{ token: string; playerId: string }> {
  const res = await app.inject({ method: 'POST', url: '/session' });
  return { token: res.headers['x-device-token'] as string, playerId: res.json().playerId };
}

describe('retention instrumentation', () => {
  it('fires appreciate_trace (giver) and receive_appreciation (author) on first appreciation', async () => {
    const author = await newSession();
    const traceId = (
      await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': author.token },
        payload: signpost,
      })
    ).json().trace.id;

    const fan = await newSession();
    await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/appreciate`,
      headers: { 'x-device-token': fan.token },
    });

    const appreciate = events.find((e) => e.name === 'appreciate_trace');
    const receive = events.find((e) => e.name === 'receive_appreciation');
    expect(appreciate).toMatchObject({ distinctId: fan.playerId, properties: { traceId } });
    expect(receive).toMatchObject({ distinctId: author.playerId, properties: { traceId } });
  });

  it('does not double-fire receive_appreciation on a duplicate appreciation', async () => {
    const author = await newSession();
    const traceId = (
      await app.inject({
        method: 'POST',
        url: '/trace',
        headers: { 'x-device-token': author.token },
        payload: signpost,
      })
    ).json().trace.id;
    const fan = await newSession();
    for (let i = 0; i < 2; i++) {
      await app.inject({
        method: 'POST',
        url: `/trace/${traceId}/appreciate`,
        headers: { 'x-device-token': fan.token },
      });
    }
    expect(events.filter((e) => e.name === 'receive_appreciation')).toHaveLength(1);
  });
});
