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
import type { AppreciateResult, PlaceTraceInput, Player, Repository } from './types';

export function createMemoryRepository(): Repository {
  const players = new Map<string, Player>();
  const playersByToken = new Map<string, string>();
  const traces = new Map<string, Trace>();
  const chunkWarmth = new Map<string, number>();
  /** Set of `${traceId}:${fromId}` keys enforcing appreciation idempotency. */
  const appreciations = new Set<string>();

  function put(player: Player): Player {
    players.set(player.id, player);
    playersByToken.set(player.deviceToken, player.id);
    return player;
  }

  return {
    async getOrCreatePlayerByToken(deviceToken) {
      const existingId = playersByToken.get(deviceToken);
      if (existingId) return players.get(existingId)!;
      const { STARTING_MOTES } = await import('@wanderlight/shared');
      return put({
        id: randomUUID(),
        deviceToken,
        email: null,
        createdAt: Date.now(),
        motes: STARTING_MOTES,
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
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      };
      traces.set(trace.id, trace);
      const id = chunkId(input.chunkX, input.chunkY);
      chunkWarmth.set(id, (chunkWarmth.get(id) ?? 0) + input.warmth);
      const updated = put({ ...author, motes: author.motes - input.cost });
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

    async close() {
      /* nothing to release */
    },
  };
}
