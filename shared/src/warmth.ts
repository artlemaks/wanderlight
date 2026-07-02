/**
 * Warmth + footpath model (P2-SRV-04 / P2-CLI-03/04) — pure, shared core.
 *
 * **Warmth** is a per-chunk measure of how loved/travelled a place is. The server keeps it as a
 * running sum (bumped when traces are placed, lanterns lit, offerings made, and footfall aggregated)
 * so a chunk read is O(1); this module owns the contribution weights and the tiering the client uses
 * to render warmth as tint/lushness. **Footfall** is the aggregated count of traveler visits per
 * tile, from which worn footpaths are rendered. All framework-free so client and server agree.
 */

/** Weight each source contributes to a chunk's warmth. Traces/lanterns/shrines bump on write. */
export const WARMTH_WEIGHTS = {
  /** Warmth per aggregated footfall visit — small, so paths warm slowly with heavy use. */
  footfallPerVisit: 0.1,
} as const;

/** Warmth a batch of `visits` aggregated footfalls adds to a chunk (P2-SRV-03 → P2-SRV-04). */
export function footfallWarmth(visits: number): number {
  return Math.max(0, visits) * WARMTH_WEIGHTS.footfallPerVisit;
}

/**
 * Ascending warmth thresholds delimiting the visual tiers. A chunk's tier is the count of thresholds
 * it meets or exceeds: `< 1` → tier 0 (cold), `>= 40` → tier 4 (radiant). Tuned coarse for P2; the
 * P5 polish pass may resample these against real play data.
 */
export const WARMTH_TIER_THRESHOLDS = [1, 5, 15, 40] as const;

/** Number of distinct warmth tiers (thresholds + 1). */
export const WARMTH_TIER_COUNT = WARMTH_TIER_THRESHOLDS.length + 1;

/** Map a raw warmth value to a discrete visual tier `0..WARMTH_TIER_COUNT-1` (P2-CLI-04). */
export function warmthTier(warmth: number): number {
  let tier = 0;
  for (const threshold of WARMTH_TIER_THRESHOLDS) {
    if (warmth >= threshold) tier += 1;
    else break;
  }
  return tier;
}

// --- Footpaths (P2-CLI-03) ---------------------------------------------------------------------

/**
 * Tile resolution at which movement heat is sampled + aggregated. Coarser than a render tile so a
 * footpath reads as a worn band, not a pixel trail, and so batches stay small (P2-CLI-02/SRV-03).
 */
export const FOOTPATH_TILE_RESOLUTION = 4;

/** Snap a world-tile coordinate to the footpath sampling grid. */
export function footpathTile(x: number, y: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(x / FOOTPATH_TILE_RESOLUTION),
    ty: Math.floor(y / FOOTPATH_TILE_RESOLUTION),
  };
}

/** Stable string key for a footpath tile — used as the jsonb map key in `chunk_state.footfall`. */
export function footpathTileKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

/** Max footpath tiles accepted in a single `POST /heat` batch (bounds request size). */
export const MAX_HEAT_BATCH = 256;

/** `POST /heat` body — a batch of visited footpath tiles from the client sampler (P2-CLI-02). */
export interface HeatBatchRequest {
  readonly tiles: ReadonlyArray<{ readonly tx: number; readonly ty: number }>;
}

/** `POST /heat` response: how many tiles were accepted for aggregation. */
export interface HeatBatchResponse {
  readonly accepted: number;
}

/** Minimum aggregated visits before a tile renders as a (faint) footpath at all. */
export const FOOTPATH_MIN_VISITS = 3;

/** Visit count at which a footpath reaches full wear (opacity/width saturates). */
export const FOOTPATH_FULL_WEAR_VISITS = 30;

/**
 * Wear level `0..1` for a tile with `visits` aggregated footfalls (P2-CLI-03). `0` below the minimum
 * threshold (no path), ramping linearly to `1` at {@link FOOTPATH_FULL_WEAR_VISITS}. The render shell
 * maps this to opacity/width so popular routes visibly wear with no manual placement.
 */
export function footpathWear(visits: number): number {
  if (visits < FOOTPATH_MIN_VISITS) return 0;
  const span = FOOTPATH_FULL_WEAR_VISITS - FOOTPATH_MIN_VISITS;
  return Math.min(1, (visits - FOOTPATH_MIN_VISITS) / span);
}
