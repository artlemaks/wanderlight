/**
 * Trace service — the business logic between routes and the repository (P1-SRV-05/06/07).
 *
 * Validates the request, enforces the motes economy and rate limits, derives chunk coords + expiry
 * server-side (never trusting the client), then persists. Returns a discriminated result so the
 * route maps cleanly to HTTP status codes. Pure of Fastify — unit/integration-testable directly.
 */

import {
  isTraceType,
  placementCost,
  worldToChunk,
  RATE_LIMITS,
  TRACE_TTL_MS,
  TRACE_WARMTH,
  APPRECIATION_REWARD_MOTES,
  type PlaceTraceRequest,
  type SignpostPayload,
  type Trace,
} from '@wanderlight/shared';
import type { Repository } from '../repo/types';
import { validateSignpost, type Corpus } from '../content/corpus';

/** Machine-readable failure codes; the route maps each to an HTTP status. */
export type PlaceError =
  | { code: 'invalid'; message: string }
  | { code: 'insufficient_motes'; message: string }
  | { code: 'rate_limited'; message: string };

export type PlaceResult =
  { ok: true; trace: Trace; motes: number } | { ok: false; error: PlaceError };

/** Validate the request body shape + payload against the content corpus. */
function validate(req: PlaceTraceRequest, corpus: Corpus): string | null {
  if (!isTraceType(req.type)) return `Unknown trace type`;
  if (!Number.isFinite(req.x) || !Number.isFinite(req.y)) return 'x and y must be finite numbers';
  if (req.type === 'signpost') {
    const payload = req.payload as SignpostPayload;
    if (!payload || typeof payload.templateId !== 'string' || typeof payload.slots !== 'object') {
      return 'Signpost payload requires templateId and slots';
    }
    return validateSignpost(corpus, payload);
  }
  // lantern: payload carries no authored content.
  return null;
}

export async function placeTrace(
  repo: Repository,
  corpus: Corpus,
  playerId: string,
  req: PlaceTraceRequest,
  now: number,
): Promise<PlaceResult> {
  const invalid = validate(req, corpus);
  if (invalid) return { ok: false, error: { code: 'invalid', message: invalid } };

  const player = await repo.getPlayerById(playerId);
  if (!player) return { ok: false, error: { code: 'invalid', message: 'Unknown player' } };

  const cost = placementCost(req.type);
  if (player.motes < cost) {
    return {
      ok: false,
      error: { code: 'insufficient_motes', message: `Need ${cost} motes, have ${player.motes}` },
    };
  }

  const { cx, cy } = worldToChunk(req.x, req.y);

  const [playerCount, chunkCount] = await Promise.all([
    repo.countPlayerTracesSince(playerId, now - RATE_LIMITS.perPlayer.windowMs),
    repo.countChunkTracesSince(cx, cy, now - RATE_LIMITS.perChunk.windowMs),
  ]);
  if (playerCount >= RATE_LIMITS.perPlayer.max) {
    return {
      ok: false,
      error: { code: 'rate_limited', message: 'Too many traces placed recently' },
    };
  }
  if (chunkCount >= RATE_LIMITS.perChunk.max) {
    return {
      ok: false,
      error: { code: 'rate_limited', message: 'This area is too crowded right now' },
    };
  }

  const { trace, motes } = await repo.placeTrace({
    type: req.type,
    x: req.x,
    y: req.y,
    chunkX: cx,
    chunkY: cy,
    authorId: playerId,
    payload: req.payload,
    warmth: TRACE_WARMTH[req.type],
    createdAt: now,
    expiresAt: now + TRACE_TTL_MS[req.type],
    cost,
  });
  return { ok: true, trace, motes };
}

export type AppreciateResultOut =
  | { ok: true; traceId: string; appreciations: number; applied: boolean }
  | { ok: false; error: { code: 'not_found' | 'invalid'; message: string } };

export async function appreciateTrace(
  repo: Repository,
  playerId: string,
  traceId: string,
): Promise<AppreciateResultOut> {
  const trace = await repo.getTraceById(traceId);
  if (!trace) return { ok: false, error: { code: 'not_found', message: 'Trace not found' } };
  if (trace.authorId === playerId) {
    return {
      ok: false,
      error: { code: 'invalid', message: 'You cannot appreciate your own trace' },
    };
  }
  const result = await repo.appreciate(traceId, playerId, APPRECIATION_REWARD_MOTES);
  return { ok: true, traceId, appreciations: result.appreciations, applied: result.applied };
}
