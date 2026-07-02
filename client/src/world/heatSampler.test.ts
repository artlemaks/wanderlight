import { describe, it, expect } from 'vitest';
import {
  createHeatSampler,
  sampleHeat,
  drainBatch,
  batchReady,
  SAMPLE_INTERVAL_MS,
  MAX_BATCH,
} from './heatSampler';
import { FOOTPATH_TILE_RESOLUTION } from '@wanderlight/shared';

describe('heat sampler', () => {
  it('does not record until a full sample interval has elapsed', () => {
    let s = createHeatSampler();
    s = sampleHeat(s, 0, 0, SAMPLE_INTERVAL_MS / 2);
    expect(s.pending).toHaveLength(0);
    s = sampleHeat(s, 0, 0, SAMPLE_INTERVAL_MS / 2);
    expect(s.pending).toHaveLength(1);
  });

  it('drops consecutive samples in the same tile (standing still is free)', () => {
    let s = createHeatSampler();
    s = sampleHeat(s, 1, 1, SAMPLE_INTERVAL_MS);
    s = sampleHeat(s, 2, 2, SAMPLE_INTERVAL_MS); // same footpath tile (res 4)
    expect(s.pending).toHaveLength(1);
  });

  it('records a new tile once the traveler moves to a different footpath tile', () => {
    let s = createHeatSampler();
    s = sampleHeat(s, 0, 0, SAMPLE_INTERVAL_MS);
    s = sampleHeat(s, FOOTPATH_TILE_RESOLUTION, 0, SAMPLE_INTERVAL_MS);
    expect(s.pending).toHaveLength(2);
    expect(s.pending).toEqual([
      { tx: 0, ty: 0 },
      { tx: 1, ty: 0 },
    ]);
  });

  it('drains the buffer for sending and clears pending', () => {
    let s = createHeatSampler();
    s = sampleHeat(s, 0, 0, SAMPLE_INTERVAL_MS);
    const { batch, state } = drainBatch(s);
    expect(batch).toHaveLength(1);
    expect(state.pending).toHaveLength(0);
  });

  it('flags batchReady at the cap and stops growing past it', () => {
    let s = createHeatSampler();
    for (let i = 0; i < MAX_BATCH + 10; i++) {
      // Move far each step so every sample is a distinct tile.
      s = sampleHeat(s, i * FOOTPATH_TILE_RESOLUTION, 0, SAMPLE_INTERVAL_MS);
    }
    expect(s.pending.length).toBe(MAX_BATCH);
    expect(batchReady(s)).toBe(true);
  });
});
