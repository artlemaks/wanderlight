import { describe, it, expect } from 'vitest';
import { DEFAULT_ACCESSIBILITY, WARMTH_TINTS_BY_MODE } from '@wanderlight/shared';
import { renderAccessibility, warmthTintForTier } from './accessibility';

describe('renderAccessibility', () => {
  it('full motion + particles + glide by default', () => {
    const r = renderAccessibility(DEFAULT_ACCESSIBILITY);
    expect(r).toEqual({ motionScale: 1, particlesEnabled: true, keyboardGlide: true });
  });

  it('reduced motion damps motion and disables particles', () => {
    const r = renderAccessibility({ ...DEFAULT_ACCESSIBILITY, reducedMotion: true });
    expect(r.motionScale).toBeLessThan(1);
    expect(r.particlesEnabled).toBe(false);
  });

  it('click-to-move only disables keyboard glide', () => {
    const r = renderAccessibility({ ...DEFAULT_ACCESSIBILITY, clickToMoveOnly: true });
    expect(r.keyboardGlide).toBe(false);
  });
});

describe('warmthTintForTier', () => {
  it('uses the colorblind-safe palette for the mode', () => {
    const tier = 4;
    expect(
      warmthTintForTier({ ...DEFAULT_ACCESSIBILITY, colorblindMode: 'deuteranopia' }, tier),
    ).toBe(WARMTH_TINTS_BY_MODE.deuteranopia[tier]);
  });

  it('clamps out-of-range tiers', () => {
    expect(warmthTintForTier(DEFAULT_ACCESSIBILITY, -5)).toBe(WARMTH_TINTS_BY_MODE.none[0]);
    expect(warmthTintForTier(DEFAULT_ACCESSIBILITY, 99)).toBe(WARMTH_TINTS_BY_MODE.none[4]);
  });
});
