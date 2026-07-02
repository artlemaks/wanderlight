/**
 * Warmth visual state (P2-CLI-04, basic) — pure core.
 *
 * Maps a chunk's raw warmth to a discrete visual: a tint colour and a lushness factor the render
 * shell applies so warmer, more-loved chunks look visibly lusher / glowing. This is the *basic* pass
 * — enough to prove the loop (warmer chunks read as warmer) — with the polished treatment deferred to
 * P5.
 *
 * **Approach chosen for P5 (documented here per the AC):** a *sprite overlay* — a per-chunk tinted,
 * additively-blended quad whose alpha = `lushness` — is the P2 prototype path. It is cheap (one extra
 * quad per visible chunk, no shader pipeline), works within the existing PixiJS container model, and
 * is trivially A/B-testable. A fragment *shader* (per-tile lushness ramp, animated glow) is the
 * richer option but is deferred to P5 where the painterly art pass lands; the tier/lushness numbers
 * here are the shared contract both approaches consume, so swapping the shell later needs no data
 * change.
 */

import { warmthTier, WARMTH_TIER_COUNT } from '@wanderlight/shared';

export interface WarmthVisual {
  /** Discrete tier `0..WARMTH_TIER_COUNT-1`. */
  readonly tier: number;
  /** Overlay strength `0..1` the shell maps to tint alpha / glow. */
  readonly lushness: number;
  /** Suggested tint colour (0xRRGGBB) for the warmth overlay at this tier. */
  readonly tint: number;
}

/** Per-tier tint, cool → warm (cold blue-grey up to a warm amber glow). Indexed by tier. */
export const WARMTH_TIER_TINTS: readonly number[] = [
  0x5a6b7a, // 0 cold
  0x6f7f6a, // 1 cool green
  0x93a15a, // 2 mild
  0xc9a24b, // 3 warm
  0xe8b04a, // 4 radiant
];

/** Compute the visual state for a chunk's raw `warmth`. */
export function warmthVisual(warmth: number): WarmthVisual {
  const tier = warmthTier(warmth);
  const lushness = WARMTH_TIER_COUNT > 1 ? tier / (WARMTH_TIER_COUNT - 1) : 0;
  const tint = WARMTH_TIER_TINTS[tier] ?? WARMTH_TIER_TINTS[WARMTH_TIER_TINTS.length - 1]!;
  return { tier, lushness, tint };
}
