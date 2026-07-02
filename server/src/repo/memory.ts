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
import {
  chunkId,
  prioritizeTraces,
  isGcEligible,
  worldToChunk,
  footpathTileKey,
  footfallWarmth,
  FOOTPATH_TILE_RESOLUTION,
  attunementLevel,
  cosmeticsOwnedAtLevel,
  defaultEquipped,
  ATTUNEMENT_EARN,
  type Trace,
  type JournalEvent,
  type AppreciationNotice,
  type CosmeticCategory,
  type AttunementEarnKind,
} from '@wanderlight/shared';
import { randomUUID as uuid } from 'node:crypto';
import type {
  AppreciateResult,
  ClaimGiftResult,
  LightLanternResult,
  PlaceTraceInput,
  Player,
  Repository,
  ShrineRow,
  UpgradeResult,
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
  /** Raw, not-yet-aggregated movement-heat samples (footpath tiles). */
  let heatBuffer: Array<{ tx: number; ty: number }> = [];
  /** Aggregated footfall: chunk id → (footpath-tile key → visit count). */
  const footfall = new Map<string, Map<string, number>>();
  /** Append-only journal events per player, in insertion order. */
  const journal = new Map<string, JournalEvent[]>();
  /** Set of `${playerId}:${moteId}` keys enforcing mote-collection idempotency. */
  const moteCollects = new Set<string>();
  /** Normalized email → player id (P3-SRV-01 linking). */
  const playersByEmail = new Map<string, string>();
  /** Appreciation notices per author, newest-appended (P3-SRV-04). */
  const notices: AppreciationNotice[] = [];

  /** Stored players hold `cosmeticsOwned` as *explicit* grants only; materialize adds derived ones. */
  function put(player: Player): Player {
    players.set(player.id, player);
    playersByToken.set(player.deviceToken, player.id);
    if (player.email) playersByEmail.set(player.email, player.id);
    return player;
  }

  /** Return shape: fold attunement-earned cosmetics into `cosmeticsOwned` (derived on read). */
  function materialize(player: Player): Player {
    const earned = cosmeticsOwnedAtLevel(attunementLevel(player.attunement));
    const owned = new Set<string>([...player.cosmeticsOwned, ...earned]);
    return { ...player, cosmeticsOwned: [...owned] };
  }

  /** Raise a player's attunement by the earn value for `kind` (P3-SRV-05). No-op if the player is gone. */
  function raiseAttunement(playerId: string, kind: AttunementEarnKind): void {
    const p = players.get(playerId);
    if (!p) return;
    put({ ...p, attunement: p.attunement + ATTUNEMENT_EARN[kind] });
  }

  function bumpWarmth(cx: number, cy: number, delta: number): void {
    const id = chunkId(cx, cy);
    chunkWarmth.set(id, (chunkWarmth.get(id) ?? 0) + delta);
  }

  return {
    async getOrCreatePlayerByToken(deviceToken) {
      const existingId = playersByToken.get(deviceToken);
      if (existingId) return materialize(players.get(existingId)!);
      const { STARTING_MOTES, STARTING_GIFT_CHARGES } = await import('@wanderlight/shared');
      return materialize(
        put({
          id: randomUUID(),
          deviceToken,
          email: null,
          createdAt: Date.now(),
          motes: STARTING_MOTES,
          giftCharges: STARTING_GIFT_CHARGES,
          cosmeticsOwned: [],
          attunement: 0,
          equipped: defaultEquipped(),
          passTier: 'free',
        }),
      );
    },

    async getPlayerById(id) {
      const p = players.get(id);
      return p ? materialize(p) : null;
    },

    async getPlayerByEmail(email) {
      const id = playersByEmail.get(email);
      return id ? materialize(players.get(id)!) : null;
    },

    async upgradePlayerToEmail(playerId, normalizedEmail): Promise<UpgradeResult> {
      const player = players.get(playerId);
      if (!player) throw new Error(`Unknown player ${playerId}`);
      const ownerId = playersByEmail.get(normalizedEmail);
      if (ownerId && ownerId !== playerId) {
        // Link: the existing email account is canonical; re-point this device's token to it.
        const canonical = players.get(ownerId)!;
        playersByToken.set(player.deviceToken, canonical.id);
        return { player: materialize(canonical), linked: true };
      }
      // Fresh upgrade: attach the email, keep every bit of the account's data.
      return { player: materialize(put({ ...player, email: normalizedEmail })), linked: false };
    },

    async equipCosmetic(playerId, category: CosmeticCategory, cosmeticId) {
      const player = players.get(playerId);
      if (!player) throw new Error(`Unknown player ${playerId}`);
      return materialize(
        put({ ...player, equipped: { ...player.equipped, [category]: cosmeticId } }),
      );
    },

    async getAppreciationNotices(authorId, onlyUnseen) {
      return notices.filter((n) => n.authorId === authorId && (!onlyUnseen || !n.seen));
    },

    async markAppreciationNoticesSeen(authorId) {
      for (let i = 0; i < notices.length; i += 1) {
        if (notices[i]!.authorId === authorId && !notices[i]!.seen) {
          notices[i] = { ...notices[i]!, seen: true };
        }
      }
    },

    async getChunkTraces(chunks, now) {
      return chunks.map(({ cx, cy }) => {
        const id = chunkId(cx, cy);
        const inChunk = [...traces.values()].filter((t) => t.chunkX === cx && t.chunkY === cy);
        return {
          chunkId: id,
          warmth: chunkWarmth.get(id) ?? 0,
          traces: prioritizeTraces(inChunk, now),
          footfall: Object.fromEntries(footfall.get(id) ?? new Map()),
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
      // Placing a trace deepens the traveler's attunement (P3-SRV-05). System seeds don't count.
      if (!trace.systemAuthored) raiseAttunement(input.authorId, 'place_trace');
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
      // Retention surface: record a notice for the author + deepen their attunement (P3-SRV-04/05).
      notices.push({
        id: uuid(),
        authorId: trace.authorId,
        traceId,
        traceType: trace.type,
        createdAt: Date.now(),
        seen: false,
      });
      raiseAttunement(trace.authorId, 'receive_appreciation');
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
      raiseAttunement(claimantId, 'gift_claim');
      return { applied: true, motes: updatedClaimant.motes };
    },

    async lightLantern(traceId, fromId, warmthDelta, firstLightBonus): Promise<LightLanternResult> {
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
      // First-ever lighting of this lantern earns the lighter a small bonus + attunement.
      if (updated.litCount === 1 && firstLightBonus > 0) {
        const lighter = players.get(fromId);
        if (lighter) put({ ...lighter, motes: lighter.motes + firstLightBonus });
        raiseAttunement(fromId, 'first_light');
      }
      return { applied: true, litCount: updated.litCount };
    },

    async collectMote(playerId, moteId, rewardMotes) {
      const player = players.get(playerId);
      if (!player) throw new Error(`Unknown player ${playerId}`);
      const key = `${playerId}:${moteId}`;
      if (moteCollects.has(key)) {
        return { applied: false, motes: player.motes };
      }
      moteCollects.add(key);
      const updated = put({ ...player, motes: player.motes + rewardMotes });
      return { applied: true, motes: updated.motes };
    },

    async recordJournalEvent(playerId, kind, refId, now) {
      const events = journal.get(playerId) ?? [];
      events.push({ id: randomUUID(), playerId, kind, refId, createdAt: now });
      journal.set(playerId, events);
    },

    async getJournal(playerId, limit) {
      const events = journal.get(playerId) ?? [];
      // Newest first, capped.
      return [...events].reverse().slice(0, Math.max(0, limit));
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
      raiseAttunement(playerId, 'offering');
      return { shrine, motes: updated.motes };
    },

    async recordHeatSamples(tiles) {
      heatBuffer.push(...tiles.map(({ tx, ty }) => ({ tx, ty })));
    },

    async gcTraces(now) {
      let scanned = 0;
      let removed = 0;
      for (const trace of [...traces.values()]) {
        scanned += 1;
        if (!isGcEligible(trace, now)) continue;
        traces.delete(trace.id);
        // Fade the removed trace's warmth back out of its chunk (floored at 0).
        const id = chunkId(trace.chunkX, trace.chunkY);
        chunkWarmth.set(id, Math.max(0, (chunkWarmth.get(id) ?? 0) - trace.warmth));
        removed += 1;
      }
      return { scanned, removed };
    },

    async aggregateFootpaths() {
      const batch = heatBuffer;
      heatBuffer = [];
      const visitsPerChunk = new Map<string, number>();
      for (const { tx, ty } of batch) {
        const { cx, cy } = worldToChunk(
          tx * FOOTPATH_TILE_RESOLUTION,
          ty * FOOTPATH_TILE_RESOLUTION,
        );
        const id = chunkId(cx, cy);
        const tiles = footfall.get(id) ?? new Map<string, number>();
        const key = footpathTileKey(tx, ty);
        tiles.set(key, (tiles.get(key) ?? 0) + 1);
        footfall.set(id, tiles);
        visitsPerChunk.set(id, (visitsPerChunk.get(id) ?? 0) + 1);
      }
      for (const [id, visits] of visitsPerChunk) {
        chunkWarmth.set(id, (chunkWarmth.get(id) ?? 0) + footfallWarmth(visits));
      }
      return { samplesProcessed: batch.length, chunksTouched: visitsPerChunk.size };
    },

    async close() {
      /* nothing to release */
    },
  };
}
