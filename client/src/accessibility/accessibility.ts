/**
 * Accessibility application core (P5-CLI-03) — pure, no PixiJS.
 *
 * Resolves the player's {@link AccessibilitySettings} into concrete render decisions the shells apply:
 * the motion multiplier, whether trails/particles run, the input mode, and the colorblind-safe warmth
 * tint for a given tier. Kept pure so the choices are unit-tested and the Pixi layers stay thin shells
 * (`pure-core-thin-pixi-shell`).
 */

import { warmthTintsForMode, motionScale, type AccessibilitySettings } from '@wanderlight/shared';

export interface RenderAccessibility {
  /** Multiplier for animation amplitudes (parallax, particles, glow). */
  readonly motionScale: number;
  /** Whether decorative particle trails run at all. */
  readonly particlesEnabled: boolean;
  /** Whether continuous keyboard glide is allowed (false → click-to-move only). */
  readonly keyboardGlide: boolean;
}

/** Resolve settings into render-time flags. */
export function renderAccessibility(settings: AccessibilitySettings): RenderAccessibility {
  return {
    motionScale: motionScale(settings),
    particlesEnabled: !settings.reducedMotion,
    keyboardGlide: !settings.clickToMoveOnly,
  };
}

/** The colorblind-safe warmth tint for a tier under the current settings. */
export function warmthTintForTier(settings: AccessibilitySettings, tier: number): number {
  const tints = warmthTintsForMode(settings.colorblindMode);
  const clamped = Math.max(0, Math.min(tints.length - 1, tier));
  return tints[clamped]!;
}
