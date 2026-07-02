import { describe, it, expect } from 'vitest';
import { computeChunkFetch } from './chunkFetch';

describe('computeChunkFetch', () => {
  it('fetches newly visible chunks not already cached', () => {
    const plan = computeChunkFetch(['0,0', '1,0'], new Set(['0,0']));
    expect(plan.toFetch).toEqual(['1,0']);
    expect(plan.toEvict).toEqual([]);
  });

  it('evicts cached chunks that are no longer visible', () => {
    const plan = computeChunkFetch(['1,0'], new Set(['0,0', '1,0']));
    expect(plan.toFetch).toEqual([]);
    expect(plan.toEvict).toEqual(['0,0']);
  });

  it('does not re-fetch chunks already in flight (no duplicate fetches)', () => {
    const plan = computeChunkFetch(['0,0', '1,0'], new Set(), new Set(['1,0']));
    expect(plan.toFetch).toEqual(['0,0']);
  });

  it('is a no-op when the visible set exactly matches the cache', () => {
    const plan = computeChunkFetch(['0,0', '1,0'], new Set(['0,0', '1,0']));
    expect(plan).toEqual({ toFetch: [], toEvict: [] });
  });

  it('handles a full pan: everything old evicts, everything new fetches', () => {
    const plan = computeChunkFetch(['5,5', '6,5'], new Set(['0,0', '1,0']));
    expect(plan.toFetch.sort()).toEqual(['5,5', '6,5']);
    expect(plan.toEvict.sort()).toEqual(['0,0', '1,0']);
  });
});
