/**
 * Persistence-layer domain types + the `Repository` interface (P1 data layer).
 *
 * The repo is the seam between business logic and storage. Two implementations satisfy it: an
 * in-memory one (default; exercises all logic in tests and local dev with no DB) and a guarded
 * Postgres one (activated by DATABASE_URL). Route/service code depends only on this interface —
 * mirroring the guarded-optional-integration pattern applied to the datastore.
 */

import type { Trace, TracePayload, TraceType } from '@wanderlight/shared';

/** A player account. `deviceToken` is server-only and never leaves the API. */
export interface Player {
  readonly id: string;
  readonly deviceToken: string;
  readonly email: string | null;
  readonly createdAt: number;
  readonly motes: number;
  readonly cosmeticsOwned: readonly string[];
  readonly passTier: string;
}

/** Everything needed to persist a trace. Chunk coords are derived by the caller from (x, y). */
export interface PlaceTraceInput {
  readonly type: TraceType;
  readonly x: number;
  readonly y: number;
  readonly chunkX: number;
  readonly chunkY: number;
  readonly authorId: string;
  readonly payload: TracePayload;
  readonly warmth: number;
  readonly createdAt: number;
  readonly expiresAt: number | null;
  /** Motes to debit from the author atomically with the insert (already validated by the service). */
  readonly cost: number;
}

/** Result of an appreciation attempt. `applied: false` means it was a duplicate no-op. */
export interface AppreciateResult {
  readonly applied: boolean;
  readonly appreciations: number;
  readonly authorId: string;
}

export interface Repository {
  /** Session bootstrap (P1-SRV-02): return the player for a device token, creating one if new. */
  getOrCreatePlayerByToken(deviceToken: string): Promise<Player>;
  getPlayerById(id: string): Promise<Player | null>;

  /** Capped, freshness/appreciation/warmth-prioritized traces + warmth for each requested chunk. */
  getChunkTraces(
    chunks: ReadonlyArray<{ cx: number; cy: number }>,
    now: number,
  ): Promise<Array<{ chunkId: string; warmth: number; traces: Trace[] }>>;

  /** Persist a trace, debit the author's motes, and bump chunk_state — atomically. */
  placeTrace(input: PlaceTraceInput): Promise<{ trace: Trace; motes: number }>;

  /** Trace count by one player since `sinceMs` (rate limiting). */
  countPlayerTracesSince(playerId: string, sinceMs: number): Promise<number>;
  /** Trace count in one chunk since `sinceMs` (rate limiting / anti-spam). */
  countChunkTracesSince(cx: number, cy: number, sinceMs: number): Promise<number>;

  getTraceById(id: string): Promise<Trace | null>;

  /** Idempotent per (trace, player); on first apply, rewards the author `rewardMotes`. */
  appreciate(traceId: string, fromId: string, rewardMotes: number): Promise<AppreciateResult>;

  /** Release any underlying resources (pg pool). No-op for in-memory. */
  close(): Promise<void>;
}
