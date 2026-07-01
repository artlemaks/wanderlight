import { CHUNK_SIZE } from './constants';

/**
 * The Wanderlight coordinate system (P0-CLI-03).
 *
 * There are three spaces:
 *  - **world tile**: integer (or fractional) tile coordinates in one persistent shared world.
 *    The origin `(0, 0)` is the world's anchor; coordinates extend to negative infinity.
 *  - **chunk**: the world is partitioned into a grid of {@link CHUNK_SIZE}×{@link CHUNK_SIZE}
 *    tile chunks. Chunk `(cx, cy)` covers world tiles `[cx*CHUNK_SIZE, (cx+1)*CHUNK_SIZE)` on x
 *    (and likewise on y). Chunks are the unit of storage, fetching, and culling.
 *  - **pixel**: `TILE_SIZE` px per tile — a pure render concern, kept out of this module.
 *
 * Every function here is pure and deterministic: the same inputs always yield the same output,
 * on every client and every engine. That determinism is a hard multiplayer prerequisite.
 */

export interface ChunkCoord {
  readonly cx: number;
  readonly cy: number;
}

/**
 * A rectangular view onto the world, in world-tile units. `(x, y)` is the top-left corner;
 * `width`/`height` are the extent in tiles. Used to decide which chunks to load and render.
 */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Which chunk contains a given world-tile coordinate. Floors toward negative infinity. */
export function worldToChunk(worldX: number, worldY: number): ChunkCoord {
  return {
    cx: Math.floor(worldX / CHUNK_SIZE),
    cy: Math.floor(worldY / CHUNK_SIZE),
  };
}

/** The top-left (origin) world-tile coordinate of a chunk. Inverse of {@link worldToChunk}. */
export function chunkToWorld(cx: number, cy: number): { worldX: number; worldY: number } {
  return {
    worldX: cx * CHUNK_SIZE,
    worldY: cy * CHUNK_SIZE,
  };
}

/** Stable string key for a chunk, e.g. `"-2,3"`. Safe as a Map key or cache id. */
export function chunkId(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

/**
 * The chunk ids overlapping the camera, plus a `margin`-chunk ring around them (default 1)
 * so neighbours can be pre-loaded before they scroll into view. Ordered row-major
 * (y outer, x inner) for a deterministic, stable result.
 */
export function visibleChunkIds(camera: Camera, margin = 1): string[] {
  const min = worldToChunk(camera.x, camera.y);
  const max = worldToChunk(camera.x + camera.width, camera.y + camera.height);

  const ids: string[] = [];
  for (let cy = min.cy - margin; cy <= max.cy + margin; cy++) {
    for (let cx = min.cx - margin; cx <= max.cx + margin; cx++) {
      ids.push(chunkId(cx, cy));
    }
  }
  return ids;
}
