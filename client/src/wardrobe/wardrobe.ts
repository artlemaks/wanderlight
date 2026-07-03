/**
 * Wardrobe view model (P3-CLI-02) — pure core, no PixiJS.
 *
 * Turns a `GET /cosmetics` response into a per-category, per-item view the wardrobe screen renders:
 * each item flagged owned / equipped / locked (with the attunement level it unlocks at). Pure so it is
 * unit-tested here and the Pixi screen stays a thin shell (`pure-core-thin-pixi-shell`).
 */

import {
  COSMETIC_CATEGORIES,
  type CosmeticCategory,
  type CosmeticsResponse,
} from '@wanderlight/shared';

export interface WardrobeItem {
  readonly id: string;
  readonly name: string;
  readonly owned: boolean;
  readonly equipped: boolean;
  /** For locked items, the attunement milestone that unlocks them (else null). */
  readonly unlocksAtMilestone: number | null;
}

export interface WardrobeCategory {
  readonly category: CosmeticCategory;
  readonly items: readonly WardrobeItem[];
}

/** Build the grouped, flagged wardrobe model from a cosmetics response. */
export function wardrobeModel(res: CosmeticsResponse): WardrobeCategory[] {
  const ownedSet = new Set(res.owned);
  return COSMETIC_CATEGORIES.map((category) => ({
    category,
    items: res.catalog
      .filter((c) => c.category === category)
      .map((c) => ({
        id: c.id,
        name: c.name,
        owned: ownedSet.has(c.id),
        equipped: res.equipped[category] === c.id,
        unlocksAtMilestone:
          !ownedSet.has(c.id) && c.unlock.kind === 'attunement' ? c.unlock.milestone : null,
      })),
  }));
}

/** Can this cosmetic be equipped right now? (owned and not already equipped). */
export function canEquip(item: WardrobeItem): boolean {
  return item.owned && !item.equipped;
}
