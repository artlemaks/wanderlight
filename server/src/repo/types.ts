/**
 * Persistence-layer domain types + the `Repository` interface (P1 data layer).
 *
 * The repo is the seam between business logic and storage. Two implementations satisfy it: an
 * in-memory one (default; exercises all logic in tests and local dev with no DB) and a guarded
 * Postgres one (activated by DATABASE_URL). Route/service code depends only on this interface —
 * mirroring the guarded-optional-integration pattern applied to the datastore.
 */

import type {
  Trace,
  TracePayload,
  TraceType,
  JournalEvent,
  JournalEventKind,
} from '@wanderlight/shared';

/** A player account. `deviceToken` is server-only and never leaves the API. */
export interface Player {
  readonly id: string;
  readonly deviceToken: string;
  readonly email: string | null;
  readonly createdAt: number;
  readonly motes: number;
  /** Consumable charges spent to place gifts (P2-SRV-01). */
  readonly giftCharges: number;
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
  /** Gift charges to debit from the author atomically with the insert (gifts only; default 0). */
  readonly giftChargeCost?: number;
  /** Flags the trace as system-authored seed content (P2-SRV-08). Defaults to false. */
  readonly systemAuthored?: boolean;
}

/** Result of an appreciation attempt. `applied: false` means it was a duplicate no-op. */
export interface AppreciateResult {
  readonly applied: boolean;
  readonly appreciations: number;
  readonly authorId: string;
}

/** Result of a gift-claim attempt (P2-SRV-01). `applied: false` means it was already claimed. */
export interface ClaimGiftResult {
  readonly applied: boolean;
  /** The claimant's mote balance after the (idempotent) reward. */
  readonly motes: number;
}

/** Result of a lantern-lighting attempt (P2-DATA-01). `applied: false` = this player already lit it. */
export interface LightLanternResult {
  readonly applied: boolean;
  readonly litCount: number;
}

/** A shrine's accumulating state (P2-SRV-02). */
export interface ShrineRow {
  readonly chunkX: number;
  readonly chunkY: number;
  readonly offerings: number;
  readonly warmth: number;
}

export interface Repository {
  /** Session bootstrap (P1-SRV-02): return the player for a device token, creating one if new. */
  getOrCreatePlayerByToken(deviceToken: string): Promise<Player>;
  getPlayerById(id: string): Promise<Player | null>;

  /**
   * Capped, freshness/appreciation/warmth-prioritized traces + warmth + aggregated footfall for each
   * requested chunk. `footfall` maps a footpath-tile key to its visit count (P2-CLI-03).
   */
  getChunkTraces(
    chunks: ReadonlyArray<{ cx: number; cy: number }>,
    now: number,
  ): Promise<
    Array<{ chunkId: string; warmth: number; traces: Trace[]; footfall: Record<string, number> }>
  >;

  /** Persist a trace, debit the author's motes, and bump chunk_state — atomically. */
  placeTrace(input: PlaceTraceInput): Promise<{ trace: Trace; motes: number }>;

  /** Trace count by one player since `sinceMs` (rate limiting). */
  countPlayerTracesSince(playerId: string, sinceMs: number): Promise<number>;
  /** Trace count in one chunk since `sinceMs` (rate limiting / anti-spam). */
  countChunkTracesSince(cx: number, cy: number, sinceMs: number): Promise<number>;

  getTraceById(id: string): Promise<Trace | null>;

  /** Idempotent per (trace, player); on first apply, rewards the author `rewardMotes`. */
  appreciate(traceId: string, fromId: string, rewardMotes: number): Promise<AppreciateResult>;

  /**
   * Claim a gift (P2-SRV-01): atomically mark it claimed by `claimantId` (once, first-claimer-wins),
   * credit the claimant `claimReward` motes, and credit the author `authorReward` motes. Idempotent —
   * a second claim (by anyone) is a no-op returning `applied: false`.
   */
  claimGift(
    traceId: string,
    claimantId: string,
    claimReward: number,
    authorReward: number,
  ): Promise<ClaimGiftResult>;

  /**
   * Light a lantern (P2-DATA-01): idempotent per (lantern, player). On first light, increments the
   * lantern's `lit_count` and raises its chunk warmth by `warmthDelta`. When the lighting is the very
   * first for that lantern (lit_count 0→1), also credits the lighter `firstLightBonus` motes (earn).
   */
  lightLantern(
    traceId: string,
    fromId: string,
    warmthDelta: number,
    firstLightBonus: number,
  ): Promise<LightLanternResult>;

  /** Read a shrine's accumulating state, or `null` if no offering has been made in that chunk yet. */
  getShrine(cx: number, cy: number): Promise<ShrineRow | null>;

  /**
   * Make an offering to a chunk's shrine (P2-SRV-02): atomically debit `cost` motes from the player,
   * increment the shrine's offerings, and raise its warmth by `warmthDelta`. Creates the shrine row
   * on first offering. Returns the new shrine state + the player's remaining motes.
   */
  makeShrineOffering(
    cx: number,
    cy: number,
    playerId: string,
    cost: number,
    warmthDelta: number,
  ): Promise<{ shrine: ShrineRow; motes: number }>;

  /**
   * Collect a mote of light (P2-CLI-05): idempotent per (player, mote). On first collect, credits the
   * player `rewardMotes`. A repeat collect of the same mote is a no-op.
   */
  collectMote(
    playerId: string,
    moteId: string,
    rewardMotes: number,
  ): Promise<{ applied: boolean; motes: number }>;

  /** Append a journal event to a player's personal history feed (P2-DATA-02). */
  recordJournalEvent(
    playerId: string,
    kind: JournalEventKind,
    refId: string | null,
    now: number,
  ): Promise<void>;

  /** A player's most-recent journal events, newest first (P2-CLI-06). */
  getJournal(playerId: string, limit: number): Promise<JournalEvent[]>;

  /** Buffer raw movement-heat samples (footpath tiles) for later aggregation (P2-CLI-02/SRV-03). */
  recordHeatSamples(tiles: ReadonlyArray<{ tx: number; ty: number }>): Promise<void>;

  /**
   * Footpath aggregation job (P2-SRV-03): fold all buffered heat samples into per-chunk footfall
   * counters and raise chunk warmth by the footfall's warmth contribution. Idempotent w.r.t. already
   * aggregated samples. Returns a summary for perf logging.
   */
  aggregateFootpaths(now: number): Promise<{ samplesProcessed: number; chunksTouched: number }>;

  /**
   * Fade + garbage-collect eligible traces (P2-SRV-07). Deletes every trace for which
   * {@link isGcEligible} holds at `now` — old, unappreciated, expired, non-system — and fades each
   * removed trace's warmth back out of its chunk. Never touches fresh/appreciated/lit/system traces.
   * Returns a summary for perf logging.
   */
  gcTraces(now: number): Promise<{ scanned: number; removed: number }>;

  /** Release any underlying resources (pg pool). No-op for in-memory. */
  close(): Promise<void>;
}
