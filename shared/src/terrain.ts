import { CHUNK_SIZE } from './constants';
import { hash2i, rand01 } from './rng';

/**
 * Seeded, deterministic terrain generation (P0-CLI-05) + cross-engine validation hash (P0-CLI-06).
 *
 * Terrain is softly-procedural value noise sampled from the integer hash in `rng.ts`: smooth,
 * region-forming, and identical for a given seed on every client/engine. Classification uses fixed
 * thresholds, so the same noise always yields the same terrain band. See decisions/ADR-002.
 */

export enum TerrainType {
  Water = 0,
  Sand = 1,
  Grass = 2,
  Forest = 3,
  Rock = 4,
}

const TERRAIN_TYPE_COUNT = 5;

/** World tiles per noise lattice cell. Larger = smoother, larger contiguous regions. */
const TERRAIN_SCALE = 24;

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value in [0,1) at an integer noise-lattice point. */
function latticeValue(seed: number, gx: number, gy: number): number {
  return rand01(hash2i(seed, gx, gy));
}

/** Smoothed value-noise sample in [0,1) at a world-tile coordinate. */
export function noiseAt(seed: number, worldX: number, worldY: number): number {
  const fx = worldX / TERRAIN_SCALE;
  const fy = worldY / TERRAIN_SCALE;
  const gx = Math.floor(fx);
  const gy = Math.floor(fy);
  const tx = smoothstep(fx - gx);
  const ty = smoothstep(fy - gy);

  const v00 = latticeValue(seed, gx, gy);
  const v10 = latticeValue(seed, gx + 1, gy);
  const v01 = latticeValue(seed, gx, gy + 1);
  const v11 = latticeValue(seed, gx + 1, gy + 1);

  const top = v00 + (v10 - v00) * tx;
  const bottom = v01 + (v11 - v01) * tx;
  return top + (bottom - top) * ty;
}

/** Terrain type at a world-tile coordinate. Deterministic for a given seed. */
export function terrainAt(seed: number, worldX: number, worldY: number): TerrainType {
  const n = noiseAt(seed, worldX, worldY);
  if (n < 0.3) return TerrainType.Water;
  if (n < 0.38) return TerrainType.Sand;
  if (n < 0.65) return TerrainType.Grass;
  if (n < 0.82) return TerrainType.Forest;
  return TerrainType.Rock;
}

/**
 * Terrain grid for a chunk as a flat `CHUNK_SIZE * CHUNK_SIZE` array (row-major).
 * Same `(seed, cx, cy)` → byte-identical result on every run and every engine.
 */
export function generateChunk(seed: number, cx: number, cy: number): Uint8Array {
  const out = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE);
  const originX = cx * CHUNK_SIZE;
  const originY = cy * CHUNK_SIZE;
  for (let ty = 0; ty < CHUNK_SIZE; ty++) {
    for (let tx = 0; tx < CHUNK_SIZE; tx++) {
      out[ty * CHUNK_SIZE + tx] = terrainAt(seed, originX + tx, originY + ty);
    }
  }
  return out;
}

/** True if `n` is a defined {@link TerrainType} value. */
export function isTerrainType(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n < TERRAIN_TYPE_COUNT;
}

/**
 * Stable 8-hex-char hash of a rectangular world-tile region's terrain (FNV-1a over terrain bytes).
 * Used by the cross-engine determinism check (P0-CLI-06): the same seed + region must hash
 * identically across Chrome/Firefox/Safari. Changing the generation algorithm changes this hash,
 * which is the signal to bump `SEED_VERSION`.
 */
export function regionHash(seed: number, x0: number, y0: number, width: number, height: number): string {
  let acc = 0x811c9dc5 >>> 0;
  for (let y = y0; y < y0 + height; y++) {
    for (let x = x0; x < x0 + width; x++) {
      acc ^= terrainAt(seed, x, y);
      acc = Math.imul(acc, 0x01000193) >>> 0;
    }
  }
  return acc.toString(16).padStart(8, '0');
}
