/**
 * Season + Trail Pass (P4-DATA-01 / P4-SRV-01/02 / P4-CLI-01).
 *
 * A season is a themed, time-boxed reward run ("The Waking Vale"). Playing earns **season XP**; every
 * tier reached unlocks a reward on the **free lane**, and premium-tier players additionally unlock the
 * **premium lane**.
 *
 * **Monetization guardrails (scope §9 — binding, see `monetization-guardrails-in-ac`):** every pass
 * reward is a **cosmetic or a mote boost** — never power, never a shared-world advantage. The free lane
 * is fully reachable by play. Cosmetic rewards reference the {@link COSMETICS} catalog, every item of
 * which is *also* free-earnable on the attunement track — so the premium lane is a shortcut, never the
 * sole path to any cosmetic.
 */

/** A season definition. `tiers` reward slots, each worth `xpPerTier` XP to reach. */
export interface Season {
  readonly id: string;
  readonly name: string;
  readonly tiers: number;
  readonly xpPerTier: number;
}

/** The launch season (scope §glossary — The Waking Vale). ~6–8 weeks of play at this XP cadence. */
export const WAKING_VALE_SEASON: Season = {
  id: 'waking-vale',
  name: 'The Waking Vale',
  tiers: 12,
  xpPerTier: 100,
};

/** Season XP granted per play event (P4-SRV-01). Mirrors the attunement earn hooks. */
export const SEASON_XP_EARN = {
  place_trace: 10,
  receive_appreciation: 12,
  first_light: 6,
  offering: 6,
  gift_claim: 4,
} as const;
export type SeasonXpEarnKind = keyof typeof SEASON_XP_EARN;

export type PassLane = 'free' | 'premium';

/** A single Trail Pass reward. Cosmetic (from the free-earnable catalog) or a mote boost — never power. */
export type PassReward =
  | { readonly kind: 'cosmetic'; readonly cosmeticId: string }
  | { readonly kind: 'mote_boost'; readonly motes: number };

/** The reward on each lane at a given tier (`null` = no reward on that lane this tier). */
export interface PassTierRewards {
  readonly tier: number;
  readonly free: PassReward | null;
  readonly premium: PassReward | null;
}

/**
 * The Waking Vale reward tracks (12 tiers). Free lane mixes catalog cosmetics + mote boosts; premium
 * lane adds more cosmetics + bigger boosts. Every `cosmeticId` here exists in {@link COSMETICS} and is
 * therefore free-earnable via attunement (guardrail §9 — the pass is a shortcut, not a wall).
 */
export const PASS_TRACKS: readonly PassTierRewards[] = [
  {
    tier: 1,
    free: { kind: 'mote_boost', motes: 10 },
    premium: { kind: 'cosmetic', cosmeticId: 'lantern.rose' },
  },
  {
    tier: 2,
    free: { kind: 'cosmetic', cosmeticId: 'wrap.ribbon' },
    premium: { kind: 'mote_boost', motes: 15 },
  },
  {
    tier: 3,
    free: { kind: 'mote_boost', motes: 10 },
    premium: { kind: 'cosmetic', cosmeticId: 'lantern.jade' },
  },
  {
    tier: 4,
    free: { kind: 'cosmetic', cosmeticId: 'trail.sparkle' },
    premium: { kind: 'mote_boost', motes: 20 },
  },
  {
    tier: 5,
    free: { kind: 'mote_boost', motes: 15 },
    premium: { kind: 'cosmetic', cosmeticId: 'cloak.dawn' },
  },
  {
    tier: 6,
    free: { kind: 'cosmetic', cosmeticId: 'glyph.spiral' },
    premium: { kind: 'mote_boost', motes: 20 },
  },
  {
    tier: 7,
    free: { kind: 'mote_boost', motes: 15 },
    premium: { kind: 'cosmetic', cosmeticId: 'lantern.violet' },
  },
  {
    tier: 8,
    free: { kind: 'cosmetic', cosmeticId: 'frame.carved' },
    premium: { kind: 'mote_boost', motes: 25 },
  },
  {
    tier: 9,
    free: { kind: 'mote_boost', motes: 20 },
    premium: { kind: 'cosmetic', cosmeticId: 'lantern.ember' },
  },
  {
    tier: 10,
    free: { kind: 'cosmetic', cosmeticId: 'wrap.bloom' },
    premium: { kind: 'mote_boost', motes: 30 },
  },
  {
    tier: 11,
    free: { kind: 'mote_boost', motes: 20 },
    premium: { kind: 'cosmetic', cosmeticId: 'lantern.frost' },
  },
  {
    tier: 12,
    free: { kind: 'cosmetic', cosmeticId: 'cloak.dusk' },
    premium: { kind: 'cosmetic', cosmeticId: 'lantern.gold' },
  },
];

/** The tier a player has reached for a given XP total (0 = below tier 1), capped at the season size. */
export function seasonTierForXp(xp: number, season: Season = WAKING_VALE_SEASON): number {
  return Math.min(season.tiers, Math.floor(Math.max(0, xp) / season.xpPerTier));
}

/** XP required to reach a given tier. */
export function xpForTier(tier: number, season: Season = WAKING_VALE_SEASON): number {
  return tier * season.xpPerTier;
}

/** Look up the reward slots for a tier (1-indexed), or undefined. */
export function passTier(tier: number): PassTierRewards | undefined {
  return PASS_TRACKS.find((t) => t.tier === tier);
}

/** The reward for a specific lane+tier, or null if that lane has none that tier. */
export function passReward(lane: PassLane, tier: number): PassReward | null {
  const t = passTier(tier);
  if (!t) return null;
  return lane === 'free' ? t.free : t.premium;
}

/** A claim key (`${lane}:${tier}`) for the claimed-set idempotency ledger. */
export function claimKey(lane: PassLane, tier: number): string {
  return `${lane}:${tier}`;
}
