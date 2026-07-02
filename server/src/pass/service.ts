/**
 * Trail Pass claim validation (P4-SRV-02).
 *
 * Server-authoritative: a reward can be claimed only if the player has actually reached that tier
 * (season XP), the lane is permitted (premium lane requires the premium tier), and a reward exists on
 * that lane+tier. **Guardrail §9:** rewards are cosmetic or mote-boost only — the reward table
 * (`PASS_TRACKS`) contains nothing else, and cosmetics there are all free-earnable.
 */

import { passReward, seasonTierForXp, type PassLane } from '@wanderlight/shared';
import type { GrantResult, Repository } from '../repo/types';

export interface ClaimError {
  readonly code: 'not_reached' | 'locked' | 'no_reward' | 'already_claimed';
  readonly message: string;
}

export type ClaimResult =
  | { readonly ok: true; readonly grant: GrantResult }
  | { readonly ok: false; readonly error: ClaimError };

/** Validate + apply a Trail Pass claim for the calling player. */
export async function claimPassReward(
  repo: Repository,
  playerId: string,
  lane: PassLane,
  tier: number,
): Promise<ClaimResult> {
  const player = await repo.getPlayerById(playerId);
  if (!player) return { ok: false, error: { code: 'not_reached', message: 'Unknown player' } };

  if (lane === 'premium' && player.passTier !== 'premium') {
    return {
      ok: false,
      error: { code: 'locked', message: 'Premium lane requires the premium pass' },
    };
  }
  if (seasonTierForXp(player.seasonXp) < tier) {
    return { ok: false, error: { code: 'not_reached', message: `Tier ${tier} not reached yet` } };
  }
  const reward = passReward(lane, tier);
  if (!reward) {
    return {
      ok: false,
      error: { code: 'no_reward', message: `No ${lane} reward at tier ${tier}` },
    };
  }
  const grant = await repo.claimPassReward(playerId, lane, tier, reward);
  if (!grant.applied) {
    return { ok: false, error: { code: 'already_claimed', message: 'Reward already claimed' } };
  }
  return { ok: true, grant };
}
