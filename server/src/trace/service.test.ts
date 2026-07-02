import { describe, it, expect } from 'vitest';
import { RATE_LIMITS } from '@wanderlight/shared';
import { buildCorpus } from '../content/corpus';
import type { Player, Repository } from '../repo/types';
import { placeTrace } from './service';

const corpus = buildCorpus(
  { templates: [{ id: 'e1', category: 'encourage', text: 'a {place}', slots: ['place'] }] },
  { banks: { place: ['grove'] } },
);

const richPlayer: Player = {
  id: 'p1',
  deviceToken: 'tok',
  email: null,
  createdAt: 0,
  motes: 10_000,
  giftCharges: 3,
  cosmeticsOwned: [],
  passTier: 'free',
};

/** A repo stub whose counts/player are controllable; placeTrace is a stub echoing the input. */
function stubRepo(over: Partial<Repository> = {}): Repository {
  return {
    async getOrCreatePlayerByToken() {
      return richPlayer;
    },
    async getPlayerById() {
      return richPlayer;
    },
    async getChunkTraces() {
      return [];
    },
    async placeTrace(input) {
      return {
        trace: {
          id: 'new',
          type: input.type,
          chunkX: input.chunkX,
          chunkY: input.chunkY,
          x: input.x,
          y: input.y,
          authorId: input.authorId,
          payload: input.payload,
          warmth: input.warmth,
          appreciations: 0,
          litCount: 0,
          claimedBy: null,
          systemAuthored: input.systemAuthored ?? false,
          createdAt: input.createdAt,
          expiresAt: input.expiresAt,
        },
        motes: richPlayer.motes - input.cost,
      };
    },
    async countPlayerTracesSince() {
      return 0;
    },
    async countChunkTracesSince() {
      return 0;
    },
    async getTraceById() {
      return null;
    },
    async appreciate() {
      return { applied: true, appreciations: 1, authorId: 'p1' };
    },
    async claimGift() {
      return { applied: true, motes: richPlayer.motes };
    },
    async lightLantern() {
      return { applied: true, litCount: 1 };
    },
    async getShrine() {
      return null;
    },
    async makeShrineOffering(cx, cy) {
      return {
        shrine: { chunkX: cx, chunkY: cy, offerings: 1, warmth: 1 },
        motes: richPlayer.motes,
      };
    },
    async collectMote() {
      return { applied: true, motes: richPlayer.motes };
    },
    async recordJournalEvent() {},
    async getJournal() {
      return [];
    },
    async recordHeatSamples() {},
    async aggregateFootpaths() {
      return { samplesProcessed: 0, chunksTouched: 0 };
    },
    async gcTraces() {
      return { scanned: 0, removed: 0 };
    },
    async close() {},
    ...over,
  };
}

const req = {
  type: 'signpost' as const,
  x: 0,
  y: 0,
  payload: { templateId: 'e1', slots: { place: 'grove' } },
};

describe('placeTrace economy + rate limits', () => {
  it('rejects when the player is over their placement rate limit', async () => {
    const repo = stubRepo({
      async countPlayerTracesSince() {
        return RATE_LIMITS.perPlayer.max;
      },
    });
    const res = await placeTrace(repo, corpus, 'p1', req, Date.now());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('rate_limited');
  });

  it('rejects when the chunk is over its rate limit', async () => {
    const repo = stubRepo({
      async countChunkTracesSince() {
        return RATE_LIMITS.perChunk.max;
      },
    });
    const res = await placeTrace(repo, corpus, 'p1', req, Date.now());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('rate_limited');
  });

  it('rejects when the player cannot afford the trace', async () => {
    const poor = { ...richPlayer, motes: 1 };
    const repo = stubRepo({
      async getPlayerById() {
        return poor;
      },
    });
    const res = await placeTrace(repo, corpus, 'p1', req, Date.now());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('insufficient_motes');
  });

  it('accepts a valid placement within all gates', async () => {
    const res = await placeTrace(stubRepo(), corpus, 'p1', req, Date.now());
    expect(res.ok).toBe(true);
  });
});
