/**
 * Chunk fetch/evict decisions on movement (P1-CLI-01) — pure core, no PixiJS.
 *
 * As the camera moves, some chunks enter the visible set and some leave it. This module decides
 * *what* to fetch (newly visible, not already cached or in-flight) and *what* to evict (cached but no
 * longer visible), so the render/network shell just executes those lists. Keeping it pure makes the
 * "no duplicate fetches, no leak over a long pan" behavior (the P1-CLI-01 AC) unit-testable in Node.
 */

export interface ChunkFetchPlan {
  /** Chunk ids to request now — visible, not cached, not already in flight. */
  readonly toFetch: string[];
  /** Chunk ids to drop from cache — cached but no longer visible. */
  readonly toEvict: string[];
}

/**
 * Diff the visible chunk ids against what's cached and in-flight.
 * `visible` typically comes from `visibleChunkIds(camera)` in `@wanderlight/shared`.
 */
export function computeChunkFetch(
  visible: readonly string[],
  cached: ReadonlySet<string>,
  inFlight: ReadonlySet<string> = new Set(),
): ChunkFetchPlan {
  const visibleSet = new Set(visible);
  const toFetch = visible.filter((id) => !cached.has(id) && !inFlight.has(id));
  const toEvict = [...cached].filter((id) => !visibleSet.has(id));
  return { toFetch, toEvict };
}
