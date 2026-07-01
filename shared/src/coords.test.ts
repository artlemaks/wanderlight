import { describe, it, expect } from 'vitest';
import { CHUNK_SIZE } from './constants';
import { worldToChunk, chunkToWorld, chunkId, visibleChunkIds } from './coords';

describe('worldToChunk', () => {
  it('maps the origin tile to chunk (0,0)', () => {
    expect(worldToChunk(0, 0)).toEqual({ cx: 0, cy: 0 });
  });

  it('maps a mid-chunk tile to its containing chunk', () => {
    expect(worldToChunk(10, 40)).toEqual({ cx: 0, cy: 0 });
    expect(worldToChunk(CHUNK_SIZE + 5, 2 * CHUNK_SIZE + 1)).toEqual({ cx: 1, cy: 2 });
  });

  it('puts a tile on the chunk boundary into the higher chunk', () => {
    expect(worldToChunk(CHUNK_SIZE, CHUNK_SIZE)).toEqual({ cx: 1, cy: 1 });
  });

  it('floors negative coordinates toward negative infinity', () => {
    expect(worldToChunk(-1, -1)).toEqual({ cx: -1, cy: -1 });
    expect(worldToChunk(-CHUNK_SIZE, -CHUNK_SIZE)).toEqual({ cx: -1, cy: -1 });
    expect(worldToChunk(-CHUNK_SIZE - 1, 0)).toEqual({ cx: -2, cy: 0 });
  });
});

describe('chunkToWorld', () => {
  it('returns the top-left world tile of a chunk', () => {
    expect(chunkToWorld(0, 0)).toEqual({ worldX: 0, worldY: 0 });
    expect(chunkToWorld(1, 2)).toEqual({ worldX: CHUNK_SIZE, worldY: 2 * CHUNK_SIZE });
    expect(chunkToWorld(-1, -1)).toEqual({ worldX: -CHUNK_SIZE, worldY: -CHUNK_SIZE });
  });

  it('round-trips: a chunk origin maps back to the same chunk', () => {
    const chunks: ReadonlyArray<readonly [number, number]> = [
      [0, 0],
      [3, -2],
      [-5, 7],
    ];
    for (const [cx, cy] of chunks) {
      const { worldX, worldY } = chunkToWorld(cx, cy);
      expect(worldToChunk(worldX, worldY)).toEqual({ cx, cy });
    }
  });
});

describe('chunkId', () => {
  it('produces a stable comma-joined key, including negatives', () => {
    expect(chunkId(0, 0)).toBe('0,0');
    expect(chunkId(-2, 3)).toBe('-2,3');
  });
});

describe('visibleChunkIds', () => {
  it('returns just the containing chunk when the camera sits inside one chunk (no margin)', () => {
    expect(visibleChunkIds({ x: 8, y: 8, width: 10, height: 10 }, 0)).toEqual(['0,0']);
  });

  it('includes every chunk the camera straddles across a boundary', () => {
    const ids = visibleChunkIds(
      { x: CHUNK_SIZE - 2, y: CHUNK_SIZE - 2, width: 4, height: 4 },
      0,
    );
    expect([...ids].sort()).toEqual(['0,0', '0,1', '1,0', '1,1']);
  });

  it('adds a margin ring of chunks around the visible area', () => {
    const ids = visibleChunkIds({ x: 8, y: 8, width: 4, height: 4 }, 1);
    expect(ids).toHaveLength(9);
    expect(ids).toContain('-1,-1');
    expect(ids).toContain('0,0');
    expect(ids).toContain('1,1');
  });

  it('is deterministic and row-major ordered', () => {
    const camera = { x: 0, y: 0, width: CHUNK_SIZE, height: CHUNK_SIZE };
    const first = visibleChunkIds(camera, 0);
    const second = visibleChunkIds(camera, 0);
    expect(first).toEqual(second);
    expect(first).toEqual(['0,0', '1,0', '0,1', '1,1']);
  });
});
