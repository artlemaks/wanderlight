/**
 * Cosmetics equip validation (P3-CLI-02 / P3-SRV-05).
 *
 * The server is authoritative over what a player may wear: the id must be a real catalog cosmetic,
 * it must sit in the category slot the caller named, and the player must actually own it (via defaults
 * or the attunement track). This mirrors `validate-client-claims-against-generator` — never trust a
 * client-supplied cosmetic id as proof of ownership.
 */

import { cosmeticById, isCosmeticId, type CosmeticCategory } from '@wanderlight/shared';
import type { Player, Repository } from '../repo/types';

export interface EquipError {
  readonly code: 'invalid' | 'not_owned';
  readonly message: string;
}

export type EquipResult =
  | { readonly ok: true; readonly player: Player }
  | { readonly ok: false; readonly error: EquipError };

/** Validate and apply an equip. Returns a typed error the route maps to a status code. */
export async function equipCosmetic(
  repo: Repository,
  playerId: string,
  category: CosmeticCategory,
  cosmeticId: string,
): Promise<EquipResult> {
  const item = isCosmeticId(cosmeticId) ? cosmeticById(cosmeticId) : undefined;
  if (!item) {
    return { ok: false, error: { code: 'invalid', message: `Unknown cosmetic ${cosmeticId}` } };
  }
  if (item.category !== category) {
    return {
      ok: false,
      error: { code: 'invalid', message: `${cosmeticId} is not a ${category}` },
    };
  }
  const player = await repo.getPlayerById(playerId);
  if (!player) {
    return { ok: false, error: { code: 'invalid', message: `Unknown player ${playerId}` } };
  }
  if (!player.cosmeticsOwned.includes(cosmeticId)) {
    return {
      ok: false,
      error: { code: 'not_owned', message: `${cosmeticId} is not owned yet — keep exploring` },
    };
  }
  const updated = await repo.equipCosmetic(playerId, category, cosmeticId);
  return { ok: true, player: updated };
}
