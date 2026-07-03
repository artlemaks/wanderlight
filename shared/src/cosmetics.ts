/**
 * Cosmetics catalog + attunement unlock track (P3-DATA-01 / P3-SRV-05 / P3-CLI-02/03).
 *
 * Cosmetics are pure self-expression — cloaks, emote-glyphs, trails, lantern colors, signpost frames,
 * gift wraps. **Monetization guardrails (scope §9 — binding, see `monetization-guardrails-in-ac`):**
 * every catalog item is reachable through free play. Non-default items unlock on the **attunement**
 * track — milestones crossed by playing (the `attunement` counter the server raises on earn events).
 * The P4 store may later sell the same items for embers as a *shortcut*, never as the only path, and
 * nothing here grants gameplay power or alters another player's world.
 *
 * Shared so the server is authoritative over ownership/unlocks and the client renders + previews the
 * wardrobe without duplicating the catalog.
 */

/** The equippable cosmetic families. One item per category may be equipped at a time (a slot). */
export const COSMETIC_CATEGORIES = [
  'cloak',
  'glyph',
  'trail',
  'lantern_color',
  'signpost_frame',
  'gift_wrap',
] as const;
export type CosmeticCategory = (typeof COSMETIC_CATEGORIES)[number];

/**
 * How a cosmetic is earned through free play. `default` items are owned from account creation; every
 * other item unlocks on an **attunement milestone** (see {@link ATTUNEMENT_MILESTONES}). This union is
 * the guardrail made concrete: there is no `kind: 'embers-only'` — every item has a free path.
 */
export type CosmeticUnlock =
  { readonly kind: 'default' } | { readonly kind: 'attunement'; readonly milestone: number };

export interface CosmeticItem {
  readonly id: string;
  readonly category: CosmeticCategory;
  readonly name: string;
  readonly unlock: CosmeticUnlock;
}

/**
 * Attunement milestone thresholds (P3-SRV-05). Index = milestone level; value = attunement points
 * required to reach it. A player's level is the highest index whose threshold they have met. Play
 * earns attunement (place a trace, receive an appreciation, first-light, make an offering); crossing a
 * threshold grants that milestone's cosmetics. Additive: append higher tiers, never renumber.
 */
export const ATTUNEMENT_MILESTONES: readonly number[] = [0, 25, 60, 120, 200, 320, 480, 700];

/** Attunement points granted per play event that raises the light within a traveler (P3-SRV-05). */
export const ATTUNEMENT_EARN = {
  place_trace: 3,
  receive_appreciation: 4,
  first_light: 2,
  offering: 2,
  gift_claim: 1,
} as const;
export type AttunementEarnKind = keyof typeof ATTUNEMENT_EARN;

/**
 * The full cosmetic catalog. Defaults ship with every account; the rest spread across the attunement
 * milestones so the whole set is free-earnable by play (guardrail §9). ≥8 lantern colors per the P3
 * handoff to the P4 store (P3-CLI-03).
 */
export const COSMETICS: readonly CosmeticItem[] = [
  // Traveler cloaks
  { id: 'cloak.wanderer', category: 'cloak', name: 'Wanderer', unlock: { kind: 'default' } },
  {
    id: 'cloak.mist',
    category: 'cloak',
    name: 'Mistweave',
    unlock: { kind: 'attunement', milestone: 1 },
  },
  {
    id: 'cloak.dawn',
    category: 'cloak',
    name: 'Dawnfall',
    unlock: { kind: 'attunement', milestone: 3 },
  },
  {
    id: 'cloak.forest',
    category: 'cloak',
    name: 'Deepwood',
    unlock: { kind: 'attunement', milestone: 5 },
  },
  {
    id: 'cloak.dusk',
    category: 'cloak',
    name: 'Duskveil',
    unlock: { kind: 'attunement', milestone: 7 },
  },
  // Emote-glyphs
  { id: 'glyph.none', category: 'glyph', name: 'None', unlock: { kind: 'default' } },
  {
    id: 'glyph.spiral',
    category: 'glyph',
    name: 'Spiral',
    unlock: { kind: 'attunement', milestone: 2 },
  },
  {
    id: 'glyph.leaf',
    category: 'glyph',
    name: 'Leaf',
    unlock: { kind: 'attunement', milestone: 4 },
  },
  {
    id: 'glyph.star',
    category: 'glyph',
    name: 'Star',
    unlock: { kind: 'attunement', milestone: 6 },
  },
  // Traveler trails
  { id: 'trail.none', category: 'trail', name: 'None', unlock: { kind: 'default' } },
  {
    id: 'trail.sparkle',
    category: 'trail',
    name: 'Sparkle',
    unlock: { kind: 'attunement', milestone: 2 },
  },
  {
    id: 'trail.petal',
    category: 'trail',
    name: 'Petalfall',
    unlock: { kind: 'attunement', milestone: 4 },
  },
  {
    id: 'trail.glow',
    category: 'trail',
    name: 'Softglow',
    unlock: { kind: 'attunement', milestone: 6 },
  },
  // Lantern colors (≥8)
  { id: 'lantern.amber', category: 'lantern_color', name: 'Amber', unlock: { kind: 'default' } },
  {
    id: 'lantern.rose',
    category: 'lantern_color',
    name: 'Rose',
    unlock: { kind: 'attunement', milestone: 1 },
  },
  {
    id: 'lantern.jade',
    category: 'lantern_color',
    name: 'Jade',
    unlock: { kind: 'attunement', milestone: 2 },
  },
  {
    id: 'lantern.azure',
    category: 'lantern_color',
    name: 'Azure',
    unlock: { kind: 'attunement', milestone: 3 },
  },
  {
    id: 'lantern.violet',
    category: 'lantern_color',
    name: 'Violet',
    unlock: { kind: 'attunement', milestone: 4 },
  },
  {
    id: 'lantern.ember',
    category: 'lantern_color',
    name: 'Ember',
    unlock: { kind: 'attunement', milestone: 5 },
  },
  {
    id: 'lantern.frost',
    category: 'lantern_color',
    name: 'Frost',
    unlock: { kind: 'attunement', milestone: 6 },
  },
  {
    id: 'lantern.gold',
    category: 'lantern_color',
    name: 'Gold',
    unlock: { kind: 'attunement', milestone: 7 },
  },
  // Signpost frames
  { id: 'frame.plain', category: 'signpost_frame', name: 'Plain', unlock: { kind: 'default' } },
  {
    id: 'frame.carved',
    category: 'signpost_frame',
    name: 'Carved',
    unlock: { kind: 'attunement', milestone: 3 },
  },
  {
    id: 'frame.vine',
    category: 'signpost_frame',
    name: 'Vinewrought',
    unlock: { kind: 'attunement', milestone: 5 },
  },
  {
    id: 'frame.stone',
    category: 'signpost_frame',
    name: 'Stonecut',
    unlock: { kind: 'attunement', milestone: 7 },
  },
  // Gift wraps
  { id: 'wrap.simple', category: 'gift_wrap', name: 'Simple', unlock: { kind: 'default' } },
  {
    id: 'wrap.ribbon',
    category: 'gift_wrap',
    name: 'Ribboned',
    unlock: { kind: 'attunement', milestone: 2 },
  },
  {
    id: 'wrap.bloom',
    category: 'gift_wrap',
    name: 'Blooming',
    unlock: { kind: 'attunement', milestone: 4 },
  },
  {
    id: 'wrap.woven',
    category: 'gift_wrap',
    name: 'Woven',
    unlock: { kind: 'attunement', milestone: 6 },
  },
];

const COSMETIC_BY_ID: ReadonlyMap<string, CosmeticItem> = new Map(COSMETICS.map((c) => [c.id, c]));

/** Look up a catalog item, or `undefined` if the id is unknown (reject client-invented ids). */
export function cosmeticById(id: string): CosmeticItem | undefined {
  return COSMETIC_BY_ID.get(id);
}

/** Is `id` a real catalog cosmetic? Narrows at request boundaries. */
export function isCosmeticId(id: unknown): id is string {
  return typeof id === 'string' && COSMETIC_BY_ID.has(id);
}

/** The default-owned cosmetic ids granted to every new account (one base item per category). */
export function defaultCosmeticIds(): string[] {
  return COSMETICS.filter((c) => c.unlock.kind === 'default').map((c) => c.id);
}

/** The default equipped item per category — the base look a fresh traveler wears. */
export function defaultEquipped(): Record<CosmeticCategory, string> {
  const out = {} as Record<CosmeticCategory, string>;
  for (const cat of COSMETIC_CATEGORIES) {
    const base = COSMETICS.find((c) => c.category === cat && c.unlock.kind === 'default');
    if (base) out[cat] = base.id;
  }
  return out;
}

/** The attunement level (highest reached milestone index) for a given point total. */
export function attunementLevel(points: number): number {
  let level = 0;
  for (let i = 0; i < ATTUNEMENT_MILESTONES.length; i += 1) {
    if (points >= ATTUNEMENT_MILESTONES[i]!) level = i;
  }
  return level;
}

/**
 * Every cosmetic id a player at `level` has earned through the attunement track (plus defaults). This
 * is the server's authority on ownership: the reward for play, re-derivable from the point total.
 */
export function cosmeticsOwnedAtLevel(level: number): string[] {
  return COSMETICS.filter(
    (c) =>
      c.unlock.kind === 'default' ||
      (c.unlock.kind === 'attunement' && c.unlock.milestone <= level),
  ).map((c) => c.id);
}

/** Is `v` a known cosmetic category? */
export function isCosmeticCategory(v: unknown): v is CosmeticCategory {
  return typeof v === 'string' && (COSMETIC_CATEGORIES as readonly string[]).includes(v);
}

/** `GET /cosmetics` — the catalog plus this player's owned set, equipped slots, and attunement. */
export interface CosmeticsResponse {
  readonly catalog: readonly CosmeticItem[];
  readonly owned: readonly string[];
  readonly equipped: Record<CosmeticCategory, string>;
  readonly attunement: number;
  readonly level: number;
}

/** `POST /cosmetics/equip` — the equipped slots after the change. */
export interface EquipResponse {
  readonly equipped: Record<CosmeticCategory, string>;
}
