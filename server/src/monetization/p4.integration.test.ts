/**
 * P4 integration test (P4-TST-02/03 + guardrail checks).
 *
 * Drives the real Fastify app via `app.inject` against the in-memory repo + stub payment provider —
 * no network, no DB, no real charges — over the P4 slice: Trail Pass claim (free + premium lanes),
 * embers store purchase, rewarded-ad daily cap, report + admin moderation, and payment reconciliation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { REWARDED_AD_DAILY_CAP, seasonTierForXp, STORE_ITEMS } from '@wanderlight/shared';
import { buildApp } from '../app';
import { createMemoryRepository } from '../repo/memory';
import { buildCorpus } from '../content/corpus';
import { noopReporter } from '../observability/reporter';
import { noopAnalytics } from '../observability/analytics';
import { createStubPaymentProvider, type PaymentProvider } from '../payments/provider';
import { runReconciliation } from '../jobs/reconcile';
import type { Repository } from '../repo/types';

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
let repo: Repository;
let payments: PaymentProvider;

function makeApp(adminToken?: string): FastifyInstance {
  repo = createMemoryRepository();
  payments = createStubPaymentProvider();
  return buildApp({
    repo,
    corpus,
    analytics: noopAnalytics,
    reporter: noopReporter,
    payments,
    adminToken,
    logger: false,
  });
}

beforeEach(() => {
  app = makeApp();
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
/** Earn a player to at least season tier 1 via appreciations, returning their token. */
async function toTierOne(): Promise<string> {
  const author = await newSession();
  const traceId = await placeSignpost(author);
  for (let i = 0; i < 9; i += 1) {
    const fan = await newSession();
    await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/appreciate`,
      headers: { 'x-device-token': fan },
    });
  }
  return author;
}

describe('P4 Trail Pass', () => {
  it('claims a reached free-lane reward and rejects a double claim', async () => {
    const token = await toTierOne();
    const pass = await app.inject({
      method: 'GET',
      url: '/pass',
      headers: { 'x-device-token': token },
    });
    expect(seasonTierForXp(pass.json().progress.xp)).toBeGreaterThanOrEqual(1);

    const claim = await app.inject({
      method: 'POST',
      url: '/pass/claim',
      headers: { 'x-device-token': token },
      payload: { lane: 'free', tier: 1 },
    });
    expect(claim.statusCode).toBe(200);
    expect(claim.json().claimed).toBe(true);

    const again = await app.inject({
      method: 'POST',
      url: '/pass/claim',
      headers: { 'x-device-token': token },
      payload: { lane: 'free', tier: 1 },
    });
    expect(again.statusCode).toBe(409);
  });

  it('locks the premium lane until the pass is upgraded (guardrail: no free premium)', async () => {
    const token = await toTierOne();
    const locked = await app.inject({
      method: 'POST',
      url: '/pass/claim',
      headers: { 'x-device-token': token },
      payload: { lane: 'premium', tier: 1 },
    });
    expect(locked.statusCode).toBe(403);

    const upgrade = await app.inject({
      method: 'POST',
      url: '/pass/upgrade',
      headers: { 'x-device-token': token },
    });
    expect(upgrade.json().passTier).toBe('premium');

    const claim = await app.inject({
      method: 'POST',
      url: '/pass/claim',
      headers: { 'x-device-token': token },
      payload: { lane: 'premium', tier: 1 },
    });
    expect(claim.statusCode).toBe(200);
    expect(claim.json().owned).toContain('lantern.rose');
  });

  it('rejects claiming an unreached tier', async () => {
    const token = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/pass/claim',
      headers: { 'x-device-token': token },
      payload: { lane: 'free', tier: 5 },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('P4 store + embers', () => {
  it('buys embers then spends them on a cosmetic (embers ≠ motes)', async () => {
    const token = await newSession();
    const item = STORE_ITEMS[0]!;

    const buy = await app.inject({
      method: 'POST',
      url: '/store/embers',
      headers: { 'x-device-token': token },
      payload: { packId: 'embers.large' },
    });
    expect(buy.json().embers).toBeGreaterThanOrEqual(item.priceEmbers);

    const purchase = await app.inject({
      method: 'POST',
      url: '/store/purchase',
      headers: { 'x-device-token': token },
      payload: { cosmeticId: item.cosmeticId },
    });
    expect(purchase.statusCode).toBe(200);

    const store = await app.inject({
      method: 'GET',
      url: '/store',
      headers: { 'x-device-token': token },
    });
    expect(store.json().owned).toContain(item.cosmeticId);

    // Second purchase of the same cosmetic → already owned.
    const dup = await app.inject({
      method: 'POST',
      url: '/store/purchase',
      headers: { 'x-device-token': token },
      payload: { cosmeticId: item.cosmeticId },
    });
    expect(dup.statusCode).toBe(409);
  });

  it('rejects a purchase with insufficient embers', async () => {
    const token = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/store/purchase',
      headers: { 'x-device-token': token },
      payload: { cosmeticId: STORE_ITEMS[0]!.cosmeticId },
    });
    expect(res.statusCode).toBe(402);
  });
});

describe('P4 rewarded ads', () => {
  it('grants motes opt-in and enforces the daily cap', async () => {
    const token = await newSession();
    for (let i = 0; i < REWARDED_AD_DAILY_CAP; i += 1) {
      const res = await app.inject({
        method: 'POST',
        url: '/ads/reward',
        headers: { 'x-device-token': token },
        payload: { verified: true },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().granted).toBe(true);
    }
    const capped = await app.inject({
      method: 'POST',
      url: '/ads/reward',
      headers: { 'x-device-token': token },
      payload: { verified: true },
    });
    expect(capped.statusCode).toBe(429);
  });

  it('refuses to grant an unverified completion', async () => {
    const token = await newSession();
    const res = await app.inject({
      method: 'POST',
      url: '/ads/reward',
      headers: { 'x-device-token': token },
      payload: { verified: false },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('P4 reporting + admin moderation', () => {
  it('files a report and lets an authorized admin remove the trace', async () => {
    app = makeApp('sekret'); // admin enabled
    const author = await newSession();
    const traceId = await placeSignpost(author);
    const reporter = await newSession();

    const report = await app.inject({
      method: 'POST',
      url: `/trace/${traceId}/report`,
      headers: { 'x-device-token': reporter },
      payload: { reason: 'misplaced' },
    });
    expect(report.statusCode).toBe(201);

    // No token → unauthorized.
    const noAuth = await app.inject({ method: 'GET', url: '/admin/reports' });
    expect(noAuth.statusCode).toBe(401);

    const queue = await app.inject({
      method: 'GET',
      url: '/admin/reports',
      headers: { 'x-admin-token': 'sekret' },
    });
    expect(queue.json().reports).toHaveLength(1);

    const resolve = await app.inject({
      method: 'POST',
      url: `/admin/reports/${queue.json().reports[0].id}/resolve`,
      headers: { 'x-admin-token': 'sekret' },
      payload: { action: 'remove' },
    });
    expect(resolve.json()).toMatchObject({ status: 'actioned', removedTrace: true });

    // The removed trace is gone from the chunk read.
    const read = await app.inject({ method: 'GET', url: '/world/chunks?ids=0,0' });
    expect(read.json().chunks[0].traces.map((t: { id: string }) => t.id)).not.toContain(traceId);
  });

  it('fails closed: admin routes do not exist without a configured token', async () => {
    app = makeApp(undefined);
    const res = await app.inject({ method: 'GET', url: '/admin/reports' });
    expect(res.statusCode).toBe(404);
  });
});

describe('P4 payment reconciliation', () => {
  it('reconciles cleanly after a real purchase (P4-TST-02)', async () => {
    const token = await newSession();
    await app.inject({
      method: 'POST',
      url: '/store/embers',
      headers: { 'x-device-token': token },
      payload: { packId: 'embers.small' },
    });
    // Reconcile the same repo ledger against the same stub provider ledger.
    const report = await runReconciliation(repo, payments, Date.now() + 1000, 10 * 60 * 1000);
    expect(report.discrepancies).toHaveLength(0);
    expect(report.dbCount).toBe(1);
    expect(report.providerCount).toBe(1);
  });
});
