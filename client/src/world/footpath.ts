/**
 * Footpath rendering core (P2-CLI-03) — pure.
 *
 * Turns a chunk's aggregated footfall (from `GET /world/chunks`) into a list of worn tiles with a
 * wear level, which the PixiJS shell blends over the terrain as darker, trodden ground. Popular
 * routes wear in automatically with no manual placement; faint tiles below the threshold are dropped
 * so a single passer-by never scars the map. The `wear` → opacity/width mapping stays in the shell.
 */

import { footpathWear } from '@wanderlight/shared';

export interface WornTile {
  readonly tx: number;
  readonly ty: number;
  /** Wear level 0..1 (see `footpathWear`); higher = more trodden. */
  readonly wear: number;
}

/** Parse a `"tx,ty"` footfall key back into coordinates. */
function parseTileKey(key: string): { tx: number; ty: number } | null {
  const [txRaw, tyRaw] = key.split(',');
  const tx = Number(txRaw);
  const ty = Number(tyRaw);
  if (!Number.isInteger(tx) || !Number.isInteger(ty)) return null;
  return { tx, ty };
}

/**
 * Worn footpath tiles for a chunk, given its footfall map (tile key → visit count). Only tiles that
 * clear the minimum-visits threshold are returned, sorted by descending wear so the shell can draw
 * the most-trodden first / cull cheaply.
 */
export function wornFootpaths(footfall: Readonly<Record<string, number>>): WornTile[] {
  const out: WornTile[] = [];
  for (const [key, visits] of Object.entries(footfall)) {
    const wear = footpathWear(visits);
    if (wear <= 0) continue;
    const coord = parseTileKey(key);
    if (coord) out.push({ tx: coord.tx, ty: coord.ty, wear });
  }
  return out.sort((a, b) => b.wear - a.wear);
}
