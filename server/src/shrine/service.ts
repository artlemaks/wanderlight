/**
 * Shrine service (P2-SRV-02) — offerings to a shared, growing structure at a landmark.
 *
 * An offering is server-authoritative: it debits motes, accumulates against the chunk's shrine, and
 * raises chunk warmth. Repeatable (unlike appreciation) so a shrine visibly grows with community use.
 * Pure of Fastify — the route just resolves the session and maps the discriminated result.
 */

import {
  worldToChunk,
  SHRINE_OFFERING_COST,
  SHRINE_OFFERING_WARMTH,
  type ShrineState,
} from '@wanderlight/shared';
import { chunkId } from '@wanderlight/shared';
import type { Repository, ShrineRow } from '../repo/types';

export type OfferingError =
  { code: 'invalid'; message: string } | { code: 'insufficient_motes'; message: string };

export type OfferingResult =
  { ok: true; shrine: ShrineState; motes: number } | { ok: false; error: OfferingError };

function toShrineState(row: ShrineRow): ShrineState {
  return { chunkId: chunkId(row.chunkX, row.chunkY), offerings: row.offerings, warmth: row.warmth };
}

export async function makeOffering(
  repo: Repository,
  playerId: string,
  x: number,
  y: number,
): Promise<OfferingResult> {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { ok: false, error: { code: 'invalid', message: 'x and y must be finite numbers' } };
  }
  const player = await repo.getPlayerById(playerId);
  if (!player) return { ok: false, error: { code: 'invalid', message: 'Unknown player' } };
  if (player.motes < SHRINE_OFFERING_COST) {
    return {
      ok: false,
      error: {
        code: 'insufficient_motes',
        message: `Need ${SHRINE_OFFERING_COST} motes, have ${player.motes}`,
      },
    };
  }
  const { cx, cy } = worldToChunk(x, y);
  const { shrine, motes } = await repo.makeShrineOffering(
    cx,
    cy,
    playerId,
    SHRINE_OFFERING_COST,
    SHRINE_OFFERING_WARMTH,
  );
  return { ok: true, shrine: toShrineState(shrine), motes };
}
