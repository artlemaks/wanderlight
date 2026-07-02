/**
 * Motes of light (P2-CLI-05) — deterministic collectible spawns.
 *
 * "Motes of light" are gentle collectibles scattered through the world; gathering them is a soft
 * earn source (scope §9 — motes are earned, never bought). Like landmarks, their positions are a
 * pure function of the world seed + chunk, so every client agrees on where they are without the
 * server streaming spawn state, and the server can validate a collect claim against the same
 * function. Collection idempotency (one collect per player per mote) lives in the datastore.
 */

import { CHUNK_SIZE } from './constants';
import { hash2i, rand01 } from './rng';

/** A collectible mote at a fixed world-tile position, with a seed-stable id. */
export interface MoteOfLight {
  readonly id: string;
  readonly worldX: number;
  readonly worldY: number;
}

/** Expected motes per chunk (Poisson-ish via independent per-candidate probability). */
export const MOTES_PER_CHUNK = 3;

/** Deterministic motes of light in chunk (cx,cy) for `seed`. Pure — client + server agree. */
export function motesInChunk(seed: number, cx: number, cy: number): MoteOfLight[] {
  const out: MoteOfLight[] = [];
  const density = MOTES_PER_CHUNK / (CHUNK_SIZE * CHUNK_SIZE);
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const worldX = cx * CHUNK_SIZE + lx;
      const worldY = cy * CHUNK_SIZE + ly;
      // Distinct hash channel (offset seed) so motes don't correlate with terrain/landmarks.
      if (rand01(hash2i(seed ^ 0x5f0f, worldX, worldY)) < density) {
        out.push({ id: moteId(cx, cy, lx, ly), worldX, worldY });
      }
    }
  }
  return out;
}

/** Seed-stable mote id: chunk + local tile, so a collect claim is verifiable server-side. */
export function moteId(cx: number, cy: number, lx: number, ly: number): string {
  return `m:${cx},${cy}:${lx},${ly}`;
}

/** Parse a mote id back to its chunk + local coords, or `null` if malformed. */
export function parseMoteId(id: string): { cx: number; cy: number; lx: number; ly: number } | null {
  const m = /^m:(-?\d+),(-?\d+):(\d+),(\d+)$/.exec(id);
  if (!m) return null;
  const [, cx, cy, lx, ly] = m;
  return { cx: Number(cx), cy: Number(cy), lx: Number(lx), ly: Number(ly) };
}

/** Does mote `id` actually exist for `seed` (a spawn at that position)? Guards collect claims. */
export function moteExists(seed: number, id: string): boolean {
  const p = parseMoteId(id);
  if (!p) return false;
  if (p.lx < 0 || p.lx >= CHUNK_SIZE || p.ly < 0 || p.ly >= CHUNK_SIZE) return false;
  const worldX = p.cx * CHUNK_SIZE + p.lx;
  const worldY = p.cy * CHUNK_SIZE + p.ly;
  const density = MOTES_PER_CHUNK / (CHUNK_SIZE * CHUNK_SIZE);
  return rand01(hash2i(seed ^ 0x5f0f, worldX, worldY)) < density;
}
