/**
 * Motes-of-light collection service (P2-CLI-05).
 *
 * Collecting a mote is a soft earn (scope §9 — earned, never bought). The mote's existence is
 * validated against the same deterministic spawn function the client uses (`moteExists`), so a client
 * cannot mint motes by inventing ids; collection is then idempotent per (player, mote) so a mote pays
 * out exactly once. Records a journal event on success.
 */

import { moteExists, MOTE_COLLECT_VALUE } from '@wanderlight/shared';
import type { Repository } from '../repo/types';

export type CollectError =
  { code: 'invalid'; message: string } | { code: 'not_found'; message: string };

export type CollectResult =
  { ok: true; applied: boolean; motes: number } | { ok: false; error: CollectError };

export async function collectMote(
  repo: Repository,
  seed: number,
  playerId: string,
  moteId: string,
  now: number,
): Promise<CollectResult> {
  if (typeof moteId !== 'string' || moteId.length === 0) {
    return { ok: false, error: { code: 'invalid', message: 'moteId is required' } };
  }
  if (!moteExists(seed, moteId)) {
    return { ok: false, error: { code: 'not_found', message: 'No mote of light there' } };
  }
  const result = await repo.collectMote(playerId, moteId, MOTE_COLLECT_VALUE);
  if (result.applied) await repo.recordJournalEvent(playerId, 'collect_mote', moteId, now);
  return { ok: true, applied: result.applied, motes: result.motes };
}
