import { describe, it, expect } from 'vitest';
import { CHUNK_SIZE } from './constants';
import { TerrainType, terrainAt, generateChunk, isTerrainType, regionHash } from './terrain';

const SEED = 12345;

describe('terrainAt', () => {
  it('is deterministic for a given seed and coordinate', () => {
    expect(terrainAt(SEED, 0, 0)).toBe(terrainAt(SEED, 0, 0));
    expect(terrainAt(SEED, 0, 0)).toBe(TerrainType.Grass);
  });

  it('always returns a valid terrain type, including at negative coords', () => {
    for (const [x, y] of [
      [0, 0],
      [500, -500],
      [-1234, 987],
    ] as const) {
      expect(isTerrainType(terrainAt(SEED, x, y))).toBe(true);
    }
  });
});

describe('generateChunk', () => {
  it('produces a CHUNK_SIZE² row-major grid', () => {
    expect(generateChunk(SEED, 0, 0).length).toBe(CHUNK_SIZE * CHUNK_SIZE);
  });

  it('is byte-identical for the same (seed, cx, cy)', () => {
    expect(generateChunk(SEED, 2, -1)).toEqual(generateChunk(SEED, 2, -1));
  });

  it('differs between different chunks', () => {
    expect(generateChunk(SEED, 0, 0)).not.toEqual(generateChunk(SEED, 1, 0));
  });

  it('every tile is a valid terrain type', () => {
    expect([...generateChunk(SEED, 0, 0)].every(isTerrainType)).toBe(true);
  });

  it('yields terrain variety (not a flat single-type region)', () => {
    const distinct = new Set(generateChunk(SEED, 0, 0));
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });
});

describe('regionHash (cross-engine determinism lock)', () => {
  it('matches a locked golden value for a known seed + region', () => {
    // If this changes, the terrain algorithm changed → bump SEED_VERSION.
    expect(regionHash(SEED, 0, 0, 16, 16)).toBe('8a350b57');
    expect(regionHash(SEED, 0, 0, CHUNK_SIZE, CHUNK_SIZE)).toBe('586ce48a');
  });

  it('is stable across repeated calls', () => {
    expect(regionHash(SEED, 0, 0, 16, 16)).toBe(regionHash(SEED, 0, 0, 16, 16));
  });

  it('changes with the seed', () => {
    expect(regionHash(999, 0, 0, 16, 16)).not.toBe(regionHash(SEED, 0, 0, 16, 16));
  });
});
