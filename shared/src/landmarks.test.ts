import { describe, it, expect } from 'vitest';
import { CHUNK_SIZE } from './constants';
import { LandmarkType, landmarksInChunk } from './landmarks';

const SEED = 12345;

function occupiedKeys(seed: number, span: number): Set<string> {
  const keys = new Set<string>();
  for (let cy = 0; cy < span; cy++) {
    for (let cx = 0; cx < span; cx++) {
      if (landmarksInChunk(seed, cx, cy).length > 0) keys.add(`${cx},${cy}`);
    }
  }
  return keys;
}

describe('landmarksInChunk', () => {
  it('is deterministic for the same (seed, cx, cy)', () => {
    expect(landmarksInChunk(SEED, 0, 0)).toEqual(landmarksInChunk(SEED, 0, 0));
  });

  it('places the locked landmark at chunk (0,0)', () => {
    expect(landmarksInChunk(SEED, 0, 0)).toEqual([
      { type: LandmarkType.Shrine, worldX: 58, worldY: 1 },
    ]);
  });

  it('positions every landmark within its chunk bounds', () => {
    for (let cy = 0; cy < 10; cy++) {
      for (let cx = 0; cx < 10; cx++) {
        for (const lm of landmarksInChunk(SEED, cx, cy)) {
          expect(lm.worldX).toBeGreaterThanOrEqual(cx * CHUNK_SIZE);
          expect(lm.worldX).toBeLessThan((cx + 1) * CHUNK_SIZE);
          expect(lm.worldY).toBeGreaterThanOrEqual(cy * CHUNK_SIZE);
          expect(lm.worldY).toBeLessThan((cy + 1) * CHUNK_SIZE);
        }
      }
    }
  });

  it('leaves some chunks empty and populates others (locked density)', () => {
    expect(landmarksInChunk(SEED, 3, 7)).toEqual([]);
    expect(occupiedKeys(SEED, 20).size).toBe(150); // 150 / 400 ≈ 0.375, near LANDMARK_CHANCE
  });

  it('is deterministic at negative chunk coordinates', () => {
    expect(landmarksInChunk(SEED, -2, -5)).toEqual(landmarksInChunk(SEED, -2, -5));
  });

  it('produces a different placement pattern for a different seed', () => {
    expect([...occupiedKeys(999, 20)].sort()).not.toEqual([...occupiedKeys(SEED, 20)].sort());
  });
});
