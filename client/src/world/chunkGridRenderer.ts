import { Container, Graphics } from 'pixi.js';
import {
  CHUNK_SIZE,
  TILE_SIZE,
  generateChunk,
  visibleChunkIds,
  type Camera,
} from '@wanderlight/shared';
import { terrainColor } from './palette';
import { diffVisibleChunks } from './chunkDiff';

/**
 * Chunk grid + culling (P0-CLI-04).
 *
 * Owns one PixiJS {@link Container} per mounted chunk, keyed by chunk id. On each {@link update} it
 * diffs the mounted set against the camera's visible set ({@link visibleChunkIds}) and builds only
 * newcomers / destroys only chunks that scrolled out — so off-screen chunks are neither drawn nor
 * retained, which is the "no leak over a 5-min pan" acceptance. The pure decision (what to load /
 * unload) lives in {@link diffVisibleChunks}; this class only does the PixiJS side effects.
 *
 * Panning is the caller's job (move this renderer's `container` parent) — the renderer only manages
 * the chunk lifecycle so its responsibilities stay narrow.
 */
export class ChunkGridRenderer {
  /** Parent of all mounted chunk containers. Add this to the scene (or a world container). */
  readonly container: Container;

  private readonly chunks = new Map<string, Container>();

  constructor(private readonly seed: number) {
    this.container = new Container();
  }

  /** Number of chunks currently mounted — for leak checks / diagnostics. */
  get mountedCount(): number {
    return this.chunks.size;
  }

  /** Reconcile mounted chunks with what the camera can see: build newcomers, destroy departures. */
  update(camera: Camera): void {
    const visible = visibleChunkIds(camera);
    const { toLoad, toUnload } = diffVisibleChunks(this.chunks.keys(), visible);

    for (const id of toUnload) {
      const chunk = this.chunks.get(id);
      if (chunk) {
        this.container.removeChild(chunk);
        chunk.destroy({ children: true });
        this.chunks.delete(id);
      }
    }

    for (const id of toLoad) {
      const { cx, cy } = parseChunkId(id);
      const chunk = this.buildChunk(cx, cy);
      this.chunks.set(id, chunk);
      this.container.addChild(chunk);
    }
  }

  /** Destroy every mounted chunk and this renderer's container. */
  destroy(): void {
    for (const chunk of this.chunks.values()) chunk.destroy({ children: true });
    this.chunks.clear();
    this.container.destroy({ children: true });
  }

  /** Build a chunk container: one grey-box terrain grid, positioned at its world-pixel origin. */
  private buildChunk(cx: number, cy: number): Container {
    const data = generateChunk(this.seed, cx, cy);
    const g = new Graphics();

    // Merge horizontal runs of equal terrain into single rects — far fewer draw ops than per-tile,
    // which matters since terrain forms large contiguous regions.
    for (let ty = 0; ty < CHUNK_SIZE; ty++) {
      const row = ty * CHUNK_SIZE;
      let runStart = 0;
      let runTerrain = data[row] ?? 0;
      for (let tx = 1; tx <= CHUNK_SIZE; tx++) {
        const terrain = tx < CHUNK_SIZE ? (data[row + tx] ?? 0) : -1;
        if (terrain !== runTerrain) {
          g.rect(runStart * TILE_SIZE, ty * TILE_SIZE, (tx - runStart) * TILE_SIZE, TILE_SIZE).fill(
            terrainColor(runTerrain),
          );
          runStart = tx;
          runTerrain = terrain;
        }
      }
    }

    const chunk = new Container();
    chunk.addChild(g);
    chunk.x = cx * CHUNK_SIZE * TILE_SIZE;
    chunk.y = cy * CHUNK_SIZE * TILE_SIZE;
    return chunk;
  }
}

/** Parse a `"cx,cy"` chunk id back to numeric coordinates. */
function parseChunkId(id: string): { cx: number; cy: number } {
  const comma = id.indexOf(',');
  return { cx: Number(id.slice(0, comma)), cy: Number(id.slice(comma + 1)) };
}
