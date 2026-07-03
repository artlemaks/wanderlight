/**
 * Trace-placement radial state (P1-CLI-03) — pure core.
 *
 * The radial lets a player open a menu, pick a trace type, then move to the composer/confirm step.
 * These pure transitions model that flow so the PixiJS radial widget stays a thin shell that just
 * renders `RadialState` and dispatches these functions.
 */

import { PLACEABLE_TRACE_TYPES, type PlaceableTraceType } from '@wanderlight/shared';

/**
 * The trace types a player can place from the radial, in display order. Shrines are excluded — they
 * are system-authored and grown through offerings (P2-SRV-02), not placed here.
 */
export const PLACEABLE_TYPES: readonly PlaceableTraceType[] = PLACEABLE_TRACE_TYPES;

export interface RadialState {
  readonly open: boolean;
  /** The world-tile position the trace will be placed at, captured when the radial opens. */
  readonly at: { readonly x: number; readonly y: number } | null;
  readonly selected: PlaceableTraceType | null;
}

export const CLOSED_RADIAL: RadialState = { open: false, at: null, selected: null };

/** Open the radial at a world position, clearing any prior selection. */
export function openRadial(x: number, y: number): RadialState {
  return { open: true, at: { x, y }, selected: null };
}

/** Select a trace type (no-op if the radial is closed). */
export function selectTraceType(state: RadialState, type: PlaceableTraceType): RadialState {
  if (!state.open) return state;
  return { ...state, selected: type };
}

/** Close the radial. */
export function closeRadial(): RadialState {
  return CLOSED_RADIAL;
}

/** Ready to advance to the composer/confirm step: open, positioned, and a type chosen. */
export function isReadyToCompose(state: RadialState): boolean {
  return state.open && state.at !== null && state.selected !== null;
}
