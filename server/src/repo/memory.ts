/**
 * In-memory Repository implementation.
 *
 * The default datastore when no DATABASE_URL is configured, and the store every integration test
 * runs against — so the full trace loop (place → read → appreciate), the economy debit, rate-limit
 * counts, and appreciation idempotency are all exercised in CI with zero external services. It
 * mirrors the Postgres semantics (density-capped prioritized reads, UNIQUE(trace,from) idempotency)
 * so tests that pass here describe real behavior.
 */

import { randomUUID } from 'node:crypto';
import { chunkId, prioritizeTraces, type Trace } from '@wanderlight/shared';
import type {
  AppreciateResult,
  ClaimGiftResult,
  LightLanternResult,
  PlaceTraceInput,
  Player,
  Repository,
  ShrineRow,
} from './types';

export function createMemoryRepository(): Repository {
  const players = new Map<string, Player>();
  const playersByToken = new Map<string, string>();
  const traces = new Map<string, Trace>();
  const chunkWarmth = new Map<string, number>();
  /** Set of `${traceId}:${fromId}` keys enforcing appreciation idempotency. */
  const appreciations = new Set<string>();
  /** Set of `${traceId}:${fromId}` keys enforcing lantern-lighting idempotency. */
  const lanternLights = new Set<string>();
  /** Shrine structures keyed by chunk id. */
  const shrines = new Map<string, ShrineRow>();

  function put(player: Player): Player {
    players.set(player.id, player);
    playersByToken.set(player.deviceToken, player.id);
    return player;
  }

  function bumpWarmth(cx: number, cy: number, delta: number): void {
    const id = chunkId(cx, cy);
    chunkWarmth.set(id, (chunkWarmth.get(id) ?? 0) + delta);
  }

  return {
    async getOrCreatePlayerByToken(deviceToken) {
      const existingId = playersByToken.get(deviceToken);
      if (existingId) return players.get(existingId)!;
      const { STARTING_MOTES, STARTING_GIFT_CHARGES } = await import('@wanderlight/shared');
      return put({
        id: randomUUID(),
        deviceToken,
        email: null,
        createdAt: Date.now(),
        motes: STARTING_MOTES,
        giftCharges: STARTING_GIFT_CHARGES,
        cosmeticsOwned: [],
        passTier: 'free',
      });
    },

    async getPlayerById(id) {
      return players.get(id) ?? null;
    },

    async getChunkTraces(chunks, now) {
      return chunks.map(({ cx, cy }) => {
        const id = chunkId(cx, cy);
        const inChunk = [...traces.values()].filter((t) => t.chunkX === cx && t.chunkY === cy);
        return {
          chunkId: id,
          warmth: chunkWarmth.get(id) ?? 0,
          traces: prioritizeTraces(inChunk, now),
        };
      });
    },

    async placeTrace(input: PlaceTraceInput) {
      const author = players.get(input.authorId);
      if (!author) throw new Error(`Unknown author ${input.authorId}`);
      const trace: Trace = {
        id: randomUUID(),
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
      };
      traces.set(trace.id, trace);
      bumpWarmth(input.chunkX, input.chunkY, input.warmth);
      const updated = put({
        ...author,
        motes: author.motes - input.cost,
        giftCharges: author.giftCharges - (input.giftChargeCost ?? 0),
      });
      return { trace, motes: updated.motes };
    },

    async countPlayerTracesSince(playerId, sinceMs) {
      return [...traces.values()].filter((t) => t.authorId === playerId && t.createdAt >= sinceMs)
        .length;
    },

    async countChunkTracesSince(cx, cy, sinceMs) {
      return [...traces.values()].filter(
        (t) => t.chunkX === cx && t.chunkY === cy && t.createdAt >= sinceMs,
      ).length;
    },

    async getTraceById(id) {
      return traces.get(id) ?? null;
    },

    async appreciate(traceId, fromId, rewardMotes): Promise<AppreciateResult> {
      const trace = traces.get(traceId);
      if (!trace) throw new Error(`Unknown trace ${traceId}`);
      const key = `${traceId}:${fromId}`;
      if (appreciations.has(key)) {
        return { applied: false, appreciations: trace.appreciations, authorId: trace.authorId };
      }
      appreciations.add(key);
      const updated: Trace = { ...trace, appreciations: trace.appreciations + 1 };
      traces.set(traceId, updated);
      const author = players.get(trace.authorId);
      if (author) put({ ...author, motes: author.motes + rewardMotes });
      return { applied: true, appreciations: updated.appreciations, authorId: trace.authorId };
    },

    async claimGift(traceId, claimantId, claimReward, authorReward): Promise<ClaimGiftResult> {
      const trace = traces.get(traceId);
      if (!trace) throw new Error(`Unknown trace ${traceId}`);
      const claimant = players.get(claimantId);
      if (!claimant) throw new Error(`Unknown claimant ${claimantId}`);
      if (trace.claimedBy !== null) {
        return { applied: false, motes: claimant.motes };
      }
      traces.set(traceId, { ...trace, claimedBy: claimantId });
      const updatedClaimant = put({ ...claimant, motes: claimant.motes + claimReward });
      const author = players.get(trace.authorId);
      if (author) put({ ...author, motes: author.motes + authorReward });
      return { applied: true, motes: updatedClaimant.motes };
    },

    async lightLantern(traceId, fromId, warmthDelta): Promise<LightLanternResult> {
      const trace = traces.get(traceId);
      if (!trace) throw new Error(`Unknown trace ${traceId}`);
      const key = `${traceId}:${fromId}`;
      if (lanternLights.has(key)) {
        return { applied: false, litCount: trace.litCount };
      }
      lanternLights.add(key);
      const updated: Trace = { ...trace, litCount: trace.litCount + 1 };
      traces.set(traceId, updated);
      bumpWarmth(trace.chunkX, trace.chunkY, warmthDelta);
      return { applied: true, litCount: updated.litCount };
    },

    async getShrine(cx, cy) {
      return shrines.get(chunkId(cx, cy)) ?? null;
    },

    async makeShrineOffering(cx, cy, playerId, cost, warmthDelta) {
      const player = players.get(playerId);
      if (!player) throw new Error(`Unknown player ${playerId}`);
      const id = chunkId(cx, cy);
      const current = shrines.get(id) ?? { chunkX: cx, chunkY: cy, offerings: 0, warmth: 0 };
      const shrine: ShrineRow = {
        chunkX: cx,
        chunkY: cy,
        offerings: current.offerings + 1,
        warmth: current.warmth + warmthDelta,
      };
      shrines.set(id, shrine);
      bumpWarmth(cx, cy, warmthDelta);
      const updated = put({ ...player, motes: player.motes - cost });
      return { shrine, motes: updated.motes };
    },

    async close() {
      /* nothing to release */
    },
  };
}
