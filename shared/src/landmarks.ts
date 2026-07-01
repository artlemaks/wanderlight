import { CHUNK_SIZE } from './constants';
import { hash2i, hash32, rand01 } from './rng';
import { terrainAt, TerrainType } from './terrain';

/**
 * Deterministic landmark placement (P0-CNT-01).
 *
 * Landmarks (shrine / high point / water feature) are placed by hashing the chunk coordinate, so
 * every client sees identical landmarks at identical positions for a given seed. Pure + testable;
 * no rendering here. Their type follows the terrain they sit on so they read as diegetic.
 */

export enum LandmarkType {
  Shrine = 'shrine',
  HighPoint = 'highpoint',
  Water = 'water',
}

export interface Landmark {
  readonly type: LandmarkType;
  readonly worldX: number;
  readonly worldY: number;
}

/** Fraction of chunks that carry a landmark (deterministic per chunk). */
const LANDMARK_CHANCE = 0.35;
const LANDMARK_SALT = 0x1a2b3c4d;
const POSITION_SALT = 0x5eed;

/** Deterministic landmarks within a chunk. Same `(seed, cx, cy)` → identical result on every client. */
export function landmarksInChunk(seed: number, cx: number, cy: number): Landmark[] {
  const roll = rand01(hash2i((seed >>> 0) ^ LANDMARK_SALT, cx, cy));
  if (roll >= LANDMARK_CHANCE) return [];

  const hx = hash2i((seed >>> 0) ^ POSITION_SALT, cx, cy);
  const hy = hash32(hx ^ 0x9e3779b9);
  const localX = hx % CHUNK_SIZE;
  const localY = hy % CHUNK_SIZE;
  const worldX = cx * CHUNK_SIZE + localX;
  const worldY = cy * CHUNK_SIZE + localY;

  const terrain = terrainAt(seed, worldX, worldY);
  let type: LandmarkType;
  if (terrain === TerrainType.Water || terrain === TerrainType.Sand) {
    type = LandmarkType.Water;
  } else if (terrain === TerrainType.Rock) {
    type = LandmarkType.HighPoint;
  } else {
    type = LandmarkType.Shrine;
  }

  return [{ type, worldX, worldY }];
}
