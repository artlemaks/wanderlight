import { describe, it, expect } from 'vitest';
import { warmthVisual, WARMTH_TIER_TINTS } from './warmthVisual';

describe('warmthVisual', () => {
  it('gives a cold chunk tier 0 and no lushness', () => {
    const v = warmthVisual(0);
    expect(v.tier).toBe(0);
    expect(v.lushness).toBe(0);
    expect(v.tint).toBe(WARMTH_TIER_TINTS[0]);
  });

  it('gives a radiant chunk the top tier and full lushness', () => {
    const v = warmthVisual(1_000);
    expect(v.tier).toBe(WARMTH_TIER_TINTS.length - 1);
    expect(v.lushness).toBe(1);
  });

  it('increases lushness monotonically with warmth', () => {
    expect(warmthVisual(2).lushness).toBeGreaterThan(warmthVisual(0).lushness);
    expect(warmthVisual(20).lushness).toBeGreaterThan(warmthVisual(2).lushness);
  });
});
