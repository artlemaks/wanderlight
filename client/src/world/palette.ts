import { TerrainType } from '@wanderlight/shared';

/**
 * Placeholder art palette (P0-CNT-02): grey-box-quality colors that make the five terrain
 * bands and the traveler legibly distinct. Deliberately flat and low-fidelity — the painterly
 * art direction (P0-CNT-03) replaces this later. Kept as pure data so it is trivially swapped.
 */

/** Fill color (0xRRGGBB) for each terrain band. Ordered to read as water → sand → grass → forest → rock. */
export const TERRAIN_COLORS: Readonly<Record<TerrainType, number>> = {
  [TerrainType.Water]: 0x2a4a6b,
  [TerrainType.Sand]: 0xc2b280,
  [TerrainType.Grass]: 0x4a7a3a,
  [TerrainType.Forest]: 0x2f5230,
  [TerrainType.Rock]: 0x6b6b6b,
};

/** Fallback fill for an out-of-range terrain byte (should not happen for valid chunks). */
export const UNKNOWN_TERRAIN_COLOR = 0xff00ff;

/** Traveler sprite color — a warm light dot that stands out against every terrain band. */
export const TRAVELER_COLOR = 0xffd27f;

/** Radius of the placeholder traveler dot, in world tiles. */
export const TRAVELER_RADIUS_TILES = 0.6;

/** Color for a terrain byte, falling back to {@link UNKNOWN_TERRAIN_COLOR} if unrecognized. */
export function terrainColor(terrain: number): number {
  return TERRAIN_COLORS[terrain as TerrainType] ?? UNKNOWN_TERRAIN_COLOR;
}
