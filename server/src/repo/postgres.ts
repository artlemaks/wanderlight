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
  STARTING_MOTES,
  type Trace,
  type TracePayload,
  type TraceType,
} from '@wanderlight/shared';
import type {
  AppreciateResult,
  ClaimGiftResult,
  LightLanternResult,
  PlaceTraceInput,
  Player,
  Repository,
  ShrineRow,
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
  return {
    id: String(r.id),
    deviceToken: String(r.device_token),
    email: r.email == null ? null : String(r.email),
    createdAt: new Date(r.created_at as string).getTime(),
    motes: Number(r.motes),
    giftCharges: Number(r.gift_charges),
    cosmeticsOwned: (r.cosmetics_owned as string[]) ?? [],
    passTier: String(r.pass_tier),
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

    async getChunkTraces(chunks, now) {
      return Promise.all(
        chunks.map(async ({ cx, cy }) => {
          const [traceRes, stateRes] = await Promise.all([
            pool.query('SELECT * FROM trace WHERE chunk_x = $1 AND chunk_y = $2', [cx, cy]),
            pool.query('SELECT warmth FROM chunk_state WHERE chunk_x = $1 AND chunk_y = $2', [
              cx,
              cy,
            ]),
          ]);
          return {
            chunkId: chunkId(cx, cy),
            warmth: stateRes.rows[0] ? Number(stateRes.rows[0].warmth) : 0,
            traces: prioritizeTraces(traceRes.rows.map(toTrace), now),
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
          'UPDATE trace SET appreciations = appreciations + 1 WHERE id = $1 RETURNING appreciations, author_id',
          [traceId],
        );
        const authorId = String(upd.rows[0]!.author_id);
        await client.query('UPDATE player SET motes = motes + $1 WHERE id = $2', [
          rewardMotes,
          authorId,
        ]);
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
          'UPDATE player SET motes = motes + $1 WHERE id = $2 RETURNING motes',
          [claimReward, claimantId],
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

    async lightLantern(traceId, fromId, warmthDelta): Promise<LightLanternResult> {
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
        await client.query(
          `INSERT INTO chunk_state (chunk_x, chunk_y, warmth, trace_count, updated_at)
           VALUES ($1, $2, $3, 0, now())
           ON CONFLICT (chunk_x, chunk_y)
           DO UPDATE SET warmth = chunk_state.warmth + EXCLUDED.warmth, updated_at = now()`,
          [Number(row.chunk_x), Number(row.chunk_y), warmthDelta],
        );
        await client.query('COMMIT');
        return { applied: true, litCount: Number(row.lit_count) };
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
          'UPDATE player SET motes = motes - $1 WHERE id = $2 RETURNING motes',
          [cost, playerId],
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

    async close() {
      await pool.end();
    },
  };
}
