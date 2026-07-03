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
  CosmeticCategory,
  AppreciationNotice,
  PassLane,
  PassReward,
  Report,
  ReportReason,
  ModeratorAction,
  AdReward,
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
  /**
   * Everything this player may equip — the union of default items, explicit grants (season/store,
   * P4), and everything unlocked by the current {@link attunement} level (P3-SRV-05). Derived on read
   * so attunement unlocks never need a write.
   */
  readonly cosmeticsOwned: readonly string[];
  /** Attunement points earned by play; drives the non-power cosmetic unlock track (P3-SRV-05). */
  readonly attunement: number;
  /** Currently-equipped cosmetic id per category (P3-CLI-02). */
  readonly equipped: Record<CosmeticCategory, string>;
  /** `free` or `premium` — the Trail Pass tier (P4-SRV-02). */
  readonly passTier: string;
  /** Bought premium currency, **separate from motes** (P4-DATA-02, guardrail §9). */
  readonly embers: number;
  /** Season XP earned by play, driving Trail Pass tiers (P4-SRV-01). */
  readonly seasonXp: number;
  /** Claimed pass-reward keys (`${lane}:${tier}`) — the claim idempotency ledger (P4-SRV-02). */
  readonly passClaimed: readonly string[];
}

/** Result of applying a pass-reward claim / store purchase / kit grant. `applied:false` = idempotent no-op. */
export interface GrantResult {
  readonly applied: boolean;
  readonly player: Player;
}

/** Result of a rewarded-ad grant attempt (P4-SRV-08). `granted:false` = daily cap reached. */
export interface AdGrantResult {
  readonly granted: boolean;
  readonly player: Player;
  readonly grantsToday: number;
}

/** A settled real-money purchase, recorded for reconciliation (P4-SRV-06). */
export interface PurchaseRecord {
  readonly providerRef: string;
  readonly amountUsdCents: number;
}

/** Result of resolving a report (P4-OPS-01). */
export interface ResolveReportResult {
  readonly report: Report;
  readonly removedTrace: boolean;
}

/** Result of an anon→email upgrade / cross-device link (P3-SRV-02/03). */
export interface UpgradeResult {
  readonly player: Player;
  /** True when the email already had an account and this device was linked to it (not a fresh upgrade). */
  readonly linked: boolean;
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
  /** Look up a player by their (normalized) email, or null (P3-SRV-01). */
  getPlayerByEmail(email: string): Promise<Player | null>;

  /**
   * Anon→email upgrade / cross-device link (P3-SRV-02/03). If `normalizedEmail` is unused, attach it
   * to `playerId` (data-preserving upgrade). If it already belongs to another account, re-point this
   * player's device token to that canonical account and return it (`linked: true`) — deterministic
   * conflict rule: the existing email account wins. Never loses the upgrading account's own data.
   */
  upgradePlayerToEmail(playerId: string, normalizedEmail: string): Promise<UpgradeResult>;

  /**
   * Equip an owned cosmetic in its category slot (P3-CLI-02). The caller (service) has already
   * validated the id is real, owned, and matches `category`. Returns the updated player.
   */
  equipCosmetic(playerId: string, category: CosmeticCategory, cosmeticId: string): Promise<Player>;

  /**
   * The author's appreciation notices (P3-SRV-04). `onlyUnseen` limits to since-last-return notices;
   * these feed the return summary ("N travelers thanked your signpost").
   */
  getAppreciationNotices(authorId: string, onlyUnseen: boolean): Promise<AppreciationNotice[]>;
  /** Mark all of an author's notices seen (on return, after the summary is shown). */
  markAppreciationNoticesSeen(authorId: string): Promise<void>;

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

  // ── P4: season + Trail Pass ────────────────────────────────────────────────────────────────────
  /** Upgrade a player to the premium Trail Pass tier (after a verified purchase). */
  upgradePassTier(playerId: string): Promise<Player>;
  /**
   * Claim a pass reward at `lane`+`tier`. The service has already validated the tier is reached and
   * the lane is permitted; `reward` is the resolved reward to apply (cosmetic grant or mote boost).
   * Idempotent per (lane, tier) via the claimed ledger — a repeat claim is a no-op.
   */
  claimPassReward(
    playerId: string,
    lane: PassLane,
    tier: number,
    reward: PassReward,
  ): Promise<GrantResult>;

  // ── P4: embers + store ─────────────────────────────────────────────────────────────────────────
  /** Credit embers to a player (after a settled real-money ember-pack purchase). */
  grantEmbers(playerId: string, embers: number): Promise<Player>;
  /**
   * Buy a cosmetic with embers (P4-SRV-03). Debits `priceEmbers` and grants the cosmetic — atomically.
   * `applied:false` when the player can't afford it or already owns it (idempotent).
   */
  purchaseCosmetic(playerId: string, cosmeticId: string, priceEmbers: number): Promise<GrantResult>;
  /** Grant the one-time Wayfarer's Kit (P4-SRV-04): +daily gift charges + a cosmetic. Idempotent. */
  grantWayfarersKit(
    playerId: string,
    cosmeticId: string,
    giftCharges: number,
  ): Promise<GrantResult>;

  // ── P4: reconciliation ─────────────────────────────────────────────────────────────────────────
  /** Record a settled real-money purchase for reconciliation (P4-SRV-06). */
  recordPurchase(
    playerId: string,
    providerRef: string,
    sku: string,
    amountUsdCents: number,
  ): Promise<void>;
  /** The DB-side purchase ledger since `sinceMs` (reconciled against the provider's ledger). */
  getPurchaseLedger(sinceMs: number): Promise<PurchaseRecord[]>;

  // ── P4: rewarded ads ───────────────────────────────────────────────────────────────────────────
  /**
   * Grant a rewarded-ad reward if under the daily cap (P4-SRV-08). `dayBucket` scopes the cap window.
   * Returns `granted:false` (no-op) once the cap is hit.
   */
  grantAdReward(
    playerId: string,
    dayBucket: number,
    dailyCap: number,
    reward: AdReward,
  ): Promise<AdGrantResult>;

  // ── P4: reporting + moderation ─────────────────────────────────────────────────────────────────
  /** File a report against a trace (P4-SRV-09). */
  createReport(
    traceId: string,
    reporterId: string,
    reason: ReportReason,
    now: number,
  ): Promise<Report>;
  /** The open report queue, oldest-first, capped (P4-OPS-01). */
  getOpenReports(limit: number): Promise<Report[]>;
  /**
   * Resolve a report (P4-OPS-01): `remove` deletes the offending trace (fading its warmth) and marks
   * the report actioned; `dismiss` just closes it. Returns null if the report id is unknown.
   */
  resolveReport(reportId: string, action: ModeratorAction): Promise<ResolveReportResult | null>;
  /** Admin: remove a trace directly, fading its warmth back out of its chunk (P4-OPS-01). */
  removeTrace(traceId: string): Promise<boolean>;

  /** Release any underlying resources (pg pool). No-op for in-memory. */
  close(): Promise<void>;
}
