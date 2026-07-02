import { describe, expect, it } from 'vitest';
import { diffVisibleChunks } from './chunkDiff';

describe('diffVisibleChunks', () => {
  it('loads every visible chunk when nothing is mounted yet', () => {
    const { toLoad, toUnload } = diffVisibleChunks([], ['0,0', '1,0']);
    expect(new Set(toLoad)).toEqual(new Set(['0,0', '1,0']));
    expect(toUnload).toEqual([]);
  });

  it('unloads every mounted chunk when nothing is visible anymore', () => {
    const { toLoad, toUnload } = diffVisibleChunks(['0,0', '1,0'], []);
    expect(toLoad).toEqual([]);
    expect(new Set(toUnload)).toEqual(new Set(['0,0', '1,0']));
  });

  it('loads newcomers and unloads chunks that scrolled out after a pan', () => {
    // Camera moved one chunk right: 0,0 leaves; 2,0 enters; 1,0 stays.
    const { toLoad, toUnload } = diffVisibleChunks(['0,0', '1,0'], ['1,0', '2,0']);
    expect(toLoad).toEqual(['2,0']);
    expect(toUnload).toEqual(['0,0']);
  });

  it('is a no-op when the visible set is unchanged', () => {
    const { toLoad, toUnload } = diffVisibleChunks(['0,0', '1,0'], ['1,0', '0,0']);
    expect(toLoad).toEqual([]);
    expect(toUnload).toEqual([]);
  });

  it('never lists a chunk as both load and unload (no orphaned chunks over a long pan)', () => {
    const loaded = ['-1,0', '0,0', '1,0'];
    const visible = ['1,0', '2,0', '3,0'];
    const { toLoad, toUnload } = diffVisibleChunks(loaded, visible);
    const overlap = toLoad.filter((id) => toUnload.includes(id));
    expect(overlap).toEqual([]);
    // Everything mounted ends up either kept (visible) or unloaded — nothing leaks.
    for (const id of loaded) {
      const kept = visible.includes(id);
      expect(kept || toUnload.includes(id)).toBe(true);
    }
  });

  it('accepts Set inputs, not just arrays', () => {
    const { toLoad, toUnload } = diffVisibleChunks(new Set(['0,0']), new Set(['0,0', '1,0']));
    expect(toLoad).toEqual(['1,0']);
    expect(toUnload).toEqual([]);
  });
});
