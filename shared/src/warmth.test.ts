import { describe, it, expect } from 'vitest';
import {
  warmthTier,
  WARMTH_TIER_COUNT,
  footfallWarmth,
  footpathTile,
  footpathTileKey,
  footpathWear,
  FOOTPATH_TILE_RESOLUTION,
  FOOTPATH_MIN_VISITS,
  FOOTPATH_FULL_WEAR_VISITS,
} from './warmth';

describe('warmthTier', () => {
  it('is 0 for a cold chunk', () => {
    expect(warmthTier(0)).toBe(0);
    expect(warmthTier(0.9)).toBe(0);
  });

  it('rises monotonically through the tiers and saturates at the top', () => {
    expect(warmthTier(1)).toBe(1);
    expect(warmthTier(5)).toBe(2);
    expect(warmthTier(15)).toBe(3);
    expect(warmthTier(40)).toBe(4);
    expect(warmthTier(1_000)).toBe(WARMTH_TIER_COUNT - 1);
  });
});

describe('footfallWarmth', () => {
  it('scales with visits and never goes negative', () => {
    expect(footfallWarmth(10)).toBeCloseTo(1, 5);
    expect(footfallWarmth(0)).toBe(0);
    expect(footfallWarmth(-5)).toBe(0);
  });
});

describe('footpath tiles', () => {
  it('snaps world-tile coords to the footpath grid', () => {
    expect(footpathTile(0, 0)).toEqual({ tx: 0, ty: 0 });
    expect(footpathTile(FOOTPATH_TILE_RESOLUTION, FOOTPATH_TILE_RESOLUTION)).toEqual({
      tx: 1,
      ty: 1,
    });
    expect(footpathTile(-1, -1)).toEqual({ tx: -1, ty: -1 });
  });

  it('produces a stable key', () => {
    expect(footpathTileKey(2, -3)).toBe('2,-3');
  });
});

describe('footpathWear', () => {
  it('is 0 below the minimum visit threshold', () => {
    expect(footpathWear(FOOTPATH_MIN_VISITS - 1)).toBe(0);
  });

  it('ramps toward and saturates at 1 by the full-wear threshold', () => {
    expect(footpathWear(FOOTPATH_MIN_VISITS)).toBeCloseTo(0, 5);
    expect(footpathWear(FOOTPATH_FULL_WEAR_VISITS)).toBe(1);
    expect(footpathWear(FOOTPATH_FULL_WEAR_VISITS * 2)).toBe(1);
    const mid = footpathWear((FOOTPATH_MIN_VISITS + FOOTPATH_FULL_WEAR_VISITS) / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});
