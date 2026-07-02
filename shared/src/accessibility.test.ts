import { describe, it, expect } from 'vitest';
import {
  COLORBLIND_MODES,
  DEFAULT_ACCESSIBILITY,
  WARMTH_TINTS_BY_MODE,
  warmthTintsForMode,
  motionScale,
  isColorblindMode,
} from './accessibility';

describe('accessibility settings', () => {
  it('defaults to full motion + default palette', () => {
    expect(DEFAULT_ACCESSIBILITY).toEqual({
      reducedMotion: false,
      colorblindMode: 'none',
      clickToMoveOnly: false,
    });
  });

  it('every mode has a full 5-tier warmth ramp', () => {
    for (const mode of COLORBLIND_MODES) {
      expect(WARMTH_TINTS_BY_MODE[mode]).toHaveLength(5);
      expect(warmthTintsForMode(mode)).toHaveLength(5);
    }
  });

  it('damps but does not freeze motion when reduced', () => {
    expect(motionScale({ ...DEFAULT_ACCESSIBILITY, reducedMotion: false })).toBe(1);
    const damped = motionScale({ ...DEFAULT_ACCESSIBILITY, reducedMotion: true });
    expect(damped).toBeGreaterThan(0);
    expect(damped).toBeLessThan(1);
  });

  it('validates colorblind modes', () => {
    expect(isColorblindMode('deuteranopia')).toBe(true);
    expect(isColorblindMode('nope')).toBe(false);
  });
});
