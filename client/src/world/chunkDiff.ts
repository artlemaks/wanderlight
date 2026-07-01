/**
 * Pure set-diff for chunk culling (P0-CLI-04).
 *
 * Given the chunk ids currently mounted in the scene and the chunk ids that should now be visible
 * (from `visibleChunkIds`), compute which to load and which to unload. Keeping this pure and
 * separate from PixiJS is what makes the "no leak over a 5-min pan" acceptance testable: every
 * chunk that scrolls out of view appears in `toUnload` exactly once, so nothing is orphaned.
 */

export interface ChunkDiff {
  /** Visible now but not yet mounted — build these. */
  readonly toLoad: string[];
  /** Mounted but no longer visible — destroy these. */
  readonly toUnload: string[];
}

/**
 * Diff the mounted chunk set against the desired-visible set.
 * `loaded` is what is currently in the scene; `visible` is the target (order-independent).
 */
export function diffVisibleChunks(loaded: Iterable<string>, visible: Iterable<string>): ChunkDiff {
  const visibleSet = new Set(visible);
  const loadedSet = new Set(loaded);

  const toLoad: string[] = [];
  for (const id of visibleSet) {
    if (!loadedSet.has(id)) toLoad.push(id);
  }

  const toUnload: string[] = [];
  for (const id of loadedSet) {
    if (!visibleSet.has(id)) toUnload.push(id);
  }

  return { toLoad, toUnload };
}
