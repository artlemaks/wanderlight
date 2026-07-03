/**
 * Postgres Repository implementation — guarded (P1 data layer).
 *
 * Loaded only when DATABASE_URL is set (see factory). `pg` is imported via a variable-specifier
 * dynamic import so it never enters the lockfile/CI until the datastore is activated (`npm i pg`),
 * exactly like the Sentry/PostHog seams. Semantics mirror the in-memory repo: prioritization is done
 * in-app with the shared `prioritizeTraces`, and appreciation idempotency rides the
 * UNIQUE(trace_id, from_id) constraint (0004_appreciation.sql).
 */

import {
  chunkId,
  prioritizeTraces,
  worldToChunk,
  footpathTileKey,
  footfallWarmth,
  FOOTPATH_TILE_RESOLUTION,
  STARTING_MOTES,
  attunementLevel,
  cosmeticsOwnedAtLevel,
  defaultEquipped,
  ATTUNEMENT_EARN,
  SEASON_XP_EARN,
  statusForAction,
  type Trace,
  type TracePayload,
  type TraceType,
  type JournalEvent,
  type AppreciationNotice,
  type CosmeticCategory,
  type PassLane,
  type PassReward,
  type Report,
  type ReportReason,
  type ModeratorAction,
  type AdReward,
} from '@wanderlight/shared';
import type {
  AppreciateResult,
  ClaimGiftResult,
  LightLanternResult,
  PlaceTraceInput,
  Player,
  Repository,
  ShrineRow,
  UpgradeResult,
  GrantResult,
  AdGrantResult,
  PurchaseRecord,
  ResolveReportResult,
} from './types';

/** Minimal pool surface we depend on, so we don't import pg's types (guarded). */
interface Pool {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
}
interface PoolClient {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number }>;
  release(): void;
}

function toPlayer(r: Record<string, unknown>): Player {
  const attunement = Number(r.attunement ?? 0);
  const explicit = (r.cosmetics_owned as string[]) ?? [];
  // Ownership is the union of explicit grants + everything the attunement level has unlocked.
  const owned = new Set<string>([
    ...explicit,
    ...cosmeticsOwnedAtLevel(attunementLevel(attunement)),
  ]);
  return {
    id: String(r.id),
    deviceToken: String(r.device_token),
    email: r.email == null ? null : String(r.email),
    createdAt: new Date(r.created_at as string).getTime(),
    motes: Number(r.motes),
    giftCharges: Number(r.gift_charges),
    cosmeticsOwned: [...owned],
    attunement,
    equipped: (r.equipped as Record<CosmeticCategory, string>) ?? defaultEquipped(),
    passTier: String(r.pass_tier),
    embers: Number(r.embers ?? 0),
    seasonXp: Number(r.season_xp ?? 0),
    passClaimed: (r.pass_claimed as string[]) ?? [],
  };
}

/** One appreciation-notice row → the shared shape. */
function toNotice(r: Record<string, unknown>): AppreciationNotice {
  return {
    id: String(r.id),
    authorId: String(r.author_id),
    traceId: String(r.trace_id),
    traceType: String(r.trace_type),
    createdAt: new Date(r.created_at as string).getTime(),
    seen: Boolean(r.seen),
  };
}

/** One report row → the shared shape. */
function toReport(r: Record<string, unknown>): Report {
  return {
    id: String(r.id),
    traceId: String(r.trace_id),
    reporterId: String(r.reporter_id),
    reason: String(r.reason) as ReportReason,
    status: String(r.status) as Report['status'],
    createdAt: new Date(r.created_at as string).getTime(),
  };
}

function toShrine(r: Record<string, unknown>): ShrineRow {
  return {
    chunkX: Number(r.chunk_x),
    chunkY: Number(r.chunk_y),
    offerings: Number(r.offerings),
    warmth: Number(r.warmth),
  };
}

function toTrace(r: Record<string, unknown>): Trace {
  return {
    id: String(r.id),
    type: String(r.type) as TraceType,
    chunkX: Number(r.chunk_x),
    chunkY: Number(r.chunk_y),
    x: Number(r.x),
    y: Number(r.y),
    authorId: String(r.author_id),
    payload: (r.payload as TracePayload) ?? ({} as TracePayload),
    warmth: Number(r.warmth),
    appreciations: Number(r.appreciations),
    litCount: Number(r.lit_count ?? 0),
    claimedBy: r.claimed_by == null ? null : String(r.claimed_by),
    systemAuthored: Boolean(r.system_authored),
    createdAt: new Date(r.created_at as string).getTime(),
    expiresAt: r.expires_at == null ? null : new Date(r.expires_at as string).getTime(),
  };
}

export async function createPostgresRepository(databaseUrl: string): Promise<Repository> {
  const pkg = 'pg';
  const pg = (await import(pkg)) as {
    default?: { Pool: new (c: unknown) => Pool };
    Pool?: new (c: unknown) => Pool;
  };
  const PoolCtor = pg.Pool ?? pg.default?.Pool;
  if (!PoolCtor) throw new Error('pg.Pool not found — run `npm i pg` in server/');
  const pool: Pool = new PoolCtor({ connectionString: databaseUrl });

  return {
    async getOrCreatePlayerByToken(deviceToken) {
      const { rows } = await pool.query(
        `INSERT INTO player (device_token, motes) VALUES ($1, $2)
         ON CONFLICT (device_token) DO UPDATE SET device_token = EXCLUDED.device_token
         RETURNING *`,
        [deviceToken, STARTING_MOTES],
      );
      return toPlayer(rows[0]!);
    },

    async getPlayerById(id) {
      const { rows } = await pool.query('SELECT * FROM player WHERE id = $1', [id]);
      return rows[0] ? toPlayer(rows[0]) : null;
    },

    async getPlayerByEmail(email) {
      const { rows } = await pool.query('SELECT * FROM player WHERE email = $1', [email]);
      return rows[0] ? toPlayer(rows[0]) : null;
    },

    async upgradePlayerToEmail(playerId, normalizedEmail): Promise<UpgradeResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const owner = await client.query('SELECT * FROM player WHERE email = $1', [
          normalizedEmail,
        ]);
        if (owner.rows[0] && String(owner.rows[0].id) !== playerId) {
          // Link: re-point this device's token to the canonical email account.
          const me = await client.query('SELECT device_token FROM player WHERE id = $1', [
            playerId,
          ]);
          await client.query('UPDATE player SET device_token = $1 WHERE id = $2', [
            `linked:${String(me.rows[0]!.device_token)}`,
            playerId,
          ]);
          await client.query('UPDATE player SET device_token = $1 WHERE id = $2', [
            String(me.rows[0]!.device_token),
            String(owner.rows[0].id),
          ]);
          await client.query('COMMIT');
          return { player: toPlayer(owner.rows[0]), linked: true };
        }
        const upd = await client.query('UPDATE player SET email = $1 WHERE id = $2 RETURNING *', [
          normalizedEmail,
          playerId,
        ]);
        await client.query('COMMIT');
        return { player: toPlayer(upd.rows[0]!), linked: false };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async equipCosmetic(playerId, category: CosmeticCategory, cosmeticId) {
      const { rows } = await pool.query(
        `UPDATE player SET equipped = jsonb_set(equipped, $1, to_jsonb($2::text)) WHERE id = $3 RETURNING *`,
        [`{${category}}`, cosmeticId, playerId],
      );
      return toPlayer(rows[0]!);
    },

    async getAppreciationNotices(authorId, onlyUnseen) {
      const { rows } = await pool.query(
        `SELECT * FROM appreciation_notice WHERE author_id = $1 ${onlyUnseen ? 'AND seen = false' : ''} ORDER BY created_at`,
        [authorId],
      );
      return rows.map(toNotice);
    },

    async markAppreciationNoticesSeen(authorId) {
      await pool.query('UPDATE appreciation_notice SET seen = true WHERE author_id = $1', [
        authorId,
      ]);
    },

    async getChunkTraces(chunks, now) {
      return Promise.all(
        chunks.map(async ({ cx, cy }) => {
          const [traceRes, stateRes] = await Promise.all([
            pool.query('SELECT * FROM trace WHERE chunk_x = $1 AND chunk_y = $2', [cx, cy]),
            pool.query(
              'SELECT warmth, footfall FROM chunk_state WHERE chunk_x = $1 AND chunk_y = $2',
              [cx, cy],
            ),
          ]);
          const state = stateRes.rows[0];
          return {
            chunkId: chunkId(cx, cy),
            warmth: state ? Number(state.warmth) : 0,
            traces: prioritizeTraces(traceRes.rows.map(toTrace), now),
            footfall: (state?.footfall as Record<string, number>) ?? {},
          };
        }),
      );
    },

    async placeTrace(input: PlaceTraceInput) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const traceRes = await client.query(
          `INSERT INTO trace (type, chunk_x, chunk_y, x, y, author_id, payload, warmth, system_authored, created_at, expires_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, to_timestamp($10/1000.0), $11)
           RETURNING *`,
          [
            input.type,
            input.chunkX,
            input.chunkY,
            input.x,
            input.y,
            input.authorId,
            JSON.stringify(input.payload),
            input.warmth,
            input.systemAuthored ?? false,
            input.createdAt,
            input.expiresAt == null ? null : new Date(input.expiresAt).toISOString(),
          ],
        );
        const moteRes = await client.query(
          'UPDATE player SET motes = motes - $1, gift_charges = gift_charges - $2 WHERE id = $3 RETURNING motes',
          [input.cost, input.giftChargeCost ?? 0, input.authorId],
        );
        if (!(input.systemAuthored ?? false)) {
          await client.query(
            'UPDATE player SET attunement = attunement + $1, season_xp = season_xp + $2 WHERE id = $3',
            [ATTUNEMENT_EARN.place_trace, SEASON_XP_EARN.place_trace, input.authorId],
          );
        }
        await client.query(
          `INSERT INTO chunk_state (chunk_x, chunk_y, warmth, trace_count, updated_at)
           VALUES ($1, $2, $3, 1, now())
           ON CONFLICT (chunk_x, chunk_y)
           DO UPDATE SET warmth = chunk_state.warmth + EXCLUDED.warmth,
                         trace_count = chunk_state.trace_count + 1,
                         updated_at = now()`,
          [input.chunkX, input.chunkY, input.warmth],
        );
        await client.query('COMMIT');
        return { trace: toTrace(traceRes.rows[0]!), motes: Number(moteRes.rows[0]!.motes) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async countPlayerTracesSince(playerId, sinceMs) {
      const { rows } = await pool.query(
        'SELECT count(*)::int AS n FROM trace WHERE author_id = $1 AND created_at >= to_timestamp($2/1000.0)',
        [playerId, sinceMs],
      );
      return Number(rows[0]!.n);
    },

    async countChunkTracesSince(cx, cy, sinceMs) {
      const { rows } = await pool.query(
        'SELECT count(*)::int AS n FROM trace WHERE chunk_x = $1 AND chunk_y = $2 AND created_at >= to_timestamp($3/1000.0)',
        [cx, cy, sinceMs],
      );
      return Number(rows[0]!.n);
    },

    async getTraceById(id) {
      const { rows } = await pool.query('SELECT * FROM trace WHERE id = $1', [id]);
      return rows[0] ? toTrace(rows[0]) : null;
    },

    async appreciate(traceId, fromId, rewardMotes): Promise<AppreciateResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ins = await client.query(
          'INSERT INTO appreciation (trace_id, from_id) VALUES ($1, $2) ON CONFLICT (trace_id, from_id) DO NOTHING',
          [traceId, fromId],
        );
        if (ins.rowCount === 0) {
          const cur = await client.query(
            'SELECT appreciations, author_id FROM trace WHERE id = $1',
            [traceId],
          );
          await client.query('COMMIT');
          const row = cur.rows[0]!;
          return {
            applied: false,
            appreciations: Number(row.appreciations),
            authorId: String(row.author_id),
          };
        }
        const upd = await client.query(
          'UPDATE trace SET appreciations = appreciations + 1 WHERE id = $1 RETURNING appreciations, author_id, type',
          [traceId],
        );
        const authorId = String(upd.rows[0]!.author_id);
        await client.query('UPDATE player SET motes = motes + $1 WHERE id = $2', [
          rewardMotes,
          authorId,
        ]);
        // Retention notice + attunement for the thanked author (P3-SRV-04/05).
        await client.query(
          'INSERT INTO appreciation_notice (author_id, trace_id, trace_type) VALUES ($1, $2, $3)',
          [authorId, traceId, String(upd.rows[0]!.type)],
        );
        await client.query(
          'UPDATE player SET attunement = attunement + $1, season_xp = season_xp + $2 WHERE id = $3',
          [ATTUNEMENT_EARN.receive_appreciation, SEASON_XP_EARN.receive_appreciation, authorId],
        );
        await client.query('COMMIT');
        return { applied: true, appreciations: Number(upd.rows[0]!.appreciations), authorId };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async claimGift(traceId, claimantId, claimReward, authorReward): Promise<ClaimGiftResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // First-claimer-wins: only succeeds while claimed_by IS NULL.
        const claim = await client.query(
          `UPDATE trace SET claimed_by = $1, claimed_at = now()
           WHERE id = $2 AND claimed_by IS NULL
           RETURNING author_id`,
          [claimantId, traceId],
        );
        if (claim.rowCount === 0) {
          const cur = await client.query('SELECT motes FROM player WHERE id = $1', [claimantId]);
          await client.query('COMMIT');
          return { applied: false, motes: Number(cur.rows[0]!.motes) };
        }
        const authorId = String(claim.rows[0]!.author_id);
        const claimant = await client.query(
          'UPDATE player SET motes = motes + $1, attunement = attunement + $2, season_xp = season_xp + $3 WHERE id = $4 RETURNING motes',
          [claimReward, ATTUNEMENT_EARN.gift_claim, SEASON_XP_EARN.gift_claim, claimantId],
        );
        await client.query('UPDATE player SET motes = motes + $1 WHERE id = $2', [
          authorReward,
          authorId,
        ]);
        await client.query('COMMIT');
        return { applied: true, motes: Number(claimant.rows[0]!.motes) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async lightLantern(traceId, fromId, warmthDelta, firstLightBonus): Promise<LightLanternResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ins = await client.query(
          'INSERT INTO lantern_lit (trace_id, from_id) VALUES ($1, $2) ON CONFLICT (trace_id, from_id) DO NOTHING',
          [traceId, fromId],
        );
        if (ins.rowCount === 0) {
          const cur = await client.query('SELECT lit_count FROM trace WHERE id = $1', [traceId]);
          await client.query('COMMIT');
          return { applied: false, litCount: Number(cur.rows[0]!.lit_count) };
        }
        const upd = await client.query(
          'UPDATE trace SET lit_count = lit_count + 1 WHERE id = $1 RETURNING lit_count, chunk_x, chunk_y',
          [traceId],
        );
        const row = upd.rows[0]!;
        const litCount = Number(row.lit_count);
        await client.query(
          `INSERT INTO chunk_state (chunk_x, chunk_y, warmth, trace_count, updated_at)
           VALUES ($1, $2, $3, 0, now())
           ON CONFLICT (chunk_x, chunk_y)
           DO UPDATE SET warmth = chunk_state.warmth + EXCLUDED.warmth, updated_at = now()`,
          [Number(row.chunk_x), Number(row.chunk_y), warmthDelta],
        );
        if (litCount === 1 && firstLightBonus > 0) {
          await client.query(
            'UPDATE player SET motes = motes + $1, attunement = attunement + $2, season_xp = season_xp + $3 WHERE id = $4',
            [firstLightBonus, ATTUNEMENT_EARN.first_light, SEASON_XP_EARN.first_light, fromId],
          );
        }
        await client.query('COMMIT');
        return { applied: true, litCount };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async collectMote(playerId, moteId, rewardMotes) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ins = await client.query(
          'INSERT INTO mote_collect (player_id, mote_id) VALUES ($1, $2) ON CONFLICT (player_id, mote_id) DO NOTHING',
          [playerId, moteId],
        );
        if (ins.rowCount === 0) {
          const cur = await client.query('SELECT motes FROM player WHERE id = $1', [playerId]);
          await client.query('COMMIT');
          return { applied: false, motes: Number(cur.rows[0]!.motes) };
        }
        const upd = await client.query(
          'UPDATE player SET motes = motes + $1 WHERE id = $2 RETURNING motes',
          [rewardMotes, playerId],
        );
        await client.query('COMMIT');
        return { applied: true, motes: Number(upd.rows[0]!.motes) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async recordJournalEvent(playerId, kind, refId, now) {
      await pool.query(
        'INSERT INTO journal_event (player_id, kind, ref_id, created_at) VALUES ($1, $2, $3, to_timestamp($4/1000.0))',
        [playerId, kind, refId, now],
      );
    },

    async getJournal(playerId, limit) {
      const { rows } = await pool.query(
        'SELECT * FROM journal_event WHERE player_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2',
        [playerId, limit],
      );
      return rows.map((r) => ({
        id: String(r.id),
        playerId: String(r.player_id),
        kind: String(r.kind) as JournalEvent['kind'],
        refId: r.ref_id == null ? null : String(r.ref_id),
        createdAt: new Date(r.created_at as string).getTime(),
      }));
    },

    async recordHeatSamples(tiles) {
      if (tiles.length === 0) return;
      const values: string[] = [];
      const params: number[] = [];
      tiles.forEach(({ tx, ty }, i) => {
        values.push(`($${i * 2 + 1}, $${i * 2 + 2})`);
        params.push(tx, ty);
      });
      await pool.query(`INSERT INTO heat_sample (tx, ty) VALUES ${values.join(', ')}`, params);
    },

    async aggregateFootpaths() {
      /** Cap scanned per run so the job stays within its perf budget; leftovers roll to next run. */
      const BATCH_LIMIT = 5000;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(
          'SELECT id, tx, ty FROM heat_sample WHERE aggregated = false ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED',
          [BATCH_LIMIT],
        );
        if (rows.length === 0) {
          await client.query('COMMIT');
          return { samplesProcessed: 0, chunksTouched: 0 };
        }
        // Group deltas by chunk, then by footpath tile.
        const perChunk = new Map<string, { cx: number; cy: number; tiles: Map<string, number> }>();
        for (const r of rows) {
          const tx = Number(r.tx);
          const ty = Number(r.ty);
          const { cx, cy } = worldToChunk(
            tx * FOOTPATH_TILE_RESOLUTION,
            ty * FOOTPATH_TILE_RESOLUTION,
          );
          const id = chunkId(cx, cy);
          const entry = perChunk.get(id) ?? { cx, cy, tiles: new Map<string, number>() };
          const key = footpathTileKey(tx, ty);
          entry.tiles.set(key, (entry.tiles.get(key) ?? 0) + 1);
          perChunk.set(id, entry);
        }
        for (const { cx, cy, tiles } of perChunk.values()) {
          let visits = 0;
          for (const n of tiles.values()) visits += n;
          const cur = await client.query(
            'SELECT footfall FROM chunk_state WHERE chunk_x = $1 AND chunk_y = $2',
            [cx, cy],
          );
          const merged: Record<string, number> = {
            ...((cur.rows[0]?.footfall as Record<string, number>) ?? {}),
          };
          for (const [key, n] of tiles) merged[key] = (merged[key] ?? 0) + n;
          await client.query(
            `INSERT INTO chunk_state (chunk_x, chunk_y, warmth, footfall, trace_count, updated_at)
             VALUES ($1, $2, $3, $4::jsonb, 0, now())
             ON CONFLICT (chunk_x, chunk_y)
             DO UPDATE SET warmth = chunk_state.warmth + EXCLUDED.warmth,
                           footfall = EXCLUDED.footfall,
                           updated_at = now()`,
            [cx, cy, footfallWarmth(visits), JSON.stringify(merged)],
          );
        }
        const ids = rows.map((r) => Number(r.id));
        await client.query('UPDATE heat_sample SET aggregated = true WHERE id = ANY($1)', [ids]);
        await client.query('COMMIT');
        return { samplesProcessed: rows.length, chunksTouched: perChunk.size };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async gcTraces(now) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        // Eligibility mirrors isGcEligible: expired, unappreciated, unlit, non-system.
        const del = await client.query(
          `DELETE FROM trace
           WHERE system_authored = false
             AND expires_at IS NOT NULL
             AND expires_at <= to_timestamp($1/1000.0)
             AND appreciations = 0
             AND lit_count = 0
           RETURNING chunk_x, chunk_y, warmth`,
          [now],
        );
        // Fade removed warmth back out of each affected chunk (floored at 0).
        const perChunk = new Map<string, { cx: number; cy: number; warmth: number }>();
        for (const r of del.rows) {
          const cx = Number(r.chunk_x);
          const cy = Number(r.chunk_y);
          const key = chunkId(cx, cy);
          const entry = perChunk.get(key) ?? { cx, cy, warmth: 0 };
          entry.warmth += Number(r.warmth);
          perChunk.set(key, entry);
        }
        for (const { cx, cy, warmth } of perChunk.values()) {
          await client.query(
            `UPDATE chunk_state SET warmth = GREATEST(0, warmth - $3), updated_at = now()
             WHERE chunk_x = $1 AND chunk_y = $2`,
            [cx, cy, warmth],
          );
        }
        await client.query('COMMIT');
        return { scanned: del.rowCount, removed: del.rowCount };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async getShrine(cx, cy) {
      const { rows } = await pool.query(
        'SELECT * FROM shrine WHERE chunk_x = $1 AND chunk_y = $2',
        [cx, cy],
      );
      return rows[0] ? toShrine(rows[0]) : null;
    },

    async makeShrineOffering(cx, cy, playerId, cost, warmthDelta) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const shrineRes = await client.query(
          `INSERT INTO shrine (chunk_x, chunk_y, offerings, warmth, updated_at)
           VALUES ($1, $2, 1, $3, now())
           ON CONFLICT (chunk_x, chunk_y)
           DO UPDATE SET offerings = shrine.offerings + 1,
                         warmth = shrine.warmth + EXCLUDED.warmth,
                         updated_at = now()
           RETURNING *`,
          [cx, cy, warmthDelta],
        );
        await client.query(
          `INSERT INTO chunk_state (chunk_x, chunk_y, warmth, trace_count, updated_at)
           VALUES ($1, $2, $3, 0, now())
           ON CONFLICT (chunk_x, chunk_y)
           DO UPDATE SET warmth = chunk_state.warmth + EXCLUDED.warmth, updated_at = now()`,
          [cx, cy, warmthDelta],
        );
        const moteRes = await client.query(
          'UPDATE player SET motes = motes - $1, attunement = attunement + $2, season_xp = season_xp + $3 WHERE id = $4 RETURNING motes',
          [cost, ATTUNEMENT_EARN.offering, SEASON_XP_EARN.offering, playerId],
        );
        await client.query('COMMIT');
        return { shrine: toShrine(shrineRes.rows[0]!), motes: Number(moteRes.rows[0]!.motes) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    // ── P4: season + Trail Pass ────────────────────────────────────────────────────────────────
    async upgradePassTier(playerId) {
      const { rows } = await pool.query(
        `UPDATE player SET pass_tier = 'premium' WHERE id = $1 RETURNING *`,
        [playerId],
      );
      return toPlayer(rows[0]!);
    },

    async claimPassReward(
      playerId,
      lane: PassLane,
      tier,
      reward: PassReward,
    ): Promise<GrantResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const key = `${lane}:${tier}`;
        const cur = await client.query('SELECT * FROM player WHERE id = $1 FOR UPDATE', [playerId]);
        const claimed = (cur.rows[0]!.pass_claimed as string[]) ?? [];
        if (claimed.includes(key)) {
          await client.query('COMMIT');
          return { applied: false, player: toPlayer(cur.rows[0]!) };
        }
        const upd = await client.query(
          `UPDATE player
             SET pass_claimed = pass_claimed || to_jsonb($1::text),
                 motes = motes + $2,
                 cosmetics_owned = CASE WHEN $3::text IS NOT NULL AND NOT (cosmetics_owned ? $3)
                                        THEN cosmetics_owned || to_jsonb($3::text)
                                        ELSE cosmetics_owned END
           WHERE id = $4 RETURNING *`,
          [
            key,
            reward.kind === 'mote_boost' ? reward.motes : 0,
            reward.kind === 'cosmetic' ? reward.cosmeticId : null,
            playerId,
          ],
        );
        await client.query('COMMIT');
        return { applied: true, player: toPlayer(upd.rows[0]!) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    // ── P4: embers + store ─────────────────────────────────────────────────────────────────────
    async grantEmbers(playerId, embers) {
      const { rows } = await pool.query(
        'UPDATE player SET embers = embers + $1 WHERE id = $2 RETURNING *',
        [embers, playerId],
      );
      return toPlayer(rows[0]!);
    },

    async purchaseCosmetic(playerId, cosmeticId, priceEmbers): Promise<GrantResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cur = await client.query('SELECT * FROM player WHERE id = $1 FOR UPDATE', [playerId]);
        const p = cur.rows[0]!;
        const owned = (p.cosmetics_owned as string[]) ?? [];
        if (Number(p.embers) < priceEmbers || owned.includes(cosmeticId)) {
          await client.query('COMMIT');
          return { applied: false, player: toPlayer(p) };
        }
        const upd = await client.query(
          `UPDATE player SET embers = embers - $1, cosmetics_owned = cosmetics_owned || to_jsonb($2::text)
           WHERE id = $3 RETURNING *`,
          [priceEmbers, cosmeticId, playerId],
        );
        await client.query('COMMIT');
        return { applied: true, player: toPlayer(upd.rows[0]!) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async grantWayfarersKit(playerId, cosmeticId, giftCharges): Promise<GrantResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cur = await client.query('SELECT * FROM player WHERE id = $1 FOR UPDATE', [playerId]);
        const p = cur.rows[0]!;
        if (p.kit_owned === true) {
          await client.query('COMMIT');
          return { applied: false, player: toPlayer(p) };
        }
        const owned = (p.cosmetics_owned as string[]) ?? [];
        const upd = await client.query(
          `UPDATE player
             SET kit_owned = true,
                 gift_charges = gift_charges + $1,
                 cosmetics_owned = CASE WHEN NOT (cosmetics_owned ? $2)
                                        THEN cosmetics_owned || to_jsonb($2::text)
                                        ELSE cosmetics_owned END
           WHERE id = $3 RETURNING *`,
          [giftCharges, cosmeticId, playerId],
        );
        void owned;
        await client.query('COMMIT');
        return { applied: true, player: toPlayer(upd.rows[0]!) };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    // ── P4: reconciliation ─────────────────────────────────────────────────────────────────────
    async recordPurchase(playerId, providerRef, sku, amountUsdCents) {
      await pool.query(
        'INSERT INTO purchase (player_id, provider_ref, sku, amount_usd_cents) VALUES ($1, $2, $3, $4)',
        [playerId, providerRef, sku, amountUsdCents],
      );
    },

    async getPurchaseLedger(sinceMs): Promise<PurchaseRecord[]> {
      const { rows } = await pool.query(
        'SELECT provider_ref, amount_usd_cents FROM purchase WHERE created_at >= to_timestamp($1/1000.0)',
        [sinceMs],
      );
      return rows.map((r) => ({
        providerRef: String(r.provider_ref),
        amountUsdCents: Number(r.amount_usd_cents),
      }));
    },

    // ── P4: rewarded ads ───────────────────────────────────────────────────────────────────────
    async grantAdReward(playerId, dayBucket, dailyCap, reward: AdReward): Promise<AdGrantResult> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const ins = await client.query(
          `INSERT INTO ad_grant (player_id, day_bucket, count) VALUES ($1, $2, 0)
           ON CONFLICT (player_id, day_bucket) DO NOTHING`,
          [playerId, dayBucket],
        );
        void ins;
        const cur = await client.query(
          'SELECT count FROM ad_grant WHERE player_id = $1 AND day_bucket = $2 FOR UPDATE',
          [playerId, dayBucket],
        );
        const used = Number(cur.rows[0]!.count);
        if (used >= dailyCap) {
          const p = await client.query('SELECT * FROM player WHERE id = $1', [playerId]);
          await client.query('COMMIT');
          return { granted: false, player: toPlayer(p.rows[0]!), grantsToday: used };
        }
        await client.query(
          'UPDATE ad_grant SET count = count + 1 WHERE player_id = $1 AND day_bucket = $2',
          [playerId, dayBucket],
        );
        const upd = await client.query(
          'UPDATE player SET motes = motes + $1, gift_charges = gift_charges + $2 WHERE id = $3 RETURNING *',
          [
            reward.kind === 'motes' ? reward.amount : 0,
            reward.kind === 'gift_charge' ? reward.amount : 0,
            playerId,
          ],
        );
        await client.query('COMMIT');
        return { granted: true, player: toPlayer(upd.rows[0]!), grantsToday: used + 1 };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    // ── P4: reporting + moderation ───────────────────────────────────────────────────────────────
    async createReport(traceId, reporterId, reason: ReportReason, now): Promise<Report> {
      const { rows } = await pool.query(
        `INSERT INTO report (trace_id, reporter_id, reason, status, created_at)
         VALUES ($1, $2, $3, 'open', to_timestamp($4/1000.0)) RETURNING *`,
        [traceId, reporterId, reason, now],
      );
      return toReport(rows[0]!);
    },

    async getOpenReports(limit) {
      const { rows } = await pool.query(
        `SELECT * FROM report WHERE status = 'open' ORDER BY created_at ASC LIMIT $1`,
        [limit],
      );
      return rows.map(toReport);
    },

    async resolveReport(reportId, action: ModeratorAction): Promise<ResolveReportResult | null> {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const cur = await client.query('SELECT * FROM report WHERE id = $1 FOR UPDATE', [reportId]);
        if (!cur.rows[0]) {
          await client.query('COMMIT');
          return null;
        }
        let removedTrace = false;
        if (action === 'remove') {
          const del = await client.query(
            'DELETE FROM trace WHERE id = $1 RETURNING chunk_x, chunk_y, warmth',
            [String(cur.rows[0].trace_id)],
          );
          if (del.rowCount > 0) {
            removedTrace = true;
            const r = del.rows[0]!;
            await client.query(
              `UPDATE chunk_state SET warmth = GREATEST(0, warmth - $3), updated_at = now()
               WHERE chunk_x = $1 AND chunk_y = $2`,
              [Number(r.chunk_x), Number(r.chunk_y), Number(r.warmth)],
            );
          }
        }
        const upd = await client.query('UPDATE report SET status = $1 WHERE id = $2 RETURNING *', [
          statusForAction(action),
          reportId,
        ]);
        await client.query('COMMIT');
        return { report: toReport(upd.rows[0]!), removedTrace };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async removeTrace(traceId) {
      const del = await pool.query(
        'DELETE FROM trace WHERE id = $1 RETURNING chunk_x, chunk_y, warmth',
        [traceId],
      );
      if (del.rowCount === 0) return false;
      const r = del.rows[0]!;
      await pool.query(
        `UPDATE chunk_state SET warmth = GREATEST(0, warmth - $3), updated_at = now()
         WHERE chunk_x = $1 AND chunk_y = $2`,
        [Number(r.chunk_x), Number(r.chunk_y), Number(r.warmth)],
      );
      return true;
    },

    async close() {
      await pool.end();
    },
  };
}
