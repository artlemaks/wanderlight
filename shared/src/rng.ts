/**
 * Deterministic, engine-independent integer hashing + PRNG (P0-CLI-05 / P0-CLI-06).
 *
 * Every operation stays in uint32 via `>>> 0` and `Math.imul`, so output is identical on
 * every JS engine — no `Math.random`, no reliance on float precision. This is the basis for
 * cross-client world determinism (see decisions/ADR-002).
 */

const UINT32 = 0x100000000;

/** Mix a single uint32 into a well-distributed uint32 hash (Murmur3 finalizer variant). */
export function hash32(x: number): number {
  let h = x >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Hash a seed + 2D integer coordinate to a uint32. Order-sensitive and well-mixed. */
export function hash2i(seed: number, x: number, y: number): number {
  let h = hash32((seed >>> 0) ^ (x | 0));
  h = hash32(h ^ (y | 0));
  return h >>> 0;
}

/** Map a uint32 hash to a float in [0, 1). Deterministic. */
export function rand01(h: number): number {
  return (h >>> 0) / UINT32;
}
