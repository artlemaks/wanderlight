/**
 * Accessibility settings + colorblind-safe palettes (P5-CLI-03).
 *
 * Two axes the player controls: **reduced motion** (damps parallax, particle trails, glow pulsing) and
 * a **colorblind-safe light palette** (remaps the warmth-tier tints — the game's core visual language —
 * to a ramp distinguishable under the common color-vision deficiencies). Pure data + helpers so the
 * client render shells apply them and the values are unit-tested; nothing here reaches into PixiJS.
 */

/** Supported color-vision modes. `none` = the default painterly ramp. */
export const COLORBLIND_MODES = ['none', 'protanopia', 'deuteranopia', 'tritanopia'] as const;
export type ColorblindMode = (typeof COLORBLIND_MODES)[number];

export function isColorblindMode(v: unknown): v is ColorblindMode {
  return typeof v === 'string' && (COLORBLIND_MODES as readonly string[]).includes(v);
}

export interface AccessibilitySettings {
  /** Damp motion (parallax, particles, glow animation) for motion-sensitive players. */
  readonly reducedMotion: boolean;
  /** Which colorblind-safe palette to use for warmth tints. */
  readonly colorblindMode: ColorblindMode;
  /** Prefer click-to-move only (no continuous keyboard glide) — a motor-accessibility input option. */
  readonly clickToMoveOnly: boolean;
}

export const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  reducedMotion: false,
  colorblindMode: 'none',
  clickToMoveOnly: false,
};

/**
 * Warmth-tier tints (cool → warm, 5 tiers) per color-vision mode. `none` matches the painterly default;
 * the deficiency ramps trade the red↔green contrast (unreadable for protan/deutan) for a
 * blue↔yellow/orange ramp (the most robust axis), and tritanopia uses a magenta↔teal ramp. Warmth must
 * stay legible for everyone because it is the world's visible memory (scope §glossary).
 */
export const WARMTH_TINTS_BY_MODE: Record<ColorblindMode, readonly number[]> = {
  none: [0x5a6b7a, 0x6f7f6a, 0x93a15a, 0xc9a24b, 0xe8b04a],
  // Protanopia / deuteranopia: blue → yellow ramp (robust across red-green loss).
  protanopia: [0x4b6b9a, 0x6f8fb0, 0x9fb0b0, 0xd8c874, 0xf2d64a],
  deuteranopia: [0x4b6b9a, 0x6f8fb0, 0x9fb0b0, 0xd8c874, 0xf2d64a],
  // Tritanopia: teal → magenta ramp (avoids the blue-yellow axis it can't resolve).
  tritanopia: [0x2f8f8f, 0x6fae9f, 0xb0a0b0, 0xd07fa8, 0xe85a90],
};

/** The warmth tints for a mode (falls back to `none`). */
export function warmthTintsForMode(mode: ColorblindMode): readonly number[] {
  return WARMTH_TINTS_BY_MODE[mode] ?? WARMTH_TINTS_BY_MODE.none;
}

/**
 * Motion scale `0..1` the render shell multiplies into animation amplitudes (parallax offset, particle
 * rate, glow pulse). Reduced motion damps to a small residual rather than a hard 0 so the world isn't
 * frozen — motion is calmed, not removed.
 */
export function motionScale(settings: AccessibilitySettings): number {
  return settings.reducedMotion ? 0.15 : 1;
}
