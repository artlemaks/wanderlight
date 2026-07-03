/**
 * System-trace author (P2-SRV-08) — the mechanism for placing **system-authored** seed traces.
 *
 * Seeding density before there is a player community (cold-start, P2.E) needs traces that look
 * exactly like player traces to travelers but are flagged for the GC job so it never (or only slowly)
 * removes them. All system traces are authored by a single deterministic "system" player and never
 * expire. Used by the seed script (P2-CNT-01) and callable from an admin path.
 */

import {
  worldToChunk,
  TRACE_WARMTH,
  type PlaceableTraceType,
  type TracePayload,
  type Trace,
} from '@wanderlight/shared';
import type { Repository, Player } from '../repo/types';

/** Deterministic device token for the system author — one stable player owns all seed traces. */
export const SYSTEM_DEVICE_TOKEN = 'system:wanderlight';

/** Resolve (creating on first use) the single system-author player. */
export function getSystemAuthor(repo: Repository): Promise<Player> {
  return repo.getOrCreatePlayerByToken(SYSTEM_DEVICE_TOKEN);
}

/** One system trace to seed: a placeable kind at a world position with its payload. */
export interface SystemTraceSpec {
  readonly type: PlaceableTraceType;
  readonly x: number;
  readonly y: number;
  readonly payload: TracePayload;
}

/**
 * Place one system-authored trace: flagged `systemAuthored`, never-expiring (`expiresAt: null`), and
 * free (no economy cost). Warmth still contributes so seeded areas feel alive.
 */
export async function placeSystemTrace(
  repo: Repository,
  spec: SystemTraceSpec,
  now: number,
): Promise<Trace> {
  const author = await getSystemAuthor(repo);
  const { cx, cy } = worldToChunk(spec.x, spec.y);
  const { trace } = await repo.placeTrace({
    type: spec.type,
    x: spec.x,
    y: spec.y,
    chunkX: cx,
    chunkY: cy,
    authorId: author.id,
    payload: spec.payload,
    warmth: TRACE_WARMTH[spec.type],
    createdAt: now,
    expiresAt: null,
    cost: 0,
    giftChargeCost: 0,
    systemAuthored: true,
  });
  return trace;
}

/** Place a batch of system traces in order, returning them. */
export async function placeSystemTraces(
  repo: Repository,
  specs: readonly SystemTraceSpec[],
  now: number,
): Promise<Trace[]> {
  const out: Trace[] = [];
  for (const spec of specs) {
    out.push(await placeSystemTrace(repo, spec, now));
  }
  return out;
}
