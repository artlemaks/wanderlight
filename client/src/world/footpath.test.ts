import { describe, it, expect } from 'vitest';
import { wornFootpaths } from './footpath';
import { FOOTPATH_MIN_VISITS, FOOTPATH_FULL_WEAR_VISITS } from '@wanderlight/shared';

describe('wornFootpaths', () => {
  it('drops tiles below the minimum-visit threshold', () => {
    expect(wornFootpaths({ '0,0': FOOTPATH_MIN_VISITS - 1 })).toEqual([]);
  });

  it('returns worn tiles sorted by descending wear', () => {
    const worn = wornFootpaths({
      '0,0': FOOTPATH_FULL_WEAR_VISITS, // full wear
      '1,0': FOOTPATH_MIN_VISITS + 1, // faint
      '2,0': FOOTPATH_MIN_VISITS - 1, // below threshold → dropped
    });
    expect(worn.map((t) => `${t.tx},${t.ty}`)).toEqual(['0,0', '1,0']);
    expect(worn[0]!.wear).toBe(1);
    expect(worn[0]!.wear).toBeGreaterThan(worn[1]!.wear);
  });

  it('ignores malformed keys', () => {
    expect(wornFootpaths({ bogus: 100 })).toEqual([]);
  });
});
