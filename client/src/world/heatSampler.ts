/**
 * Movement heat sampling (P2-CLI-02) — pure core.
 *
 * Samples the traveler's position at a low, fixed cadence and low spatial resolution, accumulating a
 * small batch of visited footpath tiles to send to the server. Two cheap tricks keep it free of
 * perceptible client cost: it only snapshots a tile every `SAMPLE_INTERVAL_MS` (not every frame),
 * and it drops consecutive samples in the same tile (standing still costs nothing). The render loop
 * feeds `sampleHeat` each frame and flushes `drainBatch` on an interval / when `batchReady`.
 */

import { footpathTile, footpathTileKey } from '@wanderlight/shared';

/** One sampled footpath tile the traveler passed through. */
export interface HeatTile {
  readonly tx: number;
  readonly ty: number;
}

export interface HeatSamplerState {
  /** Deduplicated tiles awaiting a batched send. */
  readonly pending: readonly HeatTile[];
  /** Milliseconds accumulated since the last position snapshot. */
  readonly accMs: number;
  /** Key of the most recently recorded tile, to skip consecutive duplicates. */
  readonly lastKey: string | null;
}

/** How often (ms) a position is snapshotted. Coarse — sampling is a background signal, not input. */
export const SAMPLE_INTERVAL_MS = 500;

/** Max tiles buffered before the caller should flush a batch. Bounds payload + memory. */
export const MAX_BATCH = 64;

export function createHeatSampler(): HeatSamplerState {
  return { pending: [], accMs: 0, lastKey: null };
}

/**
 * Advance the sampler by `dtMs` with the traveler at world-tile (`x`,`y`). Records the current
 * footpath tile at most once per `SAMPLE_INTERVAL_MS`, and only when it differs from the last one
 * recorded. Returns a new state (never mutates the input).
 */
export function sampleHeat(
  state: HeatSamplerState,
  x: number,
  y: number,
  dtMs: number,
): HeatSamplerState {
  const accMs = state.accMs + dtMs;
  if (accMs < SAMPLE_INTERVAL_MS) return { ...state, accMs };

  const { tx, ty } = footpathTile(x, y);
  const key = footpathTileKey(tx, ty);
  // Snapshot taken: reset the accumulator regardless of whether the tile is new.
  if (key === state.lastKey || state.pending.length >= MAX_BATCH) {
    return { ...state, accMs: 0, lastKey: key };
  }
  return { pending: [...state.pending, { tx, ty }], accMs: 0, lastKey: key };
}

/** True when the buffer has reached the batch cap and should be flushed now. */
export function batchReady(state: HeatSamplerState): boolean {
  return state.pending.length >= MAX_BATCH;
}

/**
 * Drain the pending tiles for sending, returning the batch and a cleared state (timing preserved).
 * The batch is empty when there is nothing to send.
 */
export function drainBatch(state: HeatSamplerState): {
  batch: readonly HeatTile[];
  state: HeatSamplerState;
} {
  return { batch: state.pending, state: { ...state, pending: [] } };
}
